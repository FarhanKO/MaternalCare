-- MaternalCare+ — demo data
--
-- Every date is relative to CURRENT_DATE rather than fixed, so the demo still
-- reads as "today" whenever it is run. Ayesha is the signed-in mother; the
-- other five are the clinician's caseload, each a real account with her own
-- pregnancy and readings.
--
-- Safe to re-run: it clears the tables it fills first.
--   npm run db:seed

BEGIN;

TRUNCATE sos_notifications, sos_alerts, documents, messages, reminders,
  symptoms, daily_logs, emergency_contacts,
  care_terminations, appointment_changes, appointments, vitals,
  growth_records, milestones, children, pregnancies, vaccinations,
  content_reports, post_comments, posts, articles, doctors, users
  RESTART IDENTITY CASCADE;

/* ------------------------------------------------------------- mothers */

INSERT INTO users (name, role, email, age, blood_group, stage, conditions,
                   last_visit, next_visit, bio) VALUES
  ('Ayesha Rahman',  'mother', 'ayesha@example.com',  28, 'B+',  'pregnant',
   'First pregnancy',                      CURRENT_DATE - 14, CURRENT_DATE + 5,  ''),
  ('Nusrat Jahan',   'mother', 'nusrat.jahan@example.com',   33, 'O−', 'pregnant',
   'Rh negative,Gestational hypertension', CURRENT_DATE - 4,  CURRENT_DATE + 3,  ''),
  ('Farhana Rahim',  'mother', 'farhana.rahim@example.com',  25, 'A+', 'pregnant',
   'Second pregnancy',                     CURRENT_DATE - 7,  CURRENT_DATE + 20, ''),
  ('Priya Sengupta', 'mother', 'priya.sengupta@example.com', 30, 'AB+','pregnant',
   'Anaemia',                              CURRENT_DATE - 6,  CURRENT_DATE + 7,  ''),
  ('Maria Gomes',    'mother', 'maria.gomes@example.com',    22, 'O+', 'pregnant',
   'First pregnancy',                      CURRENT_DATE - 3,  CURRENT_DATE + 25, ''),
  ('Shirin Akter',   'mother', 'shirin.akter@example.com',   37, 'B−', 'pregnant',
   'Gestational diabetes',                 CURRENT_DATE - 2,  CURRENT_DATE + 4,  '');

/* --------------------------------------------------------- pregnancies */

INSERT INTO pregnancies (user_id, lmp, height_cm, pre_weight_kg)
SELECT id, CURRENT_DATE - (w * 7), h, pw
FROM (VALUES
  ('Ayesha Rahman',  29, 158, 55.0),
  ('Nusrat Jahan',   34, 160, 56.0),
  ('Farhana Rahim',  19, 160, 56.0),
  ('Priya Sengupta', 29, 160, 56.0),
  ('Maria Gomes',    12, 160, 56.0),
  ('Shirin Akter',   31, 160, 56.0)
) AS t(nm, w, h, pw)
JOIN users u ON u.name = t.nm;

/* Ayesha: weekly readings from week 16, drifting gently upward. */
INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'),
       CURRENT_DATE + d, sys, dia, sug, wt, tmp
FROM (VALUES
  (-84, 108, 70,  88, 58.2, 36.7), (-77, 109, 71,  90, 58.9, 36.8),
  (-70, 111, 72,  91, 59.6, 36.7), (-63, 112, 72,  93, 60.4, 36.8),
  (-56, 113, 74,  95, 61.1, 36.9), (-49, 115, 74,  96, 61.9, 36.8),
  (-42, 116, 75,  97, 62.6, 36.8), (-35, 118, 77,  99, 63.4, 36.9),
  (-28, 119, 78, 100, 64.1, 36.8), (-21, 121, 79, 101, 64.9, 37.0),
  (-14, 122, 80, 102, 65.6, 36.9), ( -7, 123, 81, 103, 66.1, 36.9),
  (  0, 124, 82, 104, 66.5, 37.0)
) AS v(d, sys, dia, sug, wt, tmp);

/* The caseload: five fortnightly readings each, so every sparkline has a
   real trend and the triage rules have something to sort on.

   Glucose is per-row rather than the single `95 + i` ramp it used to be. That
   ramp put every mother on the caseload at 99 mg/dL, one point over the
   threshold the risk engine uses — so the personalised care plan opened with
   the same carbohydrate advice for all of them and looked like it ignored who
   they were. It was reading them correctly; they were identical. Each woman
   now carries the numbers her recorded condition implies: Shirin's glucose is
   genuinely diabetic, Nusrat's problem is her pressure and not her sugar, and
   the mothers with nothing on their record read normal on both. */
INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c)
SELECT u.id, CURRENT_DATE - ((4 - i) * 14), sys, dia, sug, 60 + i * 0.7, 36.8
FROM (VALUES
  -- gestational hypertension: pressure climbing, sugar untroubled
  ('Nusrat Jahan',   0, 124, 85,  84), ('Nusrat Jahan',   1, 128, 87,  86),
  ('Nusrat Jahan',   2, 133, 89,  85), ('Nusrat Jahan',   3, 138, 91,  87),
  ('Nusrat Jahan',   4, 142, 93,  86),
  -- second pregnancy, nothing on her record: normal on both
  ('Farhana Rahim',  0, 108, 62,  80), ('Farhana Rahim',  1, 109, 64,  82),
  ('Farhana Rahim',  2, 111, 66,  81), ('Farhana Rahim',  3, 110, 68,  83),
  ('Farhana Rahim',  4, 110, 70,  82),
  -- anaemia is not a glucose or pressure problem, and should not read as one
  ('Priya Sengupta', 0, 118, 76,  86), ('Priya Sengupta', 1, 121, 78,  85),
  ('Priya Sengupta', 2, 124, 80,  88), ('Priya Sengupta', 3, 126, 82,  86),
  ('Priya Sengupta', 4, 128, 84,  87),
  -- first pregnancy, week 12, well
  ('Maria Gomes',    0, 110, 64,  79), ('Maria Gomes',    1, 112, 66,  81),
  ('Maria Gomes',    2, 111, 68,  80), ('Maria Gomes',    3, 113, 70,  82),
  ('Maria Gomes',    4, 112, 72,  81),
  -- gestational diabetes: this is what the diagnosis actually looks like
  ('Shirin Akter',   0, 126, 82, 112), ('Shirin Akter',   1, 130, 84, 118),
  ('Shirin Akter',   2, 133, 86, 124), ('Shirin Akter',   3, 136, 88, 129),
  ('Shirin Akter',   4, 138, 90, 133)
) AS t(nm, i, sys, dia, sug)
JOIN users u ON u.name = t.nm;

/* --------------------------------------------------------------- child */

INSERT INTO children (user_id, name, dob, gender)
VALUES ((SELECT id FROM users WHERE name = 'Ayesha Rahman'),
        'Zara', CURRENT_DATE - 437, 'female');

INSERT INTO growth_records (child_id, date, age_months, weight_kg, height_cm, head_cm)
SELECT (SELECT id FROM children WHERE name = 'Zara'),
       CURRENT_DATE - 437 + round(m * 30.44)::int, m, wt, ht, hd
FROM (VALUES
  (0, 3.2, 49.5, 34.2), (2, 5.0, 57.0, 38.0), (4, 6.2, 62.0, 40.5),
  (6, 7.1, 65.5, 42.0), (9, 8.2, 70.0, 43.8), (12, 9.0, 74.5, 45.0),
  (14, 9.6, 77.0, 45.8)
) AS g(m, wt, ht, hd);

INSERT INTO milestones (child_id, title, typical, icon, achieved, achieved_on)
SELECT (SELECT id FROM children WHERE name = 'Zara'),
       title, typical, icon, done,
       CASE WHEN d IS NULL THEN NULL ELSE CURRENT_DATE + d END
FROM (VALUES
  ('Social smile',         '1–2 months',   '😊', TRUE,  -390),
  ('Holds head steady',    '3–4 months',   '🙆', TRUE,  -330),
  ('Rolls over',           '4–6 months',   '🔄', TRUE,  -300),
  ('Sits without support', '6–8 months',   '🧘', TRUE,  -240),
  ('First babbling',       '6–9 months',   '🗣️', TRUE,  -230),
  ('Crawling',             '8–10 months',  '🐾', TRUE,  -160),
  ('Pincer grasp',         '9–12 months',  '🤏', TRUE,  -120),
  ('Stands holding on',    '9–12 months',  '🧍', TRUE,  -100),
  ('First words',          '10–14 months', '💬', TRUE,  -45),
  ('Walks alone',          '12–16 months', '🚶', FALSE, NULL),
  ('Stacks two blocks',    '13–16 months', '🧱', FALSE, NULL),
  ('Points to objects',    '12–16 months', '👉', FALSE, NULL)
) AS m(title, typical, icon, done, d);

INSERT INTO vaccinations (subject, name, dose, due_date, status, completed_on)
SELECT subject, nm, dose, CURRENT_DATE + due, status,
       CASE WHEN comp IS NULL THEN NULL ELSE CURRENT_DATE + comp END
FROM (VALUES
  ('child',  'BCG',                        'Single dose',  -437, 'done',     -436),
  ('child',  'Pentavalent (DTP-HepB-Hib)', 'Dose 1',       -395, 'done',     -394),
  ('child',  'OPV + PCV',                  'Dose 1',       -395, 'done',     -394),
  ('child',  'Pentavalent (DTP-HepB-Hib)', 'Dose 2',       -365, 'done',     -363),
  ('child',  'Pentavalent (DTP-HepB-Hib)', 'Dose 3',       -335, 'done',     -333),
  ('child',  'Measles–Rubella (MR)',       'Dose 1',       -163, 'done',     -160),
  ('child',  'Measles–Rubella (MR)',       'Dose 2',         19, 'upcoming', NULL),
  ('child',  'Vitamin A supplement',       'Round 2',        34, 'upcoming', NULL),
  ('mother', 'Tetanus Toxoid (TT)',        'Dose 1',        -70, 'done',      -70),
  ('mother', 'Tetanus Toxoid (TT)',        'Dose 2',        -42, 'done',      -41),
  ('mother', 'Influenza (seasonal)',       'Single dose',     5, 'due',      NULL),
  ('mother', 'Tdap booster',               'Week 28 dose',   14, 'upcoming', NULL)
) AS v(subject, nm, dose, due, status, comp);

/* ----------------------------------------------------------- clinicians */

-- The seeded roster. Everyone here has a licence number and an email because
-- the registration form asks for both, and a seed that cannot satisfy its own
-- constraints is a seed that hides them. The licences are obviously fictional
-- for the same reason the phone numbers are absent: this is demo data, and it
-- should not be mistakable for a real clinician's registration.
INSERT INTO doctors (name, specialty, rating,
                     available, patients, qualification, years, capacity,
                     email, license_no) VALUES
  ('Dr. Lena Ortiz',    'Obstetrics & Maternal Medicine',
   4.9, TRUE,  22, 'MBBS, MRCOG, MD (Maternal Medicine)', 15, 30,
   'lena.ortiz@demo.maternalcare.app',     'DEMO-BMDC-1001'),
  ('Dr. Nusrat Kabir',  'Obstetrics & Gynaecology',
   4.9, TRUE,  26, 'MBBS, FCPS (Obs & Gynae)', 12, 28,
   'nusrat.kabir@demo.maternalcare.app',   'DEMO-BMDC-1002'),
  ('Dr. Farzana Karim', 'Obstetrics & Gynaecology',
   4.5, TRUE,  14, 'MBBS, DGO', 7, 35,
   'farzana.karim@demo.maternalcare.app',  'DEMO-BMDC-1003'),
  ('Dr. Sara Ahmed',    'Maternal-Fetal Medicine',
   4.7, TRUE,  24, 'MBBS, FCPS, MD (Fetal Medicine)', 18, 24,
   'sara.ahmed@demo.maternalcare.app',     'DEMO-BMDC-1004'),
  ('Dr. Kamal Hossain', 'Paediatrics',
   4.8, TRUE,  19, 'MBBS, MRCPCH, DCH', 11, 32,
   'kamal.hossain@demo.maternalcare.app',  'DEMO-BMDC-1005'),
  ('Dr. Rafiq Islam',   'Nutrition & Dietetics',
   4.6, TRUE,  12, 'MBBS, MPH (Nutrition)', 6, 40,
   'rafiq.islam@demo.maternalcare.app',    'DEMO-BMDC-1006'),
  ('Dr. Mahmuda Hasan', 'Perinatal Mental Health',
   4.7, TRUE,  16, 'MBBS, FCPS (Psychiatry)', 9, 26,
   'mahmuda.hasan@demo.maternalcare.app',  'DEMO-BMDC-1007'),
  -- deliberately on leave, so the "no doctor available" path can be demonstrated
  ('Dr. Tanvir Alam',   'Paediatric Neurology',
   4.8, FALSE,  8, 'MBBS, MD (Paediatric Neurology)', 14, 20,
   'tanvir.alam@demo.maternalcare.app',    'DEMO-BMDC-1008');

-- `resp` is how many hours the clinician took to answer, and it is not
-- decoration: the ranking scores how fast a doctor replies, read from exactly
-- these two timestamps. Left NULL, as it was, every clinician scored the same
-- neutral middle and the term did nothing on a fresh database. The lags differ
-- per clinician on purpose, so the ordering visibly reflects them.
INSERT INTO appointments (user_id, doctor_id, date, time, reason, status,
                          requested_at, responded_at)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'),
       d.id, CURRENT_DATE + t.off, t.tm, t.reason, t.status,
       now() - (abs(t.off) || ' days')::interval,
       now() - (abs(t.off) || ' days')::interval + (t.resp || ' hours')::interval
-- Dr. Lena Ortiz is the clinician the portal signs in as, so she is Ayesha's
-- obstetrician. Without that relationship her request inbox, her SOS alerts
-- and the mother's care team would all be empty on a fresh database.
FROM (VALUES
  ('Dr. Lena Ortiz',     4, '10:30 AM', 'Antenatal check-up — Week 29',   'accepted',   3),
  ('Dr. Sara Ahmed',    17, '09:00 AM', 'Anomaly ultrasound scan',        'accepted',  30),
  ('Dr. Kamal Hossain', 26, '11:15 AM', 'Zara''s 15-month wellness visit','accepted',  52),
  ('Dr. Lena Ortiz',   -24, '10:00 AM', 'Antenatal check-up — Week 25',   'completed',  2),
  ('Dr. Rafiq Islam',  -38, '04:30 PM', 'Nutrition plan review',          'completed',  7),
  ('Dr. Lena Ortiz',   -52, '10:00 AM', 'Antenatal check-up — Week 21',   'completed',  5),
  ('Dr. Kamal Hossain',-80, '12:00 PM', 'Zara''s 12-month check-up',      'completed', 61)
) AS t(doc, off, tm, reason, status, resp)
JOIN doctors d ON d.name = t.doc;

-- One waiting request so the clinician's inbox has something to answer, and
-- an open conversation so the messaging screens are not blank on first run.
INSERT INTO appointments (user_id, doctor_id, date, time, reason, status, requested_at)
SELECT (SELECT id FROM users WHERE name = 'Nusrat Jahan'),
       (SELECT id FROM doctors WHERE name = 'Dr. Lena Ortiz'),
       CURRENT_DATE + 2, '09:40', 'Blood pressure review', 'requested',
       now() - interval '6 hours';

INSERT INTO messages (user_id, doctor_id, sender, body, sent_at, read_at)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'),
       (SELECT id FROM doctors WHERE name = 'Dr. Lena Ortiz'),
       sender, body, now() - (hrs || ' hours')::interval,
       CASE WHEN read THEN now() - (hrs || ' hours')::interval + interval '20 minutes' END
FROM (VALUES
  ('mother', 'My back ache has not eased in six days. Should I be worried?', 5::numeric, TRUE),
  ('doctor', 'Six days is worth checking. Keep to your side at night and bring it up on Tuesday — call sooner if it becomes constant or you feel it in your abdomen.', 4, FALSE)
) AS m(sender, body, hrs, read);

/* ------------------------------------------------------------- her log */

INSERT INTO symptoms (user_id, name, intensity, days_present, confirmed_today,
                      from_voice, logged_at)
VALUES ((SELECT id FROM users WHERE name = 'Ayesha Rahman'),
        'Back ache', 'mid', 5, TRUE, FALSE, now() - interval '3 hours');

INSERT INTO reminders (user_id, kind, title, note, due_at, repeat, assigned_by)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'),
       kind, title, note, now() + (off || ' hours')::interval, rep, assigned
FROM (VALUES
  ('medicine', 'Iron + folic acid', 'With orange juice, away from tea',  9::numeric, 'daily',  NULL),
  ('doctor',   'Antenatal check-up', 'Bring your notes',                 96,         'once',   NULL),
  ('test',     'Glucose screening',  'Fast for 8 hours beforehand',      240,        'once',   'Dr. Lena Ortiz'),
  ('exercise', 'Prenatal walk',      '20 minutes, gentle pace',          26,         'daily',  NULL),
  ('vaccination','Tdap booster',     'Week 28 dose',                     336,        'once',   'Dr. Lena Ortiz')
) AS r(kind, title, note, off, rep, assigned);

INSERT INTO daily_logs (user_id, date, mood, kicks, water_litres)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'),
       CURRENT_DATE - d, mood, kicks, water
FROM (VALUES
  (6, 'Tired',   9, 1.2), (5, 'Calm',    11, 1.8), (4, 'Happy',  14, 2.2),
  (3, 'Neutral', 12, 1.6), (2, 'Tired',  10, 1.4), (1, 'Calm',   13, 2.0),
  (0, 'Calm',    12, 1.4)
) AS l(d, mood, kicks, water);

/* ------------------------------------------------------------ contacts */

INSERT INTO emergency_contacts (user_id, name, relation, phone, access_token)
SELECT (SELECT id FROM users WHERE name = 'Ayesha Rahman'), nm, rel, ph,
       replace(gen_random_uuid()::text, '-', '')
FROM (VALUES
  ('Imran Rahman',    'Husband',      '+880 17XX-XXXXXX'),
  ('Salma Begum',     'Mother',       '+880 19XX-XXXXXX'),
  ('Dr. Nusrat Kabir','Obstetrician', '+880 18XX-XXXXXX')
) AS c(nm, rel, ph);

/* ----------------------------------------------------- shared content */

INSERT INTO articles (title, category, minutes, icon, excerpt) VALUES
  ('Nutrition essentials for the third trimester', 'Nutrition', 6, '🥗',
   'Iron, calcium and omega-3 needs rise sharply after week 27. A practical plate-by-plate guide.'),
  ('Understanding fetal movement counting', 'Pregnancy', 4, '🤰',
   'Kick counts are a simple daily habit that helps you notice changes early. Learn the 2-hour method.'),
  ('Safe exercise in pregnancy: a week-by-week guide', 'Fitness', 7, '🧘‍♀️',
   'Which activities are safe in each trimester, and warning signs that mean you should stop.'),
  ('Newborn sleep: what is actually normal?', 'Infant care', 5, '🌙',
   'Sleep cycles, safe sleeping positions, and how patterns evolve during the first year.'),
  ('Warning signs that need urgent medical attention', 'Safety', 3, '🚨',
   'Severe headache, blurred vision, reduced movement, bleeding — know when to call your doctor now.'),
  ('Breastfeeding basics for the first two weeks', 'Infant care', 8, '🍼',
   'Latch technique, feeding frequency, and how to know your baby is getting enough milk.'),
  ('Managing gestational diabetes with diet', 'Nutrition', 6, '🩺',
   'Meal timing, carbohydrate awareness and glucose self-monitoring, explained simply.'),
  ('Your week 29 guide: what is happening now', 'Weekly tips', 4, '📅',
   'Baby is putting on fat and the kicks are stronger. Here is what to expect next.');

INSERT INTO posts (author, role, week, topic, title, body, hearts,
                   clinician_answered, created_at)
SELECT author, role, wk, topic, title, body, hearts, answered,
       now() - (hrs || ' hours')::interval
FROM (VALUES
  ('Nusrat J.',      'mother', 27, 'Sleep',
   'Anyone else waking up at 3am every night?',
   'I fall asleep fine but wake around 3am and can’t settle again. Side-lying with a pillow helps a little. What worked for you?',
   32, TRUE, 2::numeric),
  ('Dr. Lena Ortiz', 'doctor', NULL, 'Second trimester',
   'Why movement patterns matter more than kick counts',
   'From week 28, what matters is your baby’s usual pattern — not hitting a magic number. If the pattern changes, call the same day.',
   61, TRUE, 6),
  ('Farhana R.',     'mother', 25, 'Nutrition',
   'Iron tablets making me nauseous — alternatives?',
   'Taking them on an empty stomach was a mistake. My doctor suggested taking them with orange juice at night instead.',
   47, FALSE, 24),
  ('Priya S.',       'mother', 29, 'Symptoms',
   'Heartburn every single night — what finally helped',
   'Stopped eating two hours before bed and raised the head of the mattress on books. Not perfect, but I sleep now.',
   24, FALSE, 72),
  ('Dr. Lena Ortiz', 'doctor', NULL, 'Nutrition',
   'You do not need to eat for two',
   'Second trimester needs roughly 340 extra calories a day, third around 450. Quality matters far more than quantity.',
   73, TRUE, 96),
  ('Maria G.',       'mother', 12, 'Symptoms',
   'When did morning sickness ease for you?',
   'Week 12 and still rough. Trying to hear that it does get better.',
   41, FALSE, 100),
  ('Shirin A.',      'mother', 31, 'Sleep',
   'Restless legs at night — anyone else?',
   'Worse in the last few weeks. My doctor is checking my iron levels.',
   18, FALSE, 144),
  ('Dr. Lena Ortiz', 'doctor', NULL, 'Symptoms',
   'Swelling: when it is normal and when to call',
   'Gradual ankle swelling by evening is expected. Sudden swelling of face or hands, especially with headache or vision changes, is not.',
   112, TRUE, 168)
) AS p(author, role, wk, topic, title, body, hearts, answered, hrs);

INSERT INTO post_comments (post_id, author, role, body, created_at)
SELECT p.id, c.author, c.role, c.body, now() - (c.hrs || ' hours')::interval
FROM (VALUES
  ('Anyone else waking up at 3am every night?', 'Dr. Lena Ortiz', 'doctor',
   'Very common in the third trimester. Keep the room dark and avoid checking the time — it raises alertness.', 1::numeric),
  ('Anyone else waking up at 3am every night?', 'Priya S.', 'mother',
   'A pillow under the bump as well as between the knees was what finally worked for me.', 1),
  ('Why movement patterns matter more than kick counts', 'Farhana R.', 'mother',
   'Thank you for saying this. I was stressing about reaching ten every day.', 5)
) AS c(title, author, role, body, hrs)
JOIN posts p ON p.title = c.title;

/* ------------------------------------------------ reported content */
/*
 * One post that is exactly what the reporting feature exists to catch, one
 * report against it, and a clinician already correcting it in the replies.
 *
 * Seeding this is deliberate. Without it the moderation queue is empty on a
 * fresh database and the feature cannot be seen working at all — and the
 * realistic case is not abuse or spam, it is a well-meaning mother repeating
 * something dangerous she was told. It is left `open` rather than resolved so
 * there is a decision waiting to be made.
 */
INSERT INTO posts (author, role, week, topic, title, body, hearts, created_at)
VALUES ('Rehana K.', 'mother', 31, 'Symptoms',
        'My BP tablets were making me tired so I stopped them',
        'My mother-in-law said these tablets are not needed and they weaken the baby. I have not taken them for a week and I feel much better. Anyone else stopped theirs?',
        2, now() - interval '5 hours');

INSERT INTO post_comments (post_id, author, role, body, created_at)
SELECT p.id, 'Dr. Lena Ortiz', 'doctor',
       'Please start them again today and call your clinic. Blood pressure medication in pregnancy is treating something you cannot feel — feeling better off them is expected and is not a sign it was unnecessary. Stopping carries a real risk of pre-eclampsia for you and the baby.',
       now() - interval '3 hours'
FROM posts p WHERE p.title = 'My BP tablets were making me tired so I stopped them';

INSERT INTO content_reports (post_id, reporter_id, reason, detail, created_at)
SELECT p.id,
       (SELECT id FROM users WHERE name = 'Farhana Rahim'),
       'medical-misinformation',
       'She is telling other people to stop their blood pressure medication.',
       now() - interval '4 hours'
FROM posts p WHERE p.title = 'My BP tablets were making me tired so I stopped them';

/*
 * A `hospitals` seed sat here: four real institutions with placeholder phone
 * numbers, feeding a "nearby facilities" list on the emergency page. Both are
 * gone. This platform has no relationship with any of them, and an emergency
 * screen must not carry a directory nobody is keeping accurate.
 */

COMMIT;
