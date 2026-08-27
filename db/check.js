/**
 * Proves the app can reach the database, and that the connection layer hands
 * back the shapes the Model layer expects.
 *
 *   npm run db:check
 *
 * Prints nothing that could identify the connection beyond its host.
 */
const db = require('../config/db');

const ok = (label, value) => console.log(`  \x1b[32mok\x1b[0m   ${label.padEnd(34)} ${value}`);
const bad = (label, value) => console.log(`  \x1b[31mFAIL\x1b[0m ${label.padEnd(34)} ${value}`);

(async () => {
  let failures = 0;

  try {
    const info = await db.check();
    ok('connected', `${info.db} as ${info.role}`);
    ok('server version', info.version);
    ok('round trip', `${info.latencyMs} ms`);
    ok('tables in public', info.tables);
    if (![25, 26].includes(info.tables)) {
      bad('expected 25 or 26 tables', `found ${info.tables} — run db/migrations`);
      failures += 1;
    }
  } catch (err) {
    bad('connect', err.message);
    console.log('\n  Check DATABASE_URL in .env. Use the Session pooler URI:');
    console.log('  Supabase → Settings → Database → Connection string → URI\n');
    process.exit(1);
  }

  // --- the type parsers are the whole point of the layer, so prove them ---

  const row = await db.one(`
    SELECT DATE '2026-03-15'                              AS a_date,
           TIMESTAMPTZ '2026-03-15 09:41:22+00'           AS a_timestamp,
           count(*)                                       AS a_count,
           TRUE                                           AS a_bool
    FROM (VALUES (1), (2), (3)) AS t(x)
  `);

  const checks = [
    ['DATE stays a plain string', row.a_date === '2026-03-15', row.a_date],
    ['TIMESTAMPTZ becomes ISO', row.a_timestamp === '2026-03-15T09:41:22.000Z', row.a_timestamp],
    ['count() is a number', typeof row.a_count === 'number' && row.a_count === 3, `${typeof row.a_count} ${row.a_count}`],
    ['boolean is a boolean', row.a_bool === true, `${typeof row.a_bool}`],
  ];

  for (const [label, passed, actual] of checks) {
    if (passed) ok(label, actual);
    else { bad(label, `got ${actual}`); failures += 1; }
  }

  // --- a password must never survive into an error ---
  const leaked = db.redact('connect ECONNREFUSED postgresql://user:hunter2@host:5432/db');
  if (leaked.includes('hunter2')) { bad('errors redact the password', leaked); failures += 1; }
  else ok('errors redact the password', leaked.slice(0, 46));

  // --- transactions must roll back cleanly ---
  try {
    await db.tx(async (t) => {
      await t.run('CREATE TEMP TABLE _probe (n int)');
      await t.run('INSERT INTO _probe VALUES (1)');
      throw new Error('deliberate');
    });
    bad('transaction rolls back', 'no error surfaced');
    failures += 1;
  } catch (err) {
    if (err.message.includes('deliberate')) ok('transaction rolls back', 'error propagated');
    else { bad('transaction rolls back', err.message); failures += 1; }
  }

  await db.pool.end();
  console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n');
  process.exit(failures ? 1 : 0);
})();
