-- Keep registration and clinician access tied to real account identities.
-- Admin remains a schema role, but is intentionally not seeded or exposed yet.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id INTEGER
  REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_user_key ON doctors (user_id)
  WHERE user_id IS NOT NULL;

-- The old hospitals table is deprecated, but is left intact during upgrade so
-- this migration never destroys existing data. Fresh resets do not create it.

INSERT INTO users (name, role, email, stage)
SELECT 'Dr. Lena Ortiz', 'clinician', 'lena.ortiz@demo.maternalcare.app', 'general'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE lower(email) = 'lena.ortiz@demo.maternalcare.app'
);

UPDATE doctors
SET user_id = u.id
FROM users u
WHERE lower(doctors.email) = lower(u.email)
  AND u.role = 'clinician'
  AND doctors.user_id IS NULL;
