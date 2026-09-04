/**
 * Gives every seeded account a password.
 *
 *   npm run db:passwords
 *
 * Run after db:seed and db:stages. Idempotent — re-running simply re-hashes.
 *
 * The passwords are printed here because they are demo credentials for a
 * database full of invented people, and somebody has to be able to sign in to
 * look at the work. They are deliberately obvious rather than plausible, so
 * nobody is tempted to reuse one, and they exist nowhere in the application
 * itself: the only stored form is a scrypt hash.
 *
 * If this project is ever pointed at a real person's data, every one of these
 * accounts has to go. That is not a style note — a known password on a
 * medical record is the whole problem.
 */
const authModel = require('../models/authModel');
const db = require('../config/db');

/** One password per role. Long enough to pass the 8-character floor, and no more real than the patients. */
const PASSWORDS = {
  mother: 'demo-mother-2026',
  clinician: 'demo-clinician-2026',
  admin: 'demo-admin-2026',
};

(async () => {
  console.log('\n  Setting demo passwords\n');

  const users = await db.sql(
    "SELECT id, name, role, email, stage FROM users WHERE email IS NOT NULL ORDER BY id",
  );

  if (!users.length) {
    console.log('  No accounts with an email address. Run db:seed first.\n');
    await db.pool.end();
    return;
  }

  for (const u of users) {
    const password = PASSWORDS[u.role] || PASSWORDS.mother;
    const hash = await authModel.hash(password);
    await db.run('UPDATE users SET password_hash = $2 WHERE id = $1', [u.id, hash]);
    console.log(
      `  ${String(u.id).padStart(3)}  ${u.name.padEnd(16)} ${(u.stage || u.role).padEnd(12)} ${u.email}`,
    );
  }

  /*
   * Every existing session is ended. Setting a password is exactly the moment
   * old sessions should stop working, and leaving them alive would mean a
   * browser that was signed in before this ran stays signed in without ever
   * having known a password.
   */
  const killed = await db.run('DELETE FROM sessions');

  console.log(`\n  ${users.length} accounts, ${killed} old session(s) ended.`);
  console.log('\n  Passwords, by role:');
  for (const [role, pw] of Object.entries(PASSWORDS)) {
    console.log(`    ${role.padEnd(10)} ${pw}`);
  }
  console.log('\n  Stored as scrypt (N=2^17, r=8, p=1). The plaintext is only here.\n');

  await db.pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
