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
