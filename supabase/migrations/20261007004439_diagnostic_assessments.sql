-- Standalone assessment/provenance; ordinary mock grading and scores are untouched.
CREATE TABLE app_private."DiagnosticWritingRun" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES app_private."DiagnosticSession"(id) ON DELETE CASCADE,
  "manifestHash" CHAR(64) NOT NULL CHECK ("manifestHash" ~ '^[a-f0-9]{64}$'),
  "inputHash" CHAR(64) NOT NULL CHECK ("inputHash" ~ '^[a-f0-9]{64}$'),
  "promptVersion" TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  feedback JSONB, model TEXT, usage JSONB, "errorCode" TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "leaseOwner" UUID, "leaseExpiresAt" TIMESTAMP(3), "lastEnqueuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  UNIQUE(id,"sessionId"), UNIQUE("sessionId","inputHash","promptVersion"),
  CHECK ((state = 'RUNNING') = ("leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)),
  CHECK (state <> 'SUCCEEDED' OR (feedback IS NOT NULL AND model IS NOT NULL AND "completedAt" IS NOT NULL))
);
CREATE INDEX "DiagnosticWritingRun_recovery_idx" ON app_private."DiagnosticWritingRun"(state,"leaseExpiresAt","lastEnqueuedAt");
CREATE TABLE app_private."DiagnosticAssessment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL UNIQUE REFERENCES app_private."DiagnosticSession"(id) ON DELETE CASCADE,
  "manifestHash" CHAR(64) NOT NULL CHECK ("manifestHash" ~ '^[a-f0-9]{64}$'),
  state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','RELEASED','EXPIRED')),
  "rawScores" JSONB NOT NULL, writing JSONB, speaking JSONB, "nextSteps" JSONB NOT NULL DEFAULT '[]',
  "writingRunId" UUID, "reviewedById" UUID REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  "releasedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("writingRunId","sessionId") REFERENCES app_private."DiagnosticWritingRun"(id,"sessionId") ON DELETE RESTRICT,
  CHECK ((state='DRAFT' AND "releasedAt" IS NULL AND "expiresAt" IS NULL)
    OR (state IN ('RELEASED','EXPIRED') AND "releasedAt" IS NOT NULL AND "expiresAt"="releasedAt"+interval '90 days' AND "reviewedById" IS NOT NULL)),
  CHECK (state <> 'RELEASED' OR (writing IS NOT NULL AND speaking IS NOT NULL))
);
CREATE INDEX "DiagnosticAssessment_reviewer_idx" ON app_private."DiagnosticAssessment"("reviewedById");
CREATE INDEX "DiagnosticAssessment_run_idx" ON app_private."DiagnosticAssessment"("writingRunId","sessionId");
CREATE INDEX "DiagnosticAssessment_expiry_idx" ON app_private."DiagnosticAssessment"(state,"expiresAt");
ALTER TABLE app_private."DiagnosticWritingRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."DiagnosticAssessment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DiagnosticWritingRun",app_private."DiagnosticAssessment" FROM PUBLIC,anon,authenticated;
