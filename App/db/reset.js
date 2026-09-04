/**
 * Rebuilds the schema from db/migrations, in filename order.
 *
 *   npm run db:reset
 *
 * 0001 begins with DROP TABLE ... CASCADE, so this destroys everything in
 * the public schema. Fine while we are still building; once there is real
 * data, add a new numbered migration instead of re-running this.
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const DIR = path.join(__dirname, 'migrations');

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.error('  No migrations found in db/migrations');
    process.exit(1);
  }

  console.log(`\n  Applying ${files.length} migration(s)\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    const started = Date.now();
    try {
      // each file is one transaction, so a failure leaves nothing half-applied
      await db.tx(async (t) => { await t.run(sql); });
      console.log(`  \x1b[32mok\x1b[0m   ${file.padEnd(42)} ${Date.now() - started} ms`);
    } catch (err) {
      console.log(`  \x1b[31mFAIL\x1b[0m ${file}`);
      console.log(`       ${err.message}`);
      if (err.sql) console.log(`       near: ${err.sql}`);
      await db.pool.end();
      process.exit(1);
    }
  }

  const info = await db.check();
  console.log(`\n  ${info.tables} tables in ${info.db}\n`);
  await db.pool.end();
})();
