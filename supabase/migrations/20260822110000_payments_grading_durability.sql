CREATE TYPE app_private."EntitlementConsumptionKind" AS ENUM (
  'RESERVATION',
  'REVERSAL',
  'ADJUSTMENT'
);

ALTER TABLE app_private."GradingRun"
  ADD COLUMN "rawOutput" TEXT,
  ADD COLUMN "usageMetadata" JSONB,
  ADD COLUMN "enqueueAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastEnqueuedAt" TIMESTAMPTZ,
  ADD COLUMN "lastEnqueueError" TEXT;

ALTER TABLE app_private."GradingRun"
  ADD CONSTRAINT "GradingRun_enqueueAttempt_check"
  CHECK ("enqueueAttempt" >= 0);

ALTER TABLE app_private."PaymentAttempt"
  ADD COLUMN "liveMode" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "requestHash" TEXT;

UPDATE app_private."PaymentAttempt"
SET "requestHash" = encode(digest(id::text, 'sha256'), 'hex')
WHERE "requestHash" IS NULL;

ALTER TABLE app_private."PaymentAttempt"
  ALTER COLUMN "requestHash" SET NOT NULL,
  ADD CONSTRAINT "PaymentAttempt_amountMinor_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "PaymentAttempt_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "PaymentAttempt_requestHash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');

ALTER TABLE app_private."Order"
  ADD CONSTRAINT "Order_amountMinor_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "Order_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE app_private."Product"
  ADD CONSTRAINT "Product_priceMinor_check" CHECK ("priceMinor" > 0),
  ADD CONSTRAINT "Product_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "Product_accessDays_check" CHECK ("accessDays" IS NULL OR "accessDays" > 0),
  ADD CONSTRAINT "Product_maximumAttempts_check" CHECK ("maximumAttempts" IS NULL OR "maximumAttempts" > 0);

ALTER TABLE app_private."Entitlement"
  ADD CONSTRAINT "Entitlement_maximumAttempts_check" CHECK ("maximumAttempts" IS NULL OR "maximumAttempts" > 0),
  ADD CONSTRAINT "Entitlement_attemptsUsed_check" CHECK ("attemptsUsed" >= 0),
  ADD CONSTRAINT "Entitlement_attempt_limit_check"
    CHECK ("maximumAttempts" IS NULL OR "attemptsUsed" <= "maximumAttempts");

CREATE UNIQUE INDEX "Entitlement_orderId_key"
  ON app_private."Entitlement" ("orderId");
DROP INDEX app_private."Entitlement_orderId_idx";

CREATE TABLE app_private."EntitlementConsumption" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "entitlementId" UUID NOT NULL,
  "attemptId" UUID,
  kind app_private."EntitlementConsumptionKind" NOT NULL,
  units INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reversalOfId" UUID,
  reason TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "EntitlementConsumption_entitlementId_fkey"
    FOREIGN KEY ("entitlementId") REFERENCES app_private."Entitlement"(id) ON DELETE RESTRICT,
  CONSTRAINT "EntitlementConsumption_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON DELETE RESTRICT,
  CONSTRAINT "EntitlementConsumption_reversalOfId_fkey"
    FOREIGN KEY ("reversalOfId") REFERENCES app_private."EntitlementConsumption"(id) ON DELETE RESTRICT,
  CONSTRAINT "EntitlementConsumption_units_check" CHECK (units > 0),
  CONSTRAINT "EntitlementConsumption_shape_check" CHECK (
    (kind = 'RESERVATION' AND "attemptId" IS NOT NULL AND "reversalOfId" IS NULL)
    OR (kind = 'REVERSAL' AND "attemptId" IS NULL AND "reversalOfId" IS NOT NULL)
    OR (kind = 'ADJUSTMENT' AND "attemptId" IS NULL AND "reversalOfId" IS NULL)
  )
);

CREATE UNIQUE INDEX "EntitlementConsumption_attemptId_key"
  ON app_private."EntitlementConsumption" ("attemptId");
CREATE UNIQUE INDEX "EntitlementConsumption_idempotencyKey_key"
  ON app_private."EntitlementConsumption" ("idempotencyKey");
CREATE UNIQUE INDEX "EntitlementConsumption_reversalOfId_key"
  ON app_private."EntitlementConsumption" ("reversalOfId");
CREATE INDEX "EntitlementConsumption_entitlementId_createdAt_idx"
  ON app_private."EntitlementConsumption" ("entitlementId", "createdAt");
CREATE INDEX "EntitlementConsumption_kind_createdAt_idx"
  ON app_private."EntitlementConsumption" (kind, "createdAt");

CREATE OR REPLACE FUNCTION app_private.validate_entitlement_consumption()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app_private
AS $$
DECLARE
  source_entitlement UUID;
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
  ELSIF NEW.kind = 'REVERSAL' THEN
    SELECT "entitlementId", kind
      INTO source_entitlement, source_kind
    FROM app_private."EntitlementConsumption"
    WHERE id = NEW."reversalOfId";

    IF source_entitlement IS NULL
       OR source_entitlement <> NEW."entitlementId"
       OR source_kind = 'REVERSAL' THEN
      RAISE EXCEPTION 'reversal must reference a non-reversal entry for the same entitlement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "EntitlementConsumption_validate_insert"
BEFORE INSERT ON app_private."EntitlementConsumption"
FOR EACH ROW EXECUTE FUNCTION app_private.validate_entitlement_consumption();

CREATE OR REPLACE FUNCTION app_private.reject_entitlement_consumption_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'entitlement consumption ledger is immutable';
END;
$$;

CREATE TRIGGER "EntitlementConsumption_reject_update_delete"
BEFORE UPDATE OR DELETE ON app_private."EntitlementConsumption"
FOR EACH ROW EXECUTE FUNCTION app_private.reject_entitlement_consumption_mutation();

INSERT INTO app_private."RubricVersion" (
  id, code, version, skill, variant, status, "publishedAt"
) VALUES (
  'a81b5dc4-22d0-4a84-a00f-202308000001',
  'IELTS_WRITING_PUBLIC_2023',
  1,
  'WRITING',
  NULL,
  'PUBLISHED',
  '2023-05-01T00:00:00Z'
) ON CONFLICT (code, version) DO NOTHING;

INSERT INTO app_private."RubricCriterion" (
  id, "rubricVersionId", code, name, weight, "displayOrder", description
) VALUES
  ('a81b5dc4-22d0-4a84-a00f-202308000011', 'a81b5dc4-22d0-4a84-a00f-202308000001', 'TASK_ACHIEVEMENT_OR_RESPONSE', 'Task Achievement or Task Response', 0.2500, 1, 'Task fulfilment, position, relevance, development, and support.'),
  ('a81b5dc4-22d0-4a84-a00f-202308000012', 'a81b5dc4-22d0-4a84-a00f-202308000001', 'COHERENCE_AND_COHESION', 'Coherence and Cohesion', 0.2500, 2, 'Logical progression, organisation, paragraphing, referencing, and cohesive devices.'),
  ('a81b5dc4-22d0-4a84-a00f-202308000013', 'a81b5dc4-22d0-4a84-a00f-202308000001', 'LEXICAL_RESOURCE', 'Lexical Resource', 0.2500, 3, 'Range, precision, appropriacy, collocation, spelling, and word formation.'),
  ('a81b5dc4-22d0-4a84-a00f-202308000014', 'a81b5dc4-22d0-4a84-a00f-202308000001', 'GRAMMATICAL_RANGE_AND_ACCURACY', 'Grammatical Range and Accuracy', 0.2500, 4, 'Range, flexibility, control, punctuation, and error impact.')
ON CONFLICT ("rubricVersionId", code) DO NOTHING;
