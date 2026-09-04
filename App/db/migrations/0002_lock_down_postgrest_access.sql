-- Supabase publishes the public schema through PostgREST, reachable with the
-- anon key -- which is meant to be public and ships inside client bundles.
-- With RLS off, that key would read every patient record in this database.
--
-- This app never uses PostgREST. It connects as the table owner over `pg`,
-- and owners bypass RLS, so enabling RLS with no policies closes the REST
-- door completely while leaving the application untouched.
--
-- If a browser is ever pointed straight at Supabase, add explicit policies
-- then. Denying by default is the right starting point for health records.

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Belt and braces: take the table grants away from the PostgREST roles too,
-- so the door is shut even if RLS were later disabled on a table by mistake.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
