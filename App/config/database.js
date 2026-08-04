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

