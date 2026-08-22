-- Answer-key payloads written after this migration use the key-identified v2
-- envelope. Existing v1 ciphertext remains readable during key rotation.
-- AnswerKey.formatVersion versions the decrypted JSON payload schema. It is
-- independent from the v2 ciphertext envelope and remains version 1.
ALTER TABLE app_private."AnswerKey"
  ALTER COLUMN "formatVersion" SET DEFAULT 1;

-- Published content versions are immutable provenance boundaries. A correction
-- is a new TestVersion. Retirement is the only permitted post-publication edit.
CREATE OR REPLACE FUNCTION app_private.prevent_published_test_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app_private
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'published test versions cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'RETIRED' THEN
    RAISE EXCEPTION 'retired test versions are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED' THEN
    IF NEW.status <> 'RETIRED'
      OR NEW."retiredAt" IS NULL
      OR (to_jsonb(NEW) - ARRAY['status', 'retiredAt', 'updatedAt'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['status', 'retiredAt', 'updatedAt'])
    THEN
      RAISE EXCEPTION 'published test versions are immutable; create a new version'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "TestVersion_published_immutable"
BEFORE UPDATE OR DELETE ON app_private."TestVersion"
FOR EACH ROW
EXECUTE FUNCTION app_private.prevent_published_test_version_mutation();
