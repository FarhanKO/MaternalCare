-- MaternalCare+ — PostgreSQL schema
--
-- Ported from the SQLite schema this project grew up on. Three things change
-- deliberately rather than being copied across:
--
--   * real types. SQLite kept every date and flag as TEXT/INTEGER; Postgres
--     gets DATE, TIMESTAMPTZ and BOOLEAN. The API contract is unchanged —
--     config/database.js registers type parsers that hand dates back as the
--     same 'YYYY-MM-DD' and ISO strings the clients already parse.
--
--   * foreign keys, which SQLite declared but never enforced without
--     PRAGMA foreign_keys=ON. Orphan rows were possible; now they are not.
--
--   * CHECK constraints on the small set of enum-ish columns, so a typo in a
--     status or a kind fails at the database rather than silently creating a
--     row no query will ever match.
--
-- Run with:  npm run db:reset

BEGIN;

DROP TABLE IF EXISTS sos_notifications, sos_alerts, documents, messages,
  reminders, symptoms, daily_logs, emergency_contacts, appointments, vitals,
  growth_records, milestones, children, pregnancies, vaccinations,
  hospitals, post_comments, posts, articles, doctors, users CASCADE;

/* ------------------------------------------------------------- people */

CREATE TABLE users (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             TEXT    NOT NULL,
  role             TEXT    NOT NULL DEFAULT 'mother'
                             CHECK (role IN ('mother', 'clinician', 'admin')),
  email            TEXT,
  age              INTEGER CHECK (age IS NULL OR age BETWEEN 10 AND 70),
  blood_group      TEXT,
  stage            TEXT    NOT NULL DEFAULT 'pregnant'
                             CHECK (stage IN ('planning', 'pregnant', 'new-mother',
                                              'parent', 'general')),
  conditions       TEXT    DEFAULT '',
  last_visit       DATE,
  next_visit       DATE,
  emergency_number TEXT    NOT NULL DEFAULT '999',
  -- profile photo, stored on disk like documents are; the row keeps the name
  avatar_file      TEXT,
  bio              TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE doctors (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT    NOT NULL,
  specialty     TEXT,
  hospital      TEXT,
  rating        REAL,
  distance_km   REAL,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  -- current panel size; capacity is what the clinic will carry
  patients      INTEGER NOT NULL DEFAULT 0,
  qualification TEXT    NOT NULL DEFAULT '',
  years         INTEGER NOT NULL DEFAULT 0,
  capacity      INTEGER NOT NULL DEFAULT 30
);

/* ---------------------------------------------------------- pregnancy */

CREATE TABLE pregnancies (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lmp           DATE    NOT NULL,
  height_cm     REAL,
  pre_weight_kg REAL
);

CREATE TABLE vitals (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  systolic   INTEGER,
  diastolic  INTEGER,
  sugar      INTEGER,
  weight_kg  REAL,
  temp_c     REAL
);
CREATE INDEX vitals_user_date_idx ON vitals (user_id, date DESC);

/* -------------------------------------------------------------- child */

CREATE TABLE children (
  id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT    NOT NULL,
  dob     DATE    NOT NULL,
  gender  TEXT
);

CREATE TABLE growth_records (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  child_id   INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  age_months REAL,
  weight_kg  REAL,
  height_cm  REAL,
  head_cm    REAL
);

CREATE TABLE milestones (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  child_id    INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  typical     TEXT,
  icon        TEXT,
  achieved    BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_on DATE
);

CREATE TABLE vaccinations (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject      TEXT    NOT NULL CHECK (subject IN ('child', 'mother')),
  name         TEXT    NOT NULL,
  dose         TEXT,
  due_date     DATE    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'upcoming'
                         CHECK (status IN ('done', 'due', 'upcoming')),
  completed_on DATE
);

/* ------------------------------------------------------- appointments */

CREATE TABLE appointments (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id    INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date         DATE    NOT NULL,
  time         TEXT,
  reason       TEXT,
  -- 'requested' until the clinician answers; 'accepted' is a confirmed visit
  status       TEXT    NOT NULL DEFAULT 'requested'
                         CHECK (status IN ('requested', 'accepted', 'declined',
                                           'cancelled', 'completed')),
  requested_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  note         TEXT
);
CREATE INDEX appointments_user_idx   ON appointments (user_id, date);
CREATE INDEX appointments_doctor_idx ON appointments (doctor_id, status);

/* ---------------------------------------------------- her own logging */

CREATE TABLE symptoms (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  intensity       TEXT    NOT NULL DEFAULT 'mid'
                            CHECK (intensity IN ('mild', 'mid', 'high', 'severe')),
  days_present    INTEGER NOT NULL DEFAULT 1,
  confirmed_today BOOLEAN NOT NULL DEFAULT TRUE,
  from_voice      BOOLEAN NOT NULL DEFAULT FALSE,
  logged_at       TIMESTAMPTZ NOT NULL
);

CREATE TABLE reminders (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('medicine', 'doctor', 'test',
                                               'exercise', 'vaccination')),
  title       TEXT    NOT NULL,
  note        TEXT,
  due_at      TIMESTAMPTZ NOT NULL,
  repeat      TEXT    NOT NULL DEFAULT 'once'
                        CHECK (repeat IN ('once', 'daily', 'weekly')),
  -- set when a clinician scheduled this for her; she cannot delete those
  assigned_by TEXT
);
CREATE INDEX reminders_user_due_idx ON reminders (user_id, due_at);

CREATE TABLE documents (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT    NOT NULL CHECK (kind IN ('prescription', 'report')),
  title         TEXT    NOT NULL,
  note          TEXT,
  -- the bytes live on disk under data/uploads; only metadata is stored here
  file_name     TEXT    NOT NULL,
  original_name TEXT,
  mime          TEXT    NOT NULL,
  size          INTEGER NOT NULL,
  -- the date the document is about, not when it was uploaded
  taken_on      DATE    NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL,
  uploaded_by   TEXT    NOT NULL DEFAULT 'mother'
);
CREATE INDEX documents_user_idx ON documents (user_id, kind, taken_on DESC);

/* --------------------------------------------------------- messaging */

CREATE TABLE messages (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  sender    TEXT    NOT NULL CHECK (sender IN ('mother', 'doctor')),
  body      TEXT    NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL,
  -- set when the *other* side opens the thread
  read_at   TIMESTAMPTZ
);
CREATE INDEX messages_thread_idx ON messages (user_id, doctor_id, sent_at);

/* --------------------------------------------------------------- SOS */

CREATE TABLE emergency_contacts (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  relation     TEXT,
  phone        TEXT,
  app_linked   BOOLEAN NOT NULL DEFAULT FALSE,
  -- the guardian app's only credential, so it must be unique and random
  access_token TEXT    UNIQUE
);

CREATE TABLE sos_alerts (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at  TIMESTAMPTZ NOT NULL,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  accuracy      REAL,
  location_note TEXT CHECK (location_note IS NULL
                            OR location_note IN ('denied', 'unavailable', 'timeout')),
  status        TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'safe', 'cancelled')),
  closed_at     TIMESTAMPTZ,
  closed_by     TEXT
);
CREATE INDEX sos_alerts_open_idx ON sos_alerts (user_id, status);

CREATE TABLE sos_notifications (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id  INTEGER NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  recipient TEXT    NOT NULL,
  relation  TEXT,
  channel   TEXT    NOT NULL CHECK (channel IN ('in-app', 'guardian-app', 'sms')),
  -- 'alerted' actually landed; 'pending' is recorded but not deliverable yet
  state     TEXT    NOT NULL CHECK (state IN ('alerted', 'pending', 'acknowledged')),
  detail    TEXT
);

/* ------------------------------------------------------ shared content */

CREATE TABLE articles (
  id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title    TEXT NOT NULL,
  category TEXT,
  minutes  INTEGER,
  icon     TEXT,
  excerpt  TEXT
);

-- Rebuilt for the React community, which the old EJS shape could not hold:
-- it had no role, no topic, no image and counted replies in an integer
-- instead of storing them.
CREATE TABLE posts (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- null for the seeded community voices, set for anything a real user writes
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author            TEXT    NOT NULL,
  role              TEXT    NOT NULL DEFAULT 'mother'
                              CHECK (role IN ('mother', 'doctor')),
  -- pregnancy week at the time of writing, so "week 27" stays true later
  week              INTEGER,
  topic             TEXT,
  title             TEXT    NOT NULL,
  body              TEXT,
  -- bytes on disk under data/uploads, same as documents
  image_file        TEXT,
  hearts            INTEGER NOT NULL DEFAULT 0,
  clinician_answered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_recent_idx ON posts (created_at DESC);

CREATE TABLE post_comments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author     TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'mother' CHECK (role IN ('mother', 'doctor')),
  body       TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON post_comments (post_id, created_at);

-- What she reports about herself each day. One row per day, so the dashboard
-- can chart a trend instead of forgetting the moment the tab closes.
CREATE TABLE daily_logs (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE    NOT NULL,
  mood         TEXT    CHECK (mood IS NULL OR mood IN ('Happy', 'Calm', 'Loved',
                              'Neutral', 'Tired', 'Anxiety', 'Sad', 'Stress')),
  kicks        INTEGER CHECK (kicks IS NULL OR kicks >= 0),
  water_litres REAL    CHECK (water_litres IS NULL OR water_litres >= 0),
  UNIQUE (user_id, date)
);

CREATE TABLE hospitals (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT,
  distance_km REAL,
  phone       TEXT,
  ambulance   BOOLEAN NOT NULL DEFAULT TRUE,
  open24      BOOLEAN NOT NULL DEFAULT TRUE
);

COMMIT;
