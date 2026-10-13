CREATE TABLE app_private."DiagnosticSpeakingRun" (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 "recordingId" UUID NOT NULL REFERENCES app_private."DiagnosticRecording"(id) ON DELETE RESTRICT,
 "createdById" UUID NOT NULL REFERENCES app_private."User"(id) ON DELETE RESTRICT,
 "consentVersion" INTEGER NOT NULL CHECK("consentVersion">0),
 "inputHash" CHAR(64) NOT NULL CHECK("inputHash" ~ '^[0-9a-f]{64}$'),"promptVersion" TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
 output JSONB,model TEXT,usage JSONB,"errorCode" TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 "leaseOwner" UUID,"leaseExpiresAt" TIMESTAMP(3),"lastEnqueuedAt" TIMESTAMP(3),
 version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),review JSONB,
 "reviewedById" UUID REFERENCES app_private."User"(id) ON DELETE RESTRICT,"reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMP(3),
 UNIQUE("recordingId","inputHash","promptVersion"),
 CHECK((state='RUNNING')=("leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)),
 CHECK(state<>'SUCCEEDED' OR (output IS NOT NULL AND model IS NOT NULL AND "completedAt" IS NOT NULL)),
 CHECK((review IS NULL AND "reviewedById" IS NULL AND "reviewedAt" IS NULL) OR (review IS NOT NULL AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL))
);
CREATE INDEX "DiagnosticSpeakingRun_creator_idx" ON app_private."DiagnosticSpeakingRun"("createdById");
CREATE INDEX "DiagnosticSpeakingRun_reviewer_idx" ON app_private."DiagnosticSpeakingRun"("reviewedById");
CREATE INDEX "DiagnosticSpeakingRun_delivery_idx" ON app_private."DiagnosticSpeakingRun"(state,"leaseExpiresAt","lastEnqueuedAt");
ALTER TABLE app_private."DiagnosticSpeakingRun" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DiagnosticSpeakingRun" FROM PUBLIC,anon,authenticated;
ALTER TABLE app_private."DiagnosticAssessment" ADD COLUMN "speakingRunId" UUID REFERENCES app_private."DiagnosticSpeakingRun"(id) ON DELETE RESTRICT;
CREATE INDEX "DiagnosticAssessment_speakingRun_idx" ON app_private."DiagnosticAssessment"("speakingRunId");
