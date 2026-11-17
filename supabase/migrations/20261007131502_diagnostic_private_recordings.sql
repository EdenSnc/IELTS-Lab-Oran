CREATE TABLE app_private."DiagnosticRecording" (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 "speakingId" UUID NOT NULL UNIQUE REFERENCES app_private."DiagnosticSpeakingSession"(id) ON DELETE RESTRICT,
 "consentVersion" INTEGER NOT NULL CHECK("consentVersion">0),
 state TEXT NOT NULL DEFAULT 'UPLOADING' CHECK(state IN ('UPLOADING','READY','DELETE_PENDING','DELETED')),
 "chunkCount" INTEGER CHECK("chunkCount" BETWEEN 1 AND 96),
 "sampleCount" INTEGER CHECK("sampleCount" BETWEEN 1 AND 6720000),
 "durationMs" DOUBLE PRECISION,"checksum" CHAR(64) CHECK(checksum ~ '^[0-9a-f]{64}$'),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL,
 "finalizedAt" TIMESTAMP(3),"deletedAt" TIMESTAMP(3),
 CHECK("expiresAt"="createdAt"+interval '30 days'),
 CHECK(state<>'READY' OR ("chunkCount" IS NOT NULL AND "sampleCount" IS NOT NULL AND "durationMs"="sampleCount"/16.0 AND checksum IS NOT NULL AND "finalizedAt" IS NOT NULL)),
 CHECK(state<>'DELETED' OR "deletedAt" IS NOT NULL)
);
CREATE INDEX "DiagnosticRecording_state_expiry_idx" ON app_private."DiagnosticRecording"(state,"expiresAt");
CREATE TABLE app_private."DiagnosticRecordingChunk" (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"recordingId" UUID NOT NULL REFERENCES app_private."DiagnosticRecording"(id) ON DELETE RESTRICT,
 sequence INTEGER NOT NULL CHECK(sequence BETWEEN 0 AND 95),state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','STORED','DELETE_PENDING','DELETED')),
 "storageKey" TEXT NOT NULL UNIQUE CHECK("storageKey" ~ '^diagnostic/[0-9a-f-]{36}/[0-9]{1,2}\.wav$'),
 checksum CHAR(64) NOT NULL CHECK(checksum ~ '^[0-9a-f]{64}$'),"byteSize" INTEGER NOT NULL CHECK("byteSize" BETWEEN 46 AND 160044),
 "sampleCount" INTEGER NOT NULL CHECK("sampleCount" BETWEEN 1 AND 80000),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("recordingId",sequence),CHECK("byteSize"=44+"sampleCount"*2)
);
CREATE INDEX "DiagnosticRecordingChunk_state_idx" ON app_private."DiagnosticRecordingChunk"(state);
ALTER TABLE app_private."DiagnosticRecording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."DiagnosticRecordingChunk" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DiagnosticRecording",app_private."DiagnosticRecordingChunk" FROM PUBLIC,anon,authenticated;
