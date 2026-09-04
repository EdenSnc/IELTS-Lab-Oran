CREATE TYPE app_private."FunnelEventType" AS ENUM (
  'PRODUCT_VIEWED',
  'SIGNUP_STARTED',
  'ONBOARDING_COMPLETED',
  'CHECKOUT_CREATED',
  'ENTITLEMENT_GRANTED',
  'ATTEMPT_STARTED',
  'ATTEMPT_SUBMITTED',
  'RESULT_VIEWED'
);

CREATE TABLE app_private."AccessCode" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "codeHash" CHAR(64) NOT NULL,
  "codeHint" VARCHAR(9) NOT NULL,
  "productId" UUID NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "redeemedByUserId" UUID,
  "expiresAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessCode_pkey" PRIMARY KEY (id),
  CONSTRAINT "AccessCode_codeHash_key" UNIQUE ("codeHash"),
  CONSTRAINT "AccessCode_redemption_pair_check" CHECK (
    ("redeemedByUserId" IS NULL AND "redeemedAt" IS NULL)
    OR ("redeemedByUserId" IS NOT NULL AND "redeemedAt" IS NOT NULL)
  ),
  CONSTRAINT "AccessCode_codeHash_check" CHECK ("codeHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AccessCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES app_private."Product"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccessCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccessCode_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AccessCode_productId_redeemedAt_expiresAt_idx" ON app_private."AccessCode"("productId", "redeemedAt", "expiresAt");
CREATE INDEX "AccessCode_createdByUserId_createdAt_idx" ON app_private."AccessCode"("createdByUserId", "createdAt");
CREATE INDEX "AccessCode_redeemedByUserId_redeemedAt_idx" ON app_private."AccessCode"("redeemedByUserId", "redeemedAt");

ALTER TABLE app_private."Entitlement" ADD COLUMN "accessCodeId" UUID;
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_accessCodeId_key" UNIQUE ("accessCodeId");
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_accessCodeId_fkey"
  FOREIGN KEY ("accessCodeId") REFERENCES app_private."AccessCode"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE app_private."FunnelEvent" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  type app_private."FunnelEventType" NOT NULL,
  "idempotencyKey" TEXT,
  "userId" UUID,
  "productId" UUID,
  "orderId" UUID,
  "attemptId" UUID,
  metadata JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY (id),
  CONSTRAINT "FunnelEvent_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "FunnelEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FunnelEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES app_private."Product"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FunnelEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES app_private."Order"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FunnelEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "FunnelEvent_type_occurredAt_idx" ON app_private."FunnelEvent"(type, "occurredAt");
CREATE INDEX "FunnelEvent_userId_occurredAt_idx" ON app_private."FunnelEvent"("userId", "occurredAt");
CREATE INDEX "FunnelEvent_productId_occurredAt_idx" ON app_private."FunnelEvent"("productId", "occurredAt");
CREATE INDEX "FunnelEvent_orderId_idx" ON app_private."FunnelEvent"("orderId");
CREATE INDEX "FunnelEvent_attemptId_idx" ON app_private."FunnelEvent"("attemptId");
