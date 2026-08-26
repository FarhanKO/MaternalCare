/**
 * Auth Model — password hashing and server-side sessions.
 *
 * Replaces the demo shim in `userModel.current()`, which returned the first
 * mother by id: every request was that woman, /doctor was reachable by anyone
 * who typed it, and GET /api/patients/2 handed a patient record to a stranger.
 *
 * Hashing is scrypt from Node's own crypto, at OWASP's recommended minimum
 * (N=2^17, r=8, p=1). No native dependency, no build step, and about 200 ms per
 * verification — slow enough that a stolen table is expensive to attack, fast
 * enough that nobody notices signing in.
 *
 * Nothing in this file stores, returns or logs a password. `verify` takes one
 * and gives back a boolean; the plaintext never leaves the function.
 */
const {
  randomBytes, scrypt, timingSafeEqual, createHash,
} = require('crypto');
const { promisify } = require('util');
const db = require('../config/db');

const scryptAsync = promisify(scrypt);

/**
 * Cost parameters, written into every hash so they can be raised later without
 * stranding accounts created at the old cost.
 */
const PARAMS = { N: 131072, r: 8, p: 1 };
const KEY_LEN = 64;
/* scrypt needs roughly 128*N*r bytes; Node's default cap is below that at
   these parameters, so it is stated explicitly rather than left to fail */
const maxmem = () => 256 * PARAMS.N * PARAMS.r * PARAMS.p * 2;

const SESSION_DAYS = 14;

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

module.exports = {
  AuthError,
  PARAMS,
  SESSION_DAYS,

  /** `scrypt$N$r$p$salt$hash`, all base64. Self-describing on purpose. */
  async hash(password) {
    if (typeof password !== 'string' || password.length < 8) {
      throw new AuthError('A password needs to be at least 8 characters', 'WEAK');
    }
    if (password.length > 200) {
      // scrypt cost is independent of input length, but an unbounded body is
      // still a way to make the server do unbounded work
      throw new AuthError('That password is too long', 'TOO_LONG');
    }
    const salt = randomBytes(16);
    const key = await scryptAsync(password, salt, KEY_LEN, { ...PARAMS, maxmem: maxmem() });
    return [
      'scrypt', PARAMS.N, PARAMS.r, PARAMS.p,
      salt.toString('base64'), key.toString('base64'),
    ].join('$');
  },

  /**
   * Check a password against a stored hash.
   *
   * Compared with `timingSafeEqual`, so the time taken cannot tell an attacker
   * how many leading bytes they guessed correctly.
   */
  async verify(password, stored) {
    if (typeof password !== 'string' || typeof stored !== 'string') return false;
    const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;

    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const opts = {
      N: Number(N), r: Number(r), p: Number(p),
      maxmem: 256 * Number(N) * Number(r) * Number(p) * 2,
    };

    let actual;
    try {
      actual = await scryptAsync(password, salt, expected.length, opts);
    } catch {
      return false;                       // unreadable hash: not a match
    }
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  },

  /**
   * Sign in.
   *
   * One message for "no such account" and "wrong password", deliberately.
   * Distinguishing them turns the login form into a way of finding out which
   * of your patients has an account here, which for a maternity service is
   * itself sensitive.
   */
  async authenticate(email, password) {
    const address = String(email || '').trim().toLowerCase();
    const user = address
      ? await db.one('SELECT * FROM users WHERE lower(email) = $1', [address])
      : null;

    /*
     * Hash even when the account does not exist, against a throwaway value.
     * Returning early would make a missing account measurably faster to
     * reject than a wrong password, which is how account lists get harvested.
     */
    const stored = user?.password_hash
      || 'scrypt$131072$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==';
    const ok = await this.verify(password, stored);

    if (!user || !user.password_hash || !ok) {
      throw new AuthError('That email and password do not match an account', 'BAD_LOGIN');
    }
    return user;
  },

  /** Start a session and return the token that belongs in the cookie. */
  async startSession(userId, userAgent) {
    const id = randomBytes(32).toString('base64url');
    await db.run(
      `INSERT INTO sessions (id, user_id, expires_at, user_agent)
       VALUES ($1, $2, now() + ($3 || ' days')::interval, $4)`,
      [id, userId, String(SESSION_DAYS), String(userAgent || '').slice(0, 300) || null],
    );
    await db.run('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
    return id;
  },

  /** The user behind a session token, or null. Expired rows never match. */
  async userForSession(token) {
    if (!token || typeof token !== 'string') return null;
    return db.one(
      `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.expires_at > now()`,
      [token],
    );
  },

  async endSession(token) {
    if (!token) return 0;
    return db.run('DELETE FROM sessions WHERE id = $1', [token]);
  },

  /** Every session for one account — used when a password changes. */
  async endAllSessions(userId) {
    return db.run('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },

  /** Housekeeping: expired rows are dead weight and a small privacy leak. */
  async purgeExpired() {
    return db.run('DELETE FROM sessions WHERE expires_at <= now()');
  },

  async setPassword(userId, password) {
    const hash = await this.hash(password);
    await db.run('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash]);
    // a password change ends every existing session, which is the whole point
    // of changing it after a device is lost
    await this.endAllSessions(userId);
    return true;
  },

  /**
   * A short, stable fingerprint of a hash, safe to log or show in a test.
   *
   * The hash itself is still secret material — it is what an offline attack
   * runs against — so anything that wants to prove "this is hashed, and these
   * two differ" gets this instead.
   */
  fingerprint(stored) {
    if (!stored) return null;
    return createHash('sha256').update(stored).digest('hex').slice(0, 12);
  },
};
