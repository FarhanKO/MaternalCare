/**
 * Loads db/seed.sql — the demo data, with every date relative to today.
 *   npm run db:seed
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  const started = Date.now();
  try {
    // seed.sql carries its own BEGIN/COMMIT
    await db.sql(sql);
    console.log(`\n  seeded in ${Date.now() - started} ms`);
  } catch (err) {
    console.error(`\n  seed failed: ${err.message}`);
    if (err.sql) console.error(`  near: ${err.sql}`);
    await db.pool.end();
    process.exit(1);
  }

  for (const t of ['users', 'doctors', 'pregnancies', 'vitals', 'children',
    'growth_records', 'milestones', 'vaccinations', 'appointments', 'symptoms',
    'reminders', 'daily_logs', 'emergency_contacts', 'articles', 'posts',
    'post_comments', 'hospitals']) {
    const { count } = await db.one(`SELECT count(*) AS count FROM ${t}`);
    console.log(`  ${String(count).padStart(4)}  ${t}`);
  }
  console.log();
  await db.pool.end();
})();
