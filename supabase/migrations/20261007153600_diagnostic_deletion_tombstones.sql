ALTER TABLE app_private."DiagnosticRecordingChunk" ADD COLUMN "lastDeletionCheckAt" TIMESTAMP(3);
CREATE INDEX "DiagnosticRecordingChunk_deletion_check_idx" ON app_private."DiagnosticRecordingChunk"(state,"lastDeletionCheckAt");
