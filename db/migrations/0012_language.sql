-- Which language she reads the app in.
--
-- Stored on the account rather than only in the browser because it has to
-- follow her: the same woman opening this on a borrowed phone, or on the
-- Guardian app her husband installed, should not land back in English. It
-- also has to be available server-side, since the care plan and the risk
-- assessment are composed as sentences on the server rather than assembled
-- from keys in the client.
--
-- 'en' remains the default. Bangla is the second language because this is a
-- Bangladeshi maternal health service and reading clinical advice in a second
-- language is precisely the accessibility problem the project set out to
-- address.

ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'bn'));
