-- TestVersion is the immutable content boundary. Once published (or retired),
-- delivery/scoring descendants cannot be changed in place.
CREATE OR REPLACE FUNCTION app_private.prevent_published_content_descendant_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app_private
AS $$
DECLARE
  old_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  new_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  protected boolean := false;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'TestSection' THEN
      SELECT EXISTS (
        SELECT 1 FROM app_private."TestVersion" version
        WHERE version.id = ANY (ARRAY[
          NULLIF(old_row->>'testVersionId', '')::uuid,
          NULLIF(new_row->>'testVersionId', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
      ) INTO protected;
    WHEN 'TestPart' THEN
      SELECT EXISTS (
        SELECT 1 FROM app_private."TestSection" section
        JOIN app_private."TestVersion" version ON version.id = section."testVersionId"
        WHERE section.id = ANY (ARRAY[
          NULLIF(old_row->>'testSectionId', '')::uuid,
          NULLIF(new_row->>'testSectionId', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
      ) INTO protected;
    WHEN 'Stimulus', 'QuestionGroup' THEN
      SELECT EXISTS (
        SELECT 1 FROM app_private."TestPart" part
        JOIN app_private."TestSection" section ON section.id = part."testSectionId"
        JOIN app_private."TestVersion" version ON version.id = section."testVersionId"
        WHERE part.id = ANY (ARRAY[
          NULLIF(old_row->>'testPartId', '')::uuid,
          NULLIF(new_row->>'testPartId', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
      ) INTO protected;
    WHEN 'Question', 'AnswerKey', 'QuestionAsset' THEN
      SELECT EXISTS (
        SELECT 1 FROM app_private."QuestionGroup" question_group
        JOIN app_private."TestPart" part ON part.id = question_group."testPartId"
        JOIN app_private."TestSection" section ON section.id = part."testSectionId"
        JOIN app_private."TestVersion" version ON version.id = section."testVersionId"
        WHERE question_group.id = ANY (ARRAY[
          NULLIF(old_row->>'questionGroupId', '')::uuid,
          NULLIF(new_row->>'questionGroupId', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
      ) INTO protected;
    WHEN 'ContentAsset' THEN
      SELECT EXISTS (
        SELECT 1
        FROM app_private."Stimulus" stimulus
        JOIN app_private."TestPart" part ON part.id = stimulus."testPartId"
        JOIN app_private."TestSection" section ON section.id = part."testSectionId"
        JOIN app_private."TestVersion" version ON version.id = section."testVersionId"
        WHERE stimulus."assetId" = ANY (ARRAY[
          NULLIF(old_row->>'id', '')::uuid,
          NULLIF(new_row->>'id', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
        UNION ALL
        SELECT 1
        FROM app_private."QuestionAsset" link
        JOIN app_private."QuestionGroup" question_group ON question_group.id = link."questionGroupId"
        JOIN app_private."TestPart" part ON part.id = question_group."testPartId"
        JOIN app_private."TestSection" section ON section.id = part."testSectionId"
        JOIN app_private."TestVersion" version ON version.id = section."testVersionId"
        WHERE link."assetId" = ANY (ARRAY[
          NULLIF(old_row->>'id', '')::uuid,
          NULLIF(new_row->>'id', '')::uuid
        ]) AND version.status IN ('PUBLISHED', 'RETIRED')
      ) INTO protected;
  END CASE;

  IF protected THEN
    RAISE EXCEPTION 'published test content is immutable; create a new TestVersion'
      USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'TestSection', 'TestPart', 'Stimulus', 'QuestionGroup', 'Question',
    'AnswerKey', 'QuestionAsset', 'ContentAsset'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON app_private.%I '
      'FOR EACH ROW EXECUTE FUNCTION app_private.prevent_published_content_descendant_mutation()',
      table_name || '_published_content_immutable', table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.prevent_published_test_variant_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app_private
AS $$
BEGIN
  IF NEW.variant IS DISTINCT FROM OLD.variant AND EXISTS (
    SELECT 1 FROM app_private."TestVersion" version
    WHERE version."testId" = OLD.id AND version.status IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'variant of a published test is immutable; create a new TestVersion'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Test_published_variant_immutable"
BEFORE UPDATE OF variant ON app_private."Test"
FOR EACH ROW
EXECUTE FUNCTION app_private.prevent_published_test_variant_mutation();
