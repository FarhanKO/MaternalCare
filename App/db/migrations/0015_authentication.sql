-- Real accounts, replacing "the first mother by id".
--
-- Until now `userModel.current()` ran `SELECT * FROM users WHERE role='mother'
-- ORDER BY id LIMIT 1`. Every request was that woman, the clinician portal was
-- reachable by anyone who typed /doctor, and GET /api/patients/2 handed a
-- patient record to whoever asked. That is fine for a demo and disqualifying
-- for anything else, and it was the first item on the production checklist.
--
-- Passwords are scrypt, which ships with Node and needs no native dependency.
-- Parameters are OWASP's recommended minimum (N=2^17, r=8, p=1), which costs
-- about 200 ms per verification on this machine — slow enough to make a stolen
-- table expensive to attack, fast enough that nobody notices signing in.
--
-- The stored format is self-describing:
--     scrypt$N$r$p$<salt base64>$<hash base64>
-- so the cost can be raised later without stranding the accounts hashed at the
-- old parameters. Nothing here ever stores or logs a password.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Email is the login handle, so it has to be unique and is matched
-- case-insensitively. Partial, because the seeded clinicians predate this and
-- some rows have no address.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
  ON users (lower(email)) WHERE email IS NOT NULL;

/*
 * Server-side sessions rather than a stateless token.
 *
 * A JWT cannot be revoked before it expires; a row can. For medical records
 * the ability to end a session immediately — a lost phone, a shared computer
 * in a clinic — is worth more than saving a lookup per request.
 */
CREATE TABLE IF NOT EXISTS sessions (
  -- the random value that lives in the cookie; not sequential, so one session
  -- id can never be guessed from another
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- rough provenance, so a user can be shown where they are signed in
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);
