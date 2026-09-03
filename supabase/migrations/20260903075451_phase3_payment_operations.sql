CREATE TABLE app_private."PaymentWebhookFailure" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" app_private."PaymentProvider" NOT NULL DEFAULT 'CHARGILY',
  "providerEventId" TEXT,
  "errorCode" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentWebhookFailure_provider_errorCode_receivedAt_idx"
  ON app_private."PaymentWebhookFailure"("provider", "errorCode", "receivedAt");
CREATE INDEX "PaymentWebhookFailure_providerEventId_idx"
  ON app_private."PaymentWebhookFailure"("providerEventId");

CREATE TABLE app_private."StaffActionAudit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffActionAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffActionAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES app_private."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StaffActionAudit_actorUserId_createdAt_idx"
  ON app_private."StaffActionAudit"("actorUserId", "createdAt");
CREATE INDEX "StaffActionAudit_targetType_targetId_createdAt_idx"
  ON app_private."StaffActionAudit"("targetType", "targetId", "createdAt");
