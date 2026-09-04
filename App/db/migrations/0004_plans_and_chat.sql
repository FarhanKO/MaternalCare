-- Consultation plans, and what a chat thread can carry.
--
-- Two things a booking now decides: whether she bought a single visit or a
-- visit plus a month of chat access, and when that month runs out. chat_until
-- is a date rather than a flag so the entitlement expires on its own.
--
-- Messages grow a kind and an attachment. Until now every row was plain text
-- from one side to the other; a thread now also carries photographs, a request
-- for a call, and the meeting link the clinician answers it with.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS plan       TEXT,
  ADD COLUMN IF NOT EXISTS chat_until DATE;

DO $$
BEGIN
  ALTER TABLE appointments
    ADD CONSTRAINT appointments_plan_check
    CHECK (plan IS NULL OR plan IN ('visit', 'visit-plus-chat'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind      TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime      TEXT;

DO $$
BEGIN
  ALTER TABLE messages
    ADD CONSTRAINT messages_kind_check
    CHECK (kind IN ('text', 'image', 'call-request', 'call-link'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- "is her chat still live with this clinician" is asked on every message send
CREATE INDEX IF NOT EXISTS appointments_chat_idx
  ON appointments (user_id, doctor_id, chat_until)
  WHERE chat_until IS NOT NULL;
