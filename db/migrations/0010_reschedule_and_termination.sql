-- Rescheduling, cancelling with a reason, and ending the care relationship.
--
-- Three gaps, and they are different sizes.
--
-- Rescheduling did not exist at all. A mother whose Tuesday no longer worked
-- had one move available to her: cancel, and go back to the end of the queue
-- behind everyone who had not had to change anything.
--
-- Cancelling existed but recorded nothing. `status = 'cancelled'` and no
-- reason, no author, no time. The clinician saw a slot go empty and never
-- learned why, which is the difference between "she found the cost too high"
-- and "she went into labour".
--
-- Ending the relationship did not exist either. A mother could stop booking
-- and a doctor could stop accepting, but neither could say so, and each stayed
-- on the other's list indefinitely. That is the one that needed a reason most:
-- a clinician who is being left because their replies take three days should
-- be told that, and a mother being let go deserves to know it was capacity and
-- not something she did.

/* ------------------------------------------------- cancellation, on the row */
-- On the appointment itself because it can only happen once, unlike a
-- reschedule.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by   TEXT
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('mother', 'doctor'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_note    TEXT;

/* --------------------------------------------------- reschedules, as history */
-- A row per move rather than columns on the appointment: an appointment can be
-- moved more than once, and "moved twice already" is exactly the thing a
-- clinic wants to see.
CREATE TABLE IF NOT EXISTS appointment_changes (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  moved_by       TEXT    NOT NULL CHECK (moved_by IN ('mother', 'doctor')),
  from_date      DATE    NOT NULL,
  from_time      TEXT,
  to_date        DATE    NOT NULL,
  to_time        TEXT,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_changes_appt_idx
  ON appointment_changes (appointment_id, created_at);

/* ------------------------------------------------------ ending the relationship */
CREATE TABLE IF NOT EXISTS care_terminations (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  doctor_id  INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,

  ended_by   TEXT NOT NULL CHECK (ended_by IN ('mother', 'doctor')),
  -- the category she picked; the vocabularies differ by side, and the model
  -- is what enforces which codes belong to which
  reason     TEXT NOT NULL,
  -- what she typed. Optional, because requiring an essay to leave is a way of
  -- making people not leave.
  note       TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- set when the pair start again, so the record of the ending survives it
  resumed_at TIMESTAMPTZ
);

-- Only one live ending per pair. Booking again resumes the old one rather than
-- stacking a second.
CREATE UNIQUE INDEX IF NOT EXISTS care_terminations_active_key
  ON care_terminations (user_id, doctor_id)
  WHERE resumed_at IS NULL;

CREATE INDEX IF NOT EXISTS care_terminations_doctor_idx
  ON care_terminations (doctor_id, created_at DESC);
