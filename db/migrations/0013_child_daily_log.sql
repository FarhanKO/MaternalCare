-- What a parent notices about their child, day by day.
--
-- The daily check-in has only ever asked a woman about herself: mood, kicks,
-- water, sleep. That is the right set of questions while she is pregnant and
-- the wrong one afterwards — a mother of a four-month-old is not counting
-- kicks, she is counting feeds and wet nappies, and those are the numbers a
-- paediatrician asks for first when something is wrong.
--
-- One row per child per day, same shape as daily_logs, so the two can be
-- charted side by side and answered in one sitting.
--
-- Deliberately few fields. Every one of these is something a parent already
-- knows without measuring: how many times the baby fed, how many wet nappies,
-- roughly how long they slept, and how they seemed. Temperature is here
-- because it is the one number that turns a quiet worry into a phone call,
-- and it is the only one that needs a thermometer.

CREATE TABLE IF NOT EXISTS child_logs (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  child_id     INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date         DATE    NOT NULL,

  feeds        INTEGER CHECK (feeds IS NULL OR feeds BETWEEN 0 AND 30),
  wet_nappies  INTEGER CHECK (wet_nappies IS NULL OR wet_nappies BETWEEN 0 AND 30),
  sleep_hours  REAL    CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24),
  temp_c       REAL    CHECK (temp_c IS NULL OR temp_c BETWEEN 30 AND 45),

  mood         TEXT    CHECK (mood IS NULL OR mood IN
                        ('Content', 'Fussy', 'Sleepy', 'Playful', 'Unsettled')),
  note         TEXT,

  UNIQUE (child_id, date)
);

CREATE INDEX IF NOT EXISTS child_logs_recent_idx ON child_logs (child_id, date DESC);
