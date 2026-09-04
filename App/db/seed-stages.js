/**
 * Four demo mothers, one per life stage.
 *
 *   npm run db:stages
 *
 * The dashboard, the care plan, the vitals guidance and the daily check-in all
 * change with a woman's life stage, and with only one seeded account — a
 * pregnant one — three of those four paths could not be seen at all without
 * editing the database by hand.
 *
 *   Ayesha Rahman   pregnant        from seed.sql — not touched here
 *   Amena Chowdhury planning        pre-conception, no pregnancy record
 *   Nabila Karim    new-mother      baby seven weeks old
 *   Orpa Das        parent          child two and a half
 *
 * Everything each of them has is a real row: pregnancies, vitals, daily logs,
 * children, growth records, milestones, vaccinations and — for the two with
 * children — a fortnight of the child's own daily log. Nothing here is a
 * fixture inside a component; every figure the interface shows for these four
 * is read back out of Postgres.
 *
 * Re-running replaces them, so it is idempotent.
 */
const db = require('../config/db');
const { WHO } = require('../models/data/whoGrowth');

/*
 * Ayesha is deliberately NOT in this list.
 *
 * She is seeded by seed.sql with a far richer record than this script could
 * build — appointments, messages, documents, reminders, guardians, an SOS
 * history — and she is already the `pregnant` stage. An earlier version of
 * this file created her here too, under the same email, and the wipe below
 * therefore deleted the seeded Ayesha and everything that cascaded from her.
 *
 * These three cover the stages the main seed does not.
 */
const STAGES = [
  {
    name: 'Amena Chowdhury',
    email: 'amena@stage.demo',
    stage: 'planning',
    age: 26,
    blood: 'O+',
    conditions: 'Planning first pregnancy',
    weeks: null,
    height: 162,
    preWeight: 58,
    vitals: { sys: 112, dia: 72, sugar: 84, temp: 36.7, hr: 74, weight: 58.4 },
  },
  {
    name: 'Nabila Karim',
    email: 'nabila@stage.demo',
    stage: 'new-mother',
    age: 31,
    blood: 'A+',
    conditions: 'Second baby, mild anaemia',
    weeks: null,
    height: 155,
    preWeight: 54,
    vitals: { sys: 118, dia: 76, sugar: 88, temp: 36.8, hr: 88, weight: 60.2 },
    child: { name: 'Ayaan', gender: 'male', ageDays: 49 },
  },
  {
    name: 'Orpa Das',
    email: 'orpa@stage.demo',
    stage: 'parent',
    age: 34,
    blood: 'AB+',
    conditions: 'Parent of a toddler',
    weeks: null,
    height: 160,
    preWeight: 57,
    vitals: { sys: 120, dia: 78, sugar: 90, temp: 36.9, hr: 76, weight: 61.0 },
    child: { name: 'Rehnuma', gender: 'female', ageDays: 918 },
  },
];

const MOODS = ['Happy', 'Calm', 'Neutral', 'Tired', 'Anxiety'];
const CHILD_MOODS = ['Content', 'Playful', 'Sleepy', 'Fussy', 'Unsettled'];

/** Deterministic wobble, so a re-run produces the same demo. */
function wobble(seed, i, spread) {
  const x = Math.sin(seed * 97.13 + i * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * 2 * spread;
}

/*
 * Addresses this script used to seed under.
 *
 * The wipe below only removes what is currently in STAGES, so renaming an
 * account would leave the old row behind — still in the database, still
 * signed-in-able, and no longer replaced on a re-run. Retiring the address
 * here keeps the script idempotent across a rename.
 */
const RETIRED = ['tonima@stage.demo'];

async function wipe() {
  const emails = [...STAGES.map((s) => s.email), ...RETIRED];

  /* Guard, because getting this wrong once already cost the seeded Ayesha and
     every row that cascaded from her. This script may only ever remove the
     accounts it created. */
  const clash = await db.sql(
    `SELECT email FROM users WHERE email = ANY($1::text[])
       AND email NOT LIKE '%@stage.demo'`,
    [emails],
  );
  if (clash.length) {
    throw new Error(
      `Refusing to run: ${clash.map((c) => c.email).join(', ')} is not a @stage.demo `
      + 'address, so it may belong to the main seed.',
    );
  }
  // children, vitals, logs and the rest cascade from users
  const n = await db.run('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
  return n;
}

async function seedOne(spec, seed) {
  const user = await db.insert(
    `INSERT INTO users (name, role, email, age, blood_group, stage, conditions,
                        last_visit, next_visit, language)
     VALUES ($1,'mother',$2,$3,$4,$5,$6, CURRENT_DATE - 10, CURRENT_DATE + 12, 'en')
     RETURNING id`,
    [spec.name, spec.email, spec.age, spec.blood, spec.stage, spec.conditions],
  );
  const userId = user.id;

  /* ------------------------------------------------------- pregnancy */
  if (spec.weeks) {
    await db.run(
      `INSERT INTO pregnancies (user_id, lmp, height_cm, pre_weight_kg)
       VALUES ($1, CURRENT_DATE - ($2::int * 7), $3, $4)`,
      [userId, spec.weeks, spec.height, spec.preWeight],
    );
  }

  /* ---------------------------------------------------------- vitals */
  // eight fortnightly readings, drifting toward the current values above
  for (let i = 7; i >= 0; i -= 1) {
    const t = (7 - i) / 7;                       // 0 = oldest, 1 = today
    const v = spec.vitals;
    await db.run(
      `INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg,
                           temp_c, heart_bpm)
       VALUES ($1, CURRENT_DATE - ($2::int * 14), $3,$4,$5,$6,$7,$8)`,
      [userId, i,
        Math.round(v.sys - 8 * (1 - t) + wobble(seed, i, 2)),
        Math.round(v.dia - 5 * (1 - t) + wobble(seed, i + 1, 2)),
        Math.round(v.sugar - 6 * (1 - t) + wobble(seed, i + 2, 3)),
        Math.round((v.weight - (spec.weeks ? 9 : 1.5) * (1 - t)) * 10) / 10,
        Math.round((v.temp + wobble(seed, i + 3, 0.2)) * 10) / 10,
        Math.round(v.hr + wobble(seed, i + 4, 4))],
    );
  }

  /* ------------------------------------------------ her own daily log */
  for (let i = 6; i >= 0; i -= 1) {
    const kicks = spec.weeks ? Math.round(12 + wobble(seed, i, 4)) : null;
    await db.run(
      `INSERT INTO daily_logs (user_id, date, mood, kicks, water_litres, sleep_hours)
       VALUES ($1, CURRENT_DATE - ($2::int), $3, $4, $5, $6)
       ON CONFLICT (user_id, date) DO NOTHING`,
      [userId, i,
        MOODS[Math.abs(Math.round(wobble(seed, i + 5, 2.4))) % MOODS.length],
        kicks,
        Math.round((1.8 + wobble(seed, i + 6, 0.6)) * 10) / 10,
        Math.round((7 + wobble(seed, i + 7, 1.4)) * 10) / 10],
    );
  }

  /* ----------------------------------------------------------- child */
  let childId = null;
  if (spec.child) {
    const c = await db.insert(
      `INSERT INTO children (user_id, name, dob, gender)
       VALUES ($1, $2, CURRENT_DATE - ($3::int), $4) RETURNING id`,
      [userId, spec.child.name, spec.child.ageDays, spec.child.gender],
    );
    childId = c.id;

    /*
     * Growth records, seeded from the WHO median for that child's sex and age
     * with a small deterministic wobble.
     *
     * An earlier version used a hand-rolled formula that applied the final
     * monthly rate to every month, so a two-and-a-half-year-old came out at
     * 9.3 kg and 75.5 cm — against a WHO median of 12.7 kg and 90.7 cm. The
     * demo parent's dashboard therefore opened with "below the 1st centile ·
     * underweight", which is an alarming thing to invent about a healthy
     * child. Reading the same table the percentile screen reads means the
     * demo cannot disagree with the assessment drawn from it.
     */
    const months = Math.floor(spec.child.ageDays / 30.44);
    const sexKey = spec.child.gender === 'male' ? 'boys' : 'girls';
    const median = (measure, m) => WHO[sexKey][measure].M[Math.min(m, 60)];

    for (let m = 0; m <= months; m += Math.max(1, Math.round(months / 5))) {
      await db.run(
        `INSERT INTO growth_records (child_id, date, age_months, weight_kg, height_cm, head_cm)
         VALUES ($1, CURRENT_DATE - ($2::int), $3, $4, $5, $6)`,
        [childId, Math.round((months - m) * 30.44), m,
          Math.round((median('weight', m) + wobble(seed, m, 0.25)) * 10) / 10,
          Math.round((median('height', m) + wobble(seed, m + 1, 0.8)) * 10) / 10,
          Math.round((median('head', m) + wobble(seed, m + 2, 0.4)) * 10) / 10],
      );
    }

    /* milestones, achieved up to roughly their age */
    const MILESTONES = [
      ['Smiles back', 'By 2 months', '😊', 2],
      ['Holds head up', 'By 3 months', '👶', 3],
      ['Rolls over', 'By 5 months', '🔄', 5],
      ['Sits without support', 'By 7 months', '🪑', 7],
      ['Babbles', 'By 8 months', '🗣', 8],
      ['Crawls', 'By 9 months', '🧸', 9],
      ['Pulls to stand', 'By 10 months', '🧍', 10],
      ['First words', 'By 12 months', '💬', 12],
      ['Walks alone', 'By 14 months', '👟', 14],
      ['Two-word phrases', 'By 21 months', '🗯', 21],
      ['Runs steadily', 'By 24 months', '🏃', 24],
      ['Names body parts', 'By 27 months', '🧠', 27],
    ];
    for (const [title, typical, icon, due] of MILESTONES) {
      const done = months >= due;
      await db.run(
        `INSERT INTO milestones (child_id, title, typical, icon, achieved, achieved_on)
         VALUES ($1, $2, $3, $4, $5,
                 CASE WHEN $5 THEN CURRENT_DATE - (($6::int) * 30) ELSE NULL END)`,
        [childId, title, typical, icon, done, done ? Math.max(0, months - due) : 0],
      );
    }

    /* the child's own daily log — a fortnight of it */
    const young = months < 6;
    for (let i = 13; i >= 0; i -= 1) {
      await db.run(
        `INSERT INTO child_logs (child_id, date, feeds, wet_nappies, sleep_hours, temp_c, mood)
         VALUES ($1, CURRENT_DATE - ($2::int), $3,$4,$5,$6,$7)
         ON CONFLICT (child_id, date) DO NOTHING`,
        [childId, i,
          young ? Math.round(9 + wobble(seed, i, 2)) : Math.round(4 + wobble(seed, i, 1)),
          young ? Math.round(7 + wobble(seed, i + 1, 1.5)) : Math.round(6 + wobble(seed, i + 1, 1)),
          Math.round((young ? 14 : 11.5) + wobble(seed, i + 2, 1.2)),
          Math.round((36.8 + wobble(seed, i + 3, 0.25)) * 10) / 10,
          CHILD_MOODS[Math.abs(Math.round(wobble(seed, i + 4, 2.4))) % CHILD_MOODS.length]],
      );
    }
  }

  /* --------------------------------------------------- vaccinations */
  const MATERNAL = [
    ['Tetanus (TT)', 'TT2', -20, 'done'],
    ['Influenza (seasonal)', 'Single dose', 3, 'due'],
  ];
  const CHILD_VAX = [
    ['BCG', 'Single dose', -1, 'done'],
    ['Pentavalent', 'Dose 1', -1, 'done'],
    ['Measles–Rubella (MR)', 'Dose 1', 9, 'upcoming'],
  ];
  const rows = spec.child ? [...MATERNAL, ...CHILD_VAX] : MATERNAL;
  for (const [name, dose, offset, status] of rows) {
    const isChild = CHILD_VAX.some((c) => c[0] === name);
    await db.run(
      `INSERT INTO vaccinations (user_id, child_id, subject, name, dose, due_date,
                                 status, completed_on)
       VALUES ($1,$2,$3,$4,$5, CURRENT_DATE + ($6::int), $7, $8)`,
      [userId, isChild ? childId : null, isChild ? 'child' : 'mother',
        name, dose, offset, status,
        status === 'done' ? new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10) : null],
    );
  }

  return { userId, childId };
}

(async () => {
  console.log('\n  Seeding four demo mothers, one per life stage\n');

  const removed = await wipe();
  if (removed) console.log(`  removed ${removed} existing demo row(s)`);

  for (const [i, spec] of STAGES.entries()) {
    const { userId, childId } = await seedOne(spec, i + 1);
    console.log(
      `  ${String(userId).padStart(3)}  ${spec.name.padEnd(15)} ${spec.stage.padEnd(12)}`
      + (spec.weeks ? `week ${spec.weeks}` : childId ? `child ${spec.child.name}` : 'no pregnancy'),
    );
  }

  console.log('\n  Ayesha Rahman (pregnant) comes from the main seed and is untouched.');
  console.log('  Switch between all four from the account menu in the app header,');
  console.log('  or with GET /api/accounts and POST /api/accounts/use { userId }.\n');

  await db.pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
