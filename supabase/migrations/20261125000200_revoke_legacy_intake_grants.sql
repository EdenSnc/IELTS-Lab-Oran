-- These legacy public tables are outside the current application's data path.
-- Keep the tables and their records while revoking public API privileges.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Inquiry', 'LeadMagnetDownload', 'Prospect', 'SalesNote']
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END IF;
  END LOOP;
END
$$;
