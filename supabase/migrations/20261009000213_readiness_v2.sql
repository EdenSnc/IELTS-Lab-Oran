-- Extend the existing diagnostic domain; do not change commercial attempts.
ALTER TABLE app_private."DiagnosticInvitation" ADD COLUMN cohort TEXT;
ALTER TABLE app_private."DiagnosticSession" ADD COLUMN readiness JSONB;
ALTER TABLE app_private."DiagnosticAssessment" ADD COLUMN readiness JSONB;
DO $$
DECLARE old_name TEXT; matches INTEGER;
BEGIN
  SELECT count(*), min(conname) INTO matches, old_name
  FROM pg_constraint WHERE conrelid='app_private."DiagnosticSession"'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%deadline%startedAt%interval%';
  IF matches <> 1 THEN RAISE EXCEPTION 'Expected exactly one legacy diagnostic deadline constraint, found %', matches; END IF;
  EXECUTE format('ALTER TABLE app_private."DiagnosticSession" DROP CONSTRAINT %I',old_name);
END $$;
ALTER TABLE app_private."DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_profile_deadline_check" CHECK (
  (readiness IS NULL AND deadline="startedAt" + interval '1 hour')
  OR (readiness IS NOT NULL AND readiness->'intake' IS NOT NULL
    AND manifest->>'profile'='IELTSLAB_READINESS_V2'
    AND deadline>="startedAt" AND deadline<="startedAt" + interval '51 minutes')
);
ALTER TABLE app_private."DiagnosticInvitation" ADD CONSTRAINT "DiagnosticInvitation_cohort_check"
  CHECK (cohort IS NULL OR (char_length(cohort) BETWEEN 1 AND 80 AND cohort ~ '^[A-Za-z0-9_-]+$'));
-- Existing RLS/revocations remain in force; there is no browser/Data API grant.
