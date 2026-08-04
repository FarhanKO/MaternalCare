/**
 * MaternityCare+ — Database configuration (Model layer backing store)
 * Uses Node's built-in SQLite driver (node:sqlite) — no native deps.
 * Schema is created on first run and seeded with demo data whose dates
 * are computed relative to "today", so the demo always looks current.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'maternitycare.db'));
db.exec('PRAGMA journal_mode = WAL;');

/* ---------------------------------------------------------------- schema */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mother',
  email TEXT,
  age INTEGER,
  blood_group TEXT
);
CREATE TABLE IF NOT EXISTS pregnancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lmp TEXT NOT NULL,
  height_cm REAL,
  pre_weight_kg REAL
);
CREATE TABLE IF NOT EXISTS vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  systolic INTEGER,
  diastolic INTEGER,
  sugar INTEGER,
  weight_kg REAL,
  temp_c REAL
);
CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT
);
CREATE TABLE IF NOT EXISTS growth_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id),
  date TEXT NOT NULL,
  age_months REAL,
  weight_kg REAL,
  height_cm REAL,
  head_cm REAL
);
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id),
  title TEXT NOT NULL,
  typical TEXT,
  icon TEXT,
  achieved INTEGER DEFAULT 0,
  achieved_on TEXT
);
CREATE TABLE IF NOT EXISTS vaccinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,            -- 'child' | 'mother'
  name TEXT NOT NULL,
  dose TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',  -- done | due | upcoming
  completed_on TEXT
);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT,
  hospital TEXT,
  rating REAL,
  distance_km REAL,
  available INTEGER DEFAULT 1,
  patients INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  date TEXT NOT NULL,
  time TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming'   -- upcoming | completed | cancelled
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  minutes INTEGER,
  icon TEXT,
  excerpt TEXT
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  tag TEXT,
  title TEXT NOT NULL,
  body TEXT,
  replies INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  time_ago TEXT
);
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT, relation TEXT, phone TEXT
);
CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, distance_km REAL, phone TEXT,
  ambulance INTEGER DEFAULT 1, open24 INTEGER DEFAULT 1
);
`);

