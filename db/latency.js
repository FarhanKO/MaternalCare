/**
 * Measures steady-state round-trip time to the database.
 *
 * Matters because the Model layer currently issues one query per thing it
 * needs. On SQLite that cost nothing; against a database in Sydney every
 * query is a network round trip, and the clinician caseload alone makes
 * about thirty of them.
 */
const db = require('../config/db');

(async () => {
  // warm the pool so the TLS handshake is not counted
  await db.one('SELECT 1 AS x');

  const times = [];
  for (let i = 0; i < 12; i += 1) {
    const t0 = Date.now();
    await db.one('SELECT 1 AS x');
    times.push(Date.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];

  console.log(`\n  per query   min ${times[0]} ms · median ${median} ms · max ${times[times.length - 1]} ms`);
  console.log(`  30 queries in sequence  ≈ ${(median * 30 / 1000).toFixed(1)} s`);
  console.log(`  1 joined query          ≈ ${(median / 1000).toFixed(2)} s\n`);

  await db.pool.end();
})();
