-- Attach a filed document to the vaccination it evidences.
--
-- Cards could always be uploaded, but only into the general document store —
-- so a photograph of an immunisation card sat beside prescriptions and scan
-- results with nothing saying which dose it proved. A clinician checking
-- whether the 14-week pentavalent had actually been given had to read every
-- document to find out.
--
-- Nullable, because most documents are not vaccination cards and never will
-- be. ON DELETE SET NULL rather than CASCADE: if a vaccination row is ever
-- removed the card is still the patient's own record and must survive.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS vaccination_id INTEGER;

DO $$
BEGIN
  ALTER TABLE documents
    ADD CONSTRAINT documents_vaccination_fk
    FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- "what is attached to this dose" is asked once per dose on the vaccination
-- screen, so it gets its own index rather than scanning the document table
CREATE INDEX IF NOT EXISTS documents_vaccination_idx
  ON documents (vaccination_id)
  WHERE vaccination_id IS NOT NULL;
