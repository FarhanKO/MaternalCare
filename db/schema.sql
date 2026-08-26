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
  reminders, symptoms, daily_logs, emergency_contacts,
  care_terminations, appointment_changes, appointments, vitals,
  growth_records, milestones, children, pregnancies, vaccinations,
  post_comments, posts, articles, doctors, users CASCADE;

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
  -- Which language she reads the app in. On the account rather than only in
  -- the browser because the care plan and the risk assessment are composed as
  -- sentences on the server — the server has to know which language to write
  -- them in, and a localStorage value in one browser cannot tell it.
  language         TEXT    NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'bn')),
  -- profile photo, stored on disk like documents are; the row keeps the name
  avatar_file      TEXT,
  bio              TEXT    NOT NULL DEFAULT ''
);

-- Clinicians register themselves; every row here either came from the seed
-- or from someone filling in the registration form. There is no hospital
-- column and no distance: consultations are held by video, the platform has
-- no affiliation with any institution, and a doctor signing up cannot say
-- how far they are from a mother who has not signed up yet.
CREATE TABLE doctors (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT    NOT NULL,
  specialty     TEXT,
  -- NULL until they have been rated; the ranking holds an unrated clinician
  -- at the roster average rather than treating "new" as "bad"
  rating        REAL,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  -- current panel size; capacity is what the clinician will carry
  patients      INTEGER NOT NULL DEFAULT 0,
  qualification TEXT    NOT NULL DEFAULT '',
  years         INTEGER NOT NULL DEFAULT 0,
  capacity      INTEGER NOT NULL DEFAULT 30,
  -- what registration collects
  email         TEXT,
  phone         TEXT,
  license_no    TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX doctors_license_key ON doctors (lower(license_no))
  WHERE license_no IS NOT NULL;
CREATE UNIQUE INDEX doctors_email_key   ON doctors (lower(email))
  WHERE email IS NOT NULL;

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
  note         TEXT,
  -- A paid booking skips the queue: the fee confirms the slot outright.
  -- NULL on every request-flow appointment, which is most of them.
  fee_bdt        INTEGER,
  payment_method TEXT CHECK (payment_method IN ('bkash', 'nagad', 'card')),
  payment_ref    TEXT,
  paid_at        TIMESTAMPTZ,
  -- 'visit' is the consultation alone; 'visit-plus-chat' adds a month of
  -- messaging. chat_until is a date, so the entitlement lapses by itself.
  plan           TEXT CHECK (plan IS NULL OR plan IN ('visit', 'visit-plus-chat')),
  chat_until     DATE,
  -- Why it was cancelled, and by whom. `status = 'cancelled'` alone is the
  -- difference between "she could not afford it" and "she went into labour",
  -- and the clinic used to see only the empty slot.
  cancelled_at   TIMESTAMPTZ,
  cancelled_by   TEXT CHECK (cancelled_by IS NULL OR cancelled_by IN ('mother', 'doctor')),
  cancel_reason  TEXT,
  cancel_note    TEXT
);

-- Every time an appointment moved. A row per move rather than columns on the
-- appointment, because "moved twice already" is exactly what a clinic wants.
CREATE TABLE appointment_changes (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  moved_by       TEXT    NOT NULL CHECK (moved_by IN ('mother', 'doctor')),
  from_date      DATE    NOT NULL,
  from_time      TEXT,
  to_date        DATE    NOT NULL,
  to_time        TEXT,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointment_changes_appt_idx
  ON appointment_changes (appointment_id, created_at);

-- Ending the arrangement between a mother and a clinician — not one visit,
-- but the relationship the visits sit inside. Either side may end it and both
-- must give a reason; a clinician must also write one in words.
CREATE TABLE care_terminations (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  doctor_id  INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  ended_by   TEXT NOT NULL CHECK (ended_by IN ('mother', 'doctor')),
  -- the vocabularies differ by side; the model enforces which codes belong
  reason     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- stamped when the pair start again, so the record of the ending survives
  resumed_at TIMESTAMPTZ
);
-- Only one live ending per pair: booking again resumes the old one rather
-- than stacking a second on top of it.
CREATE UNIQUE INDEX care_terminations_active_key
  ON care_terminations (user_id, doctor_id)
  WHERE resumed_at IS NULL;
CREATE INDEX care_terminations_doctor_idx
  ON care_terminations (doctor_id, created_at DESC);
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
  read_at   TIMESTAMPTZ,
  -- a thread carries photographs and the call handshake, not only text
  kind      TEXT    NOT NULL DEFAULT 'text'
                      CHECK (kind IN ('text', 'image', 'call-request', 'call-link')),
  file_name TEXT,
  mime      TEXT
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
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- moderation hides rather than deletes: a removal that destroys the
  -- evidence cannot be reviewed, appealed, or explained to its author
  hidden_at         TIMESTAMPTZ,
  hidden_reason     TEXT
);
CREATE INDEX posts_recent_idx ON posts (created_at DESC);

CREATE TABLE post_comments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author     TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'mother' CHECK (role IN ('mother', 'doctor')),
  body       TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden_at     TIMESTAMPTZ,
  hidden_reason TEXT
);
CREATE INDEX post_comments_post_idx ON post_comments (post_id, created_at);

-- What members have flagged on the board. The forum has always claimed to be
-- moderated; this is the table that makes the claim true.
CREATE TABLE content_reports (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- exactly one target, enforced by the CHECK below
  post_id     INTEGER REFERENCES posts(id)         ON DELETE CASCADE,
  comment_id  INTEGER REFERENCES post_comments(id) ON DELETE CASCADE,
  -- null once a reporter's account goes: the content is either against the
  -- rules or it is not, and who said so does not change that
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL CHECK (reason IN (
                'medical-misinformation', 'harassment', 'privacy',
                'spam', 'explicit', 'other')),
  detail      TEXT,
  state       TEXT NOT NULL DEFAULT 'open'
                CHECK (state IN ('open', 'upheld', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  review_note TEXT,
  CONSTRAINT content_reports_one_target
    CHECK ((post_id IS NULL) <> (comment_id IS NULL))
);
-- One report per person per item: pressing the button twice is not two
-- reports, and the count is what drives priority in the queue.
CREATE UNIQUE INDEX content_reports_post_reporter_key
  ON content_reports (post_id, reporter_id)
  WHERE post_id IS NOT NULL AND reporter_id IS NOT NULL;
CREATE UNIQUE INDEX content_reports_comment_reporter_key
  ON content_reports (comment_id, reporter_id)
  WHERE comment_id IS NOT NULL AND reporter_id IS NOT NULL;
CREATE INDEX content_reports_open_idx
  ON content_reports (state, created_at)
  WHERE state = 'open';

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

COMMIT;
