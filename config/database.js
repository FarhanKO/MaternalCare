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
-- Sprint 2: symptom journal (persisted for the React dashboard)
CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'mid',
  days_present INTEGER NOT NULL DEFAULT 1,
  confirmed_today INTEGER NOT NULL DEFAULT 1,
  from_voice INTEGER NOT NULL DEFAULT 0,
  logged_at TEXT NOT NULL
);
-- Sprint 2: reminders & appointments created by the mother
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  due_at TEXT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'once'
);
`);

/* --------------------------------------------------- lightweight migration */
// `stage` was added after the first release, so patch existing databases.
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('stage')) {
  db.exec("ALTER TABLE users ADD COLUMN stage TEXT NOT NULL DEFAULT 'pregnant'");
}

// `assigned_by` records the clinician who created a reminder on the mother's behalf.
const reminderCols = db.prepare('PRAGMA table_info(reminders)').all().map((c) => c.name);
if (!reminderCols.includes('assigned_by')) {
  db.exec('ALTER TABLE reminders ADD COLUMN assigned_by TEXT');
}

/* ------------------------------------------------------------- date utils */
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => iso(new Date(Date.now() + n * DAY));

/* ------------------------------------------------------------------ seed */
const isEmpty = db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0;

if (isEmpty) {
  const run = (sql, ...args) => db.prepare(sql).run(...args);

  run(`INSERT INTO users (name, role, email, age, blood_group) VALUES (?,?,?,?,?)`,
    'Ayesha Rahman', 'mother', 'ayesha@example.com', 28, 'B+');

  // Pregnancy: LMP 26 weeks ago  →  currently week 26, EDD in 14 weeks
  run(`INSERT INTO pregnancies (user_id, lmp, height_cm, pre_weight_kg) VALUES (1,?,?,?)`,
    daysFromNow(-26 * 7), 158, 55.0);

  // Weekly vitals, week 14 → 26 (older → newer), gentle upward drift
  const vitalRows = [
    [-84, 108, 70,  88, 58.2, 36.7], [-77, 109, 71,  90, 58.9, 36.8],
    [-70, 111, 72,  91, 59.6, 36.7], [-63, 112, 72,  93, 60.4, 36.8],
    [-56, 113, 74,  95, 61.1, 36.9], [-49, 115, 74,  96, 61.9, 36.8],
    [-42, 116, 75,  97, 62.6, 36.8], [-35, 118, 77,  99, 63.4, 36.9],
    [-28, 119, 78, 100, 64.1, 36.8], [-21, 121, 79, 101, 64.9, 37.0],
    [-14, 122, 80, 102, 65.6, 36.9], [ -7, 123, 81, 103, 66.1, 36.9],
    [  0, 124, 82, 104, 66.5, 37.0],
  ];
  for (const [d, sys, dia, sug, w, t] of vitalRows)
    run(`INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c)
         VALUES (1,?,?,?,?,?,?)`, daysFromNow(d), sys, dia, sug, w, t);

  // Child: Zara, ~14 months old
  run(`INSERT INTO children (user_id, name, dob, gender) VALUES (1,?,?,?)`,
    'Zara', daysFromNow(-437), 'female');

  const growthRows = [ // [ageMonths, weight, height, head]
    [0, 3.2, 49.5, 34.2], [2, 5.0, 57.0, 38.0], [4, 6.2, 62.0, 40.5],
    [6, 7.1, 65.5, 42.0], [9, 8.2, 70.0, 43.8], [12, 9.0, 74.5, 45.0],
    [14, 9.6, 77.0, 45.8],
  ];
  for (const [m, w, h, hc] of growthRows)
    run(`INSERT INTO growth_records (child_id, date, age_months, weight_kg, height_cm, head_cm)
         VALUES (1,?,?,?,?,?)`, daysFromNow(-437 + Math.round(m * 30.44)), m, w, h, hc);

  const milestoneRows = [ // [title, typical, icon, achieved, achievedDaysAgo]
    ['Social smile', '1–2 months', '😊', 1, -390], ['Holds head steady', '3–4 months', '🙆', 1, -330],
    ['Rolls over', '4–6 months', '🔄', 1, -300], ['Sits without support', '6–8 months', '🧘', 1, -240],
    ['First babbling', '6–9 months', '🗣️', 1, -230], ['Crawling', '8–10 months', '🐾', 1, -160],
    ['Pincer grasp', '9–12 months', '🤏', 1, -120], ['Stands holding on', '9–12 months', '🧍', 1, -100],
    ['First words', '10–14 months', '💬', 1, -45], ['Walks alone', '12–16 months', '🚶', 0, null],
    ['Stacks two blocks', '13–16 months', '🧱', 0, null], ['Points to objects', '12–16 months', '👉', 0, null],
  ];
  for (const [t, ty, ic, ach, d] of milestoneRows)
    run(`INSERT INTO milestones (child_id, title, typical, icon, achieved, achieved_on)
         VALUES (1,?,?,?,?,?)`, t, ty, ic, ach, d === null ? null : daysFromNow(d));

  const vaxRows = [ // [subject, name, dose, dueOffsetDays, status, completedOffset]
    ['child', 'BCG', 'Single dose', -437, 'done', -436],
    ['child', 'Pentavalent (DTP-HepB-Hib)', 'Dose 1', -395, 'done', -394],
    ['child', 'OPV + PCV', 'Dose 1', -395, 'done', -394],
    ['child', 'Pentavalent (DTP-HepB-Hib)', 'Dose 2', -365, 'done', -363],
    ['child', 'Pentavalent (DTP-HepB-Hib)', 'Dose 3', -335, 'done', -333],
    ['child', 'Measles–Rubella (MR)', 'Dose 1', -163, 'done', -160],
    ['child', 'Measles–Rubella (MR)', 'Dose 2', 19, 'upcoming', null],
    ['child', 'Vitamin A supplement', 'Round 2', 34, 'upcoming', null],
    ['mother', 'Tetanus Toxoid (TT)', 'Dose 1', -70, 'done', -70],
    ['mother', 'Tetanus Toxoid (TT)', 'Dose 2', -42, 'done', -41],
    ['mother', 'Influenza (seasonal)', 'Single dose', 5, 'due', null],
    ['mother', 'Tdap booster', 'Week 28 dose', 14, 'upcoming', null],
  ];
  for (const [s, n, dose, due, st, comp] of vaxRows)
    run(`INSERT INTO vaccinations (subject, name, dose, due_date, status, completed_on)
         VALUES (?,?,?,?,?,?)`, s, n, dose, daysFromNow(due), st, comp === null ? null : daysFromNow(comp));

  const doctorRows = [
    ['Dr. Nusrat Jahan', 'Gynecologist & Obstetrician', 'City Maternity Hospital', 4.9, 1.2, 1, 124],
    ['Dr. Kamal Hossain', 'Pediatrician', 'Green Life Children Clinic', 4.8, 2.4, 1, 96],
    ['Dr. Sara Ahmed', 'Maternal-Fetal Medicine', 'Square Hospital', 4.7, 3.1, 0, 88],
    ['Dr. Rafiq Islam', 'Nutritionist', 'Wellness Care Center', 4.6, 1.8, 1, 61],
    ['Dr. Farzana Karim', 'Gynecologist', 'Popular Diagnostic Centre', 4.5, 4.2, 1, 105],
    ['Dr. Tanvir Alam', 'Pediatric Neurologist', 'National Children Hospital', 4.8, 5.0, 0, 42],
  ];
  for (const r of doctorRows)
    run(`INSERT INTO doctors (name, specialty, hospital, rating, distance_km, available, patients)
         VALUES (?,?,?,?,?,?,?)`, ...r);

  const apptRows = [ // [doctorId, dayOffset, time, reason, status]
    [1, 4,  '10:30 AM', 'Antenatal check-up — Week 26', 'upcoming'],
    [3, 17, '09:00 AM', 'Anomaly ultrasound scan', 'upcoming'],
    [2, 26, '11:15 AM', "Zara's 15-month wellness visit", 'upcoming'],
    [1, -24, '10:00 AM', 'Antenatal check-up — Week 22', 'completed'],
    [4, -38, '04:30 PM', 'Nutrition plan review', 'completed'],
    [1, -52, '10:00 AM', 'Antenatal check-up — Week 18', 'completed'],
    [2, -80, '12:00 PM', "Zara's 12-month check-up", 'completed'],
  ];
  for (const [docId, d, time, reason, st] of apptRows)
    run(`INSERT INTO appointments (user_id, doctor_id, date, time, reason, status)
         VALUES (1,?,?,?,?,?)`, docId, daysFromNow(d), time, reason, st);

  const articleRows = [
    ['Nutrition essentials for the third trimester', 'Nutrition', 6, '🥗',
     'Iron, calcium and omega-3 needs rise sharply after week 27. A practical plate-by-plate guide.'],
    ['Understanding fetal movement counting', 'Pregnancy', 4, '🤰',
     'Kick counts are a simple daily habit that helps you notice changes early. Learn the 2-hour method.'],
    ['Safe exercise in pregnancy: a week-by-week guide', 'Fitness', 7, '🧘‍♀️',
     'Which activities are safe in each trimester, and warning signs that mean you should stop.'],
    ['Newborn sleep: what is actually normal?', 'Infant care', 5, '🌙',
     'Sleep cycles, safe sleeping positions, and how patterns evolve during the first year.'],
    ['Warning signs that need urgent medical attention', 'Safety', 3, '🚨',
     'Severe headache, blurred vision, reduced movement, bleeding — know when to call your doctor now.'],
    ['Breastfeeding basics for the first two weeks', 'Infant care', 8, '🍼',
     'Latch technique, feeding frequency, and how to know your baby is getting enough milk.'],
    ['Managing gestational diabetes with diet', 'Nutrition', 6, '🩺',
     'Meal timing, carbohydrate awareness and glucose self-monitoring, explained simply.'],
    ['Your week 26 guide: what is happening now', 'Weekly tips', 4, '📅',
     'Baby’s eyes are opening this week. Here is what to expect and what to prepare next.'],
  ];
  for (const r of articleRows)
    run(`INSERT INTO articles (title, category, minutes, icon, excerpt) VALUES (?,?,?,?,?)`, ...r);

  const postRows = [
    ['Maliha S.', 'Third trimester', 'Anyone else dealing with swollen feet at week 30?',
     'My ankles swell every evening. Elevating helps a bit — any other tips that worked for you?', 14, 32, '2 h ago'],
    ['Tania R.', 'Vaccination', 'MR dose 2 experience — mild fever after?',
     'My son had a mild fever the evening after MR-2. Doctor said it is normal. Sharing for other worried moms!', 8, 21, '6 h ago'],
    ['Nadia K.', 'Nutrition', 'Iron-rich meal ideas that are actually tasty',
     'Sharing my week of iron-rich Bangladeshi meals that helped raise my hemoglobin from 9.8 to 11.2.', 23, 67, '1 d ago'],
    ['Sharmin A.', 'Newborn care', 'How I got my 4-month-old to sleep longer stretches',
     'A consistent bath-feed-lullaby routine changed everything for us within two weeks.', 17, 45, '2 d ago'],
    ['Rumana H.', 'Mental health', 'It is okay to ask for help — my postpartum story',
     'I want other mothers to know that feeling overwhelmed is common and support changes everything.', 31, 112, '3 d ago'],
  ];
  for (const r of postRows)
    run(`INSERT INTO posts (author, tag, title, body, replies, likes, time_ago) VALUES (?,?,?,?,?,?,?)`, ...r);

  run(`INSERT INTO emergency_contacts (user_id, name, relation, phone) VALUES (1,?,?,?)`,
    'Imran Rahman', 'Husband', '+880 17XX-XXXXXX');
  run(`INSERT INTO emergency_contacts (user_id, name, relation, phone) VALUES (1,?,?,?)`,
    'Salma Begum', 'Mother', '+880 19XX-XXXXXX');
  run(`INSERT INTO emergency_contacts (user_id, name, relation, phone) VALUES (1,?,?,?)`,
    'Dr. Nusrat Jahan', 'Obstetrician', '+880 18XX-XXXXXX');

  const hospitalRows = [
    ['City Maternity Hospital', 1.2, '+880 2-XXXXXXX', 1, 1],
    ['Square Hospital', 3.1, '+880 2-XXXXXXX', 1, 1],
    ['Green Life Children Clinic', 2.4, '+880 2-XXXXXXX', 0, 1],
    ['Popular Diagnostic Centre', 4.2, '+880 2-XXXXXXX', 1, 0],
  ];
  for (const r of hospitalRows)
    run(`INSERT INTO hospitals (name, distance_km, phone, ambulance, open24) VALUES (?,?,?,?,?)`, ...r);
}

module.exports = db;
