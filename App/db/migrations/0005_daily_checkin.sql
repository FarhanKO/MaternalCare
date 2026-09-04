-- The two metrics the daily check-in asks for that had nowhere to go.
--
-- The mother's dashboard drew four trend charts. Two of them — blood pressure
-- and weight — came from the vitals table and were real. The other two, sleep
-- and fetal heart rate, were hardcoded arrays flying a "sample" tag, because
-- no column existed behind them. These are those columns.
--
-- sleep_hours joins mood, kicks and water on daily_logs: it is something she
-- reports once for a whole day, upserted on the same (user_id, date) row.
--
-- fetal_bpm joins the clinical measurements on vitals: it is a reading taken
-- at a moment, so several in one day are legitimate and each gets a row.

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS sleep_hours REAL;

DO $$
BEGIN
  ALTER TABLE daily_logs
    ADD CONSTRAINT daily_logs_sleep_check
    CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE vitals
  ADD COLUMN IF NOT EXISTS fetal_bpm INTEGER;

DO $$
BEGIN
  ALTER TABLE vitals
    ADD CONSTRAINT vitals_fetal_bpm_check
    CHECK (fetal_bpm IS NULL OR (fetal_bpm BETWEEN 60 AND 240));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
