CREATE TABLE app_private."DiagnosticSpeakingSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL UNIQUE REFERENCES app_private."DiagnosticSession"(id) ON DELETE CASCADE,
  "examinerId" UUID REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  state TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK(state IN ('NOT_STARTED','ACTIVE','COMPLETED','CANCELLED')),
  "startedAt" TIMESTAMP(3), deadline TIMESTAMP(3), "completedAt" TIMESTAMP(3), notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=10000),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
  "adultAttested" BOOLEAN NOT NULL DEFAULT FALSE,"recordingConsented" BOOLEAN NOT NULL DEFAULT FALSE,"aiConsented" BOOLEAN NOT NULL DEFAULT FALSE,
  "consentVersion" INTEGER NOT NULL DEFAULT 0 CHECK("consentVersion">=0),"privacyRevokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(NOT "recordingConsented" OR "adultAttested"),CHECK(NOT "aiConsented" OR "recordingConsented"),
  CHECK((state='NOT_STARTED' AND "startedAt" IS NULL AND deadline IS NULL AND "completedAt" IS NULL)
    OR (state IN ('ACTIVE','COMPLETED','CANCELLED') AND "startedAt" IS NOT NULL AND deadline="startedAt"+interval '7 minutes' AND "examinerId" IS NOT NULL)),
  CHECK(state<>'COMPLETED' OR "completedAt">=deadline)
);
CREATE INDEX "DiagnosticSpeakingSession_examiner_idx" ON app_private."DiagnosticSpeakingSession"("examinerId",state);
ALTER TABLE app_private."DiagnosticSpeakingSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DiagnosticSpeakingSession" FROM PUBLIC,anon,authenticated;
