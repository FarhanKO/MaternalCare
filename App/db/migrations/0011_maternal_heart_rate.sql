-- Maternal pulse.
--
-- Added because the risk model asks for it. The UCI dataset the classifier is
-- trained on carries six features and this app collected five, so every
-- prediction was being made with the dataset median standing in for the sixth.
-- That works — the service says when it has imputed a value — but a number
-- that is genuinely measured is worth more than one that is assumed, and a
-- pulse is the easiest of the six for a mother to take herself.
--
-- Deliberately not confused with `fetal_bpm`, which is already on this table
-- and is the baby's heartbeat. Ranges do not overlap much (a mother at rest is
-- 60-100, a fetus is 110-160) but a column named `bpm` would have been read
-- wrong eventually.

ALTER TABLE vitals ADD COLUMN IF NOT EXISTS heart_bpm INTEGER
  CHECK (heart_bpm IS NULL OR heart_bpm BETWEEN 30 AND 220);
