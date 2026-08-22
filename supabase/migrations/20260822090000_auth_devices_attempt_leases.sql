CREATE TABLE app_private."DeviceSlot" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "slotNumber" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  label TEXT,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "lastReplacedAt" TIMESTAMP(3),
  "replacementCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceSlot_pkey" PRIMARY KEY (id),
  CONSTRAINT "DeviceSlot_slot_valid" CHECK ("slotNumber" IN (1, 2)),
  CONSTRAINT "DeviceSlot_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES app_private."User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DeviceSlot_userId_slotNumber_key"
  ON app_private."DeviceSlot"("userId", "slotNumber");
CREATE UNIQUE INDEX "DeviceSlot_userId_tokenHash_key"
  ON app_private."DeviceSlot"("userId", "tokenHash");
CREATE INDEX "DeviceSlot_userId_revokedAt_lastSeenAt_idx"
  ON app_private."DeviceSlot"("userId", "revokedAt", "lastSeenAt");

CREATE TYPE app_private."AttemptMode" AS ENUM ('STRICT', 'PRACTICE');

ALTER TABLE app_private."Test"
  ADD COLUMN "isPublicDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Test_isPublicDemo_idx"
  ON app_private."Test"("isPublicDemo");

UPDATE app_private."Test"
SET "isPublicDemo" = true
WHERE id = '6c8deaf0-1466-4316-9980-dff010000516'::uuid;

ALTER TABLE app_private."TestBlueprint"
  ADD COLUMN "fixedTestVersionId" UUID,
  ADD CONSTRAINT "TestBlueprint_fixedTestVersionId_fkey"
    FOREIGN KEY ("fixedTestVersionId")
    REFERENCES app_private."TestVersion"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TestBlueprint_fixedTestVersionId_idx"
  ON app_private."TestBlueprint"("fixedTestVersionId");

CREATE OR REPLACE FUNCTION app_private.protect_published_blueprint()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.status = 'PUBLISHED' THEN
    IF NOT EXISTS (
      SELECT 1 FROM app_private."BlueprintSlot" WHERE "blueprintId" = NEW.id
    ) THEN
      RAISE EXCEPTION 'a published blueprint requires at least one slot';
    END IF;
    IF NEW."fixedTestVersionId" IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM app_private."TestVersion" AS version
      JOIN app_private."Test" AS test ON test.id = version."testId"
      WHERE version.id = NEW."fixedTestVersionId"
        AND version.status = 'PUBLISHED'
        AND (test.variant = NEW.variant OR test.variant = 'UNIVERSAL')
    ) THEN
      RAISE EXCEPTION 'fixed blueprint content must be published and variant-compatible';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'published blueprints are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('PUBLISHED', 'RETIRED') THEN
    IF NOT (
      OLD.status = 'PUBLISHED'
      AND NEW.status = 'RETIRED'
      AND NEW.id = OLD.id
      AND NEW.code = OLD.code
      AND NEW.version = OLD.version
      AND NEW.name = OLD.name
      AND NEW.variant = OLD.variant
      AND NEW."defaultMinimumSourceYear" IS NOT DISTINCT FROM OLD."defaultMinimumSourceYear"
      AND NEW."allowArchiveByDefault" = OLD."allowArchiveByDefault"
      AND NEW."fixedTestVersionId" IS NOT DISTINCT FROM OLD."fixedTestVersionId"
      AND NEW."createdAt" = OLD."createdAt"
      AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
    ) THEN
      RAISE EXCEPTION 'published blueprints are immutable';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "TestBlueprint_published_immutable"
BEFORE UPDATE OR DELETE ON app_private."TestBlueprint"
FOR EACH ROW EXECUTE FUNCTION app_private.protect_published_blueprint();

CREATE OR REPLACE FUNCTION app_private.protect_published_blueprint_slot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owning_blueprint UUID;
BEGIN
  owning_blueprint := CASE WHEN TG_OP = 'DELETE' THEN OLD."blueprintId" ELSE NEW."blueprintId" END;
  IF EXISTS (
    SELECT 1 FROM app_private."TestBlueprint"
    WHERE id = owning_blueprint AND status IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'published blueprint slots are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "BlueprintSlot_published_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON app_private."BlueprintSlot"
FOR EACH ROW EXECUTE FUNCTION app_private.protect_published_blueprint_slot();

ALTER TABLE app_private."AssessmentAttempt"
  ADD COLUMN mode app_private."AttemptMode" NOT NULL DEFAULT 'STRICT';

ALTER TABLE app_private."AttemptSkillScore"
  ALTER COLUMN band DROP NOT NULL;

CREATE TABLE app_private."AttemptExecutionLease" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "deviceSlotId" UUID NOT NULL,
  "leaseTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttemptExecutionLease_pkey" PRIMARY KEY (id),
  CONSTRAINT "AttemptExecutionLease_time_valid" CHECK ("expiresAt" > "heartbeatAt"),
  CONSTRAINT "AttemptExecutionLease_attemptId_fkey" FOREIGN KEY ("attemptId")
    REFERENCES app_private."AssessmentAttempt"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttemptExecutionLease_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES app_private."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttemptExecutionLease_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId")
    REFERENCES app_private."DeviceSlot"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AttemptExecutionLease_attemptId_key"
  ON app_private."AttemptExecutionLease"("attemptId");
CREATE UNIQUE INDEX "AttemptExecutionLease_leaseTokenHash_key"
  ON app_private."AttemptExecutionLease"("leaseTokenHash");
CREATE INDEX "AttemptExecutionLease_userId_expiresAt_idx"
  ON app_private."AttemptExecutionLease"("userId", "expiresAt");
CREATE INDEX "AttemptExecutionLease_deviceSlotId_expiresAt_idx"
  ON app_private."AttemptExecutionLease"("deviceSlotId", "expiresAt");

CREATE OR REPLACE FUNCTION app_private.reject_attempt_manifest_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'attempt manifests and attempt questions are immutable';
END;
$$;

CREATE TRIGGER "AttemptManifest_immutable"
BEFORE UPDATE OR DELETE ON app_private."AttemptManifest"
FOR EACH ROW EXECUTE FUNCTION app_private.reject_attempt_manifest_mutation();

CREATE TRIGGER "AttemptQuestion_immutable"
BEFORE UPDATE OR DELETE ON app_private."AttemptQuestion"
FOR EACH ROW EXECUTE FUNCTION app_private.reject_attempt_manifest_mutation();
