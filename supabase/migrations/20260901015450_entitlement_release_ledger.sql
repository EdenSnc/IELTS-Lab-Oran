DROP INDEX app_private."EntitlementConsumption_attemptId_key";
CREATE UNIQUE INDEX "EntitlementConsumption_attemptId_kind_key"
  ON app_private."EntitlementConsumption" ("attemptId", kind);

ALTER TABLE app_private."EntitlementConsumption"
  DROP CONSTRAINT "EntitlementConsumption_shape_check",
  ADD CONSTRAINT "EntitlementConsumption_shape_check" CHECK (
    (kind = 'RESERVATION' AND "attemptId" IS NOT NULL AND "reversalOfId" IS NULL)
    OR (kind = 'RELEASE' AND "attemptId" IS NOT NULL AND "reversalOfId" IS NOT NULL)
    OR (kind = 'REVERSAL' AND "attemptId" IS NULL AND "reversalOfId" IS NOT NULL)
    OR (kind = 'ADJUSTMENT' AND "attemptId" IS NULL AND "reversalOfId" IS NULL)
  );

CREATE OR REPLACE FUNCTION app_private.validate_entitlement_consumption()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app_private
AS $$
DECLARE
  source_entitlement UUID;
  source_attempt UUID;
  source_kind app_private."EntitlementConsumptionKind";
BEGIN
  IF NEW.kind = 'RESERVATION' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM app_private."AssessmentAttempt" attempt
      WHERE attempt.id = NEW."attemptId"
        AND attempt."entitlementId" = NEW."entitlementId"
    ) THEN
      RAISE EXCEPTION 'reservation must reference an attempt using the same entitlement';
    END IF;
  ELSIF NEW.kind = 'RELEASE' THEN
    SELECT "entitlementId", "attemptId", kind
      INTO source_entitlement, source_attempt, source_kind
    FROM app_private."EntitlementConsumption"
    WHERE id = NEW."reversalOfId";

    IF source_entitlement IS NULL
       OR source_entitlement <> NEW."entitlementId"
       OR source_attempt <> NEW."attemptId"
       OR source_kind <> 'RESERVATION' THEN
      RAISE EXCEPTION 'release must reference the reservation for the same attempt and entitlement';
    END IF;
  ELSIF NEW.kind = 'REVERSAL' THEN
    SELECT "entitlementId", kind
      INTO source_entitlement, source_kind
    FROM app_private."EntitlementConsumption"
    WHERE id = NEW."reversalOfId";

    IF source_entitlement IS NULL
       OR source_entitlement <> NEW."entitlementId"
       OR source_kind IN ('REVERSAL', 'RELEASE') THEN
      RAISE EXCEPTION 'reversal must reference a non-reversal entry for the same entitlement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX "AssessmentAttempt_one_draft_per_entitlement_blueprint_key"
  ON app_private."AssessmentAttempt" ("entitlementId", "blueprintId")
  WHERE state = 'DRAFT' AND "entitlementId" IS NOT NULL;
