-- Paid appointments.
--
-- A mother can now buy a slot outright from the "Appoint a doctor" page
-- instead of requesting one and waiting for the clinician to accept. These
-- four columns record what was paid and how; they stay NULL on every
-- appointment that came through the request flow.
--
-- No payment gateway is connected. payment_ref is a reference the clinic can
-- quote back, not a gateway transaction id, and no card details are stored
-- here or anywhere else.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS fee_bdt        INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref    TEXT,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE appointments
    ADD CONSTRAINT appointments_payment_method_check
    CHECK (payment_method IN ('bkash', 'nagad', 'card'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Finding a mother's receipts should not scan the table.
CREATE INDEX IF NOT EXISTS appointments_paid_idx
  ON appointments (user_id, paid_at DESC)
  WHERE paid_at IS NOT NULL;
