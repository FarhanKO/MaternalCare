-- Vaccination schedules belong to somebody.
--
-- The table had no owner column at all: one global list of doses that every
-- account read and wrote. With a single seeded mother that is invisible, and
-- it is why it survived — but it means F7's "personalized vaccination
-- scheduler" was not personalised, and marking a dose done marked it done for
-- every user of the platform at once.
--
-- Backfilled to the first mother, who is the only account that has been
-- marking them; a fresh database seeds them per user.

ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS user_id  INTEGER
  REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS child_id INTEGER
  REFERENCES children(id) ON DELETE CASCADE;

UPDATE vaccinations SET user_id = (
  SELECT id FROM users WHERE role = 'mother' ORDER BY id LIMIT 1
) WHERE user_id IS NULL;

UPDATE vaccinations v SET child_id = (
  SELECT c.id FROM children c WHERE c.user_id = v.user_id ORDER BY c.id LIMIT 1
) WHERE v.subject = 'child' AND v.child_id IS NULL;

CREATE INDEX IF NOT EXISTS vaccinations_user_idx ON vaccinations (user_id, due_date);
