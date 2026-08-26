-- Doctors register themselves, so the doctors table has to hold what a
-- registering clinician gives us: how to reach them, and the licence that
-- lets them practise. Until now every row arrived from the seed file, so
-- there was nowhere to put any of it.
--
-- The unique indexes are partial because the seeded roster predates
-- registration and has no licence or work address to be unique about.

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email         TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone         TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_no    TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- one clinician per licence, one per work address
CREATE UNIQUE INDEX IF NOT EXISTS doctors_license_key
  ON doctors (lower(license_no))
  WHERE license_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_key
  ON doctors (lower(email))
  WHERE email IS NOT NULL;
