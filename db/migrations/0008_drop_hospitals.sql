-- Hospitals leave the building.
--
-- The doctors table carried a `hospital` name and the app kept a `hospitals`
-- table of its own — real institutions (Square, Popular Diagnostic) that this
-- platform has no relationship with, listed with placeholder phone numbers
-- against an emergency screen. Naming them implied an affiliation that does
-- not exist, and no directory this app could keep would stay accurate enough
-- to be leaned on in an emergency. A clinician here is reachable through this
-- platform; that is the whole of what we can honestly say about where they are.
--
-- `distance_km` goes with it. Consultations are held by video and the service
-- is online-only, so there is no journey to measure — and it could not have
-- survived registration anyway: a doctor signing up cannot state how far they
-- are from a mother who has not signed up yet, so ranking on it would push
-- every real registration below the seeded rows for a reason that was never
-- real.
--
-- Destructive, and separated from 0007 for that reason: nothing in the
-- application reads either column once 0007 is in, so this can be run
-- whenever you are ready to lose the data.

ALTER TABLE doctors DROP COLUMN IF EXISTS hospital;
ALTER TABLE doctors DROP COLUMN IF EXISTS distance_km;

DROP TABLE IF EXISTS hospitals;
