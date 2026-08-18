-- Additive migration for the isolated live Speaking component. Existing LRW
-- rows and scores are not rewritten or recalculated.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TYPE app_private."SpeakingAvailabilityOverrideKind" AS ENUM ('AVAILABLE', 'BLACKOUT');
CREATE TYPE app_private."SpeakingAppointmentStatus" AS ENUM ('BOOKED', 'CANCELLED_BY_LEARNER', 'CANCELLED_BY_EXAMINER', 'COMPLETED', 'NO_SHOW');
CREATE TYPE app_private."SpeakingSessionState" AS ENUM ('READY', 'LIVE_PART_1', 'LIVE_PART_2', 'LIVE_PART_3', 'ENDED', 'RECORDING_PROCESSING', 'AWAITING_HUMAN_SCORE', 'AI_PROCESSING', 'READY_FOR_REVIEW', 'FINALIZED', 'FAILED');
CREATE TYPE app_private."SpeakingPart" AS ENUM ('PART_1', 'PART_2', 'PART_3');
CREATE TYPE app_private."SpeakingRecordingTrackKind" AS ENUM ('CANDIDATE_AUDIO', 'EXAMINER_AUDIO', 'MIXED_AUDIO', 'OPTIONAL_VIDEO');
CREATE TYPE app_private."SpeakingRecordingStatus" AS ENUM ('REQUESTED', 'RECORDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE app_private."SpeakingAssessmentStage" AS ENUM ('PROVISIONAL', 'FINAL');
CREATE TYPE app_private."SpeakingAiAnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE app_private."SpeakingAvailabilityRule" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "examinerId" UUID NOT NULL,
  weekday INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  "appointmentDurationMinutes" INTEGER NOT NULL DEFAULT 20,
  "validFrom" DATE,
  "validUntil" DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingAvailabilityRule_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingAvailabilityOverride" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "examinerId" UUID NOT NULL,
  date DATE NOT NULL,
  kind app_private."SpeakingAvailabilityOverrideKind" NOT NULL,
  "startMinute" INTEGER,
  "endMinute" INTEGER,
  "appointmentDurationMinutes" INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  reason TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpeakingAvailabilityOverride_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingAppointment" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "learnerId" UUID NOT NULL,
  "examinerId" UUID NOT NULL,
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "scheduledEndAt" TIMESTAMP(3) NOT NULL,
  "learnerTimezone" TEXT NOT NULL,
  status app_private."SpeakingAppointmentStatus" NOT NULL DEFAULT 'BOOKED',
  "cancelledAt" TIMESTAMP(3),
  "cancellationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingAppointment_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingSession" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentId" UUID NOT NULL,
  "consentRecordId" UUID,
  state app_private."SpeakingSessionState" NOT NULL DEFAULT 'READY',
  "currentPart" app_private."SpeakingPart",
  "rtcProvider" TEXT NOT NULL,
  "rtcRoomName" TEXT NOT NULL,
  "contentSnapshot" JSONB,
  "examinerNotes" TEXT,
  "recordingConsentAt" TIMESTAMP(3),
  "recordingPolicyVersion" TEXT,
  "recordingStartedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingEvidenceMarker" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "offsetMs" INTEGER NOT NULL,
  part app_private."SpeakingPart",
  criterion TEXT,
  note TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpeakingEvidenceMarker_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingRecording" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  kind app_private."SpeakingRecordingTrackKind" NOT NULL,
  status app_private."SpeakingRecordingStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerArtifactId" TEXT,
  "providerCallbackId" TEXT,
  "storageKey" TEXT,
  "contentType" TEXT,
  "durationMs" INTEGER,
  checksum TEXT,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingRecording_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingHumanAssessment" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "assessorId" UUID NOT NULL,
  "gradingRunId" UUID,
  stage app_private."SpeakingAssessmentStage" NOT NULL,
  "fluencyCoherence" DECIMAL(2,1) NOT NULL,
  "lexicalResource" DECIMAL(2,1) NOT NULL,
  "grammaticalRange" DECIMAL(2,1) NOT NULL,
  pronunciation DECIMAL(2,1) NOT NULL,
  "overallBand" DECIMAL(2,1) NOT NULL,
  notes TEXT,
  priorities JSONB,
  "aiAnalysisRevealedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingHumanAssessment_pkey" PRIMARY KEY (id)
);

CREATE TABLE app_private."SpeakingAiAnalysis" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "gradingRunId" UUID,
  status app_private."SpeakingAiAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  output JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "runAttempt" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingAiAnalysis_pkey" PRIMARY KEY (id)
);

CREATE INDEX "SpeakingAvailabilityRule_examinerId_weekday_active_idx" ON app_private."SpeakingAvailabilityRule"("examinerId", weekday, active);
CREATE INDEX "SpeakingAvailabilityOverride_examinerId_date_kind_idx" ON app_private."SpeakingAvailabilityOverride"("examinerId", date, kind);
CREATE UNIQUE INDEX "SpeakingAppointment_attemptId_key" ON app_private."SpeakingAppointment"("attemptId");
CREATE UNIQUE INDEX "SpeakingAppointment_examinerId_scheduledStartAt_key" ON app_private."SpeakingAppointment"("examinerId", "scheduledStartAt");
CREATE INDEX "SpeakingAppointment_learnerId_scheduledStartAt_idx" ON app_private."SpeakingAppointment"("learnerId", "scheduledStartAt");
CREATE INDEX "SpeakingAppointment_examinerId_status_scheduledStartAt_idx" ON app_private."SpeakingAppointment"("examinerId", status, "scheduledStartAt");
CREATE UNIQUE INDEX "SpeakingSession_appointmentId_key" ON app_private."SpeakingSession"("appointmentId");
CREATE UNIQUE INDEX "SpeakingSession_consentRecordId_key" ON app_private."SpeakingSession"("consentRecordId");
CREATE UNIQUE INDEX "SpeakingSession_rtcRoomName_key" ON app_private."SpeakingSession"("rtcRoomName");
CREATE INDEX "SpeakingSession_state_updatedAt_idx" ON app_private."SpeakingSession"(state, "updatedAt");
CREATE INDEX "SpeakingEvidenceMarker_sessionId_offsetMs_idx" ON app_private."SpeakingEvidenceMarker"("sessionId", "offsetMs");
CREATE UNIQUE INDEX "SpeakingRecording_providerArtifactId_key" ON app_private."SpeakingRecording"("providerArtifactId");
CREATE UNIQUE INDEX "SpeakingRecording_providerCallbackId_key" ON app_private."SpeakingRecording"("providerCallbackId");
CREATE UNIQUE INDEX "SpeakingRecording_storageKey_key" ON app_private."SpeakingRecording"("storageKey");
CREATE INDEX "SpeakingRecording_sessionId_status_idx" ON app_private."SpeakingRecording"("sessionId", status);
CREATE UNIQUE INDEX "SpeakingHumanAssessment_sessionId_stage_key" ON app_private."SpeakingHumanAssessment"("sessionId", stage);
CREATE INDEX "SpeakingHumanAssessment_assessorId_createdAt_idx" ON app_private."SpeakingHumanAssessment"("assessorId", "createdAt");
CREATE UNIQUE INDEX "SpeakingAiAnalysis_sessionId_inputHash_promptVersion_key" ON app_private."SpeakingAiAnalysis"("sessionId", "inputHash", "promptVersion");
CREATE INDEX "SpeakingAiAnalysis_status_createdAt_idx" ON app_private."SpeakingAiAnalysis"(status, "createdAt");

ALTER TABLE app_private."SpeakingAvailabilityRule" ADD CONSTRAINT "SpeakingAvailabilityRule_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES app_private."User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAvailabilityOverride" ADD CONSTRAINT "SpeakingAvailabilityOverride_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES app_private."User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAppointment" ADD CONSTRAINT "SpeakingAppointment_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAppointment" ADD CONSTRAINT "SpeakingAppointment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAppointment" ADD CONSTRAINT "SpeakingAppointment_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingSession" ADD CONSTRAINT "SpeakingSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES app_private."SpeakingAppointment"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingSession" ADD CONSTRAINT "SpeakingSession_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES app_private."ConsentRecord"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingEvidenceMarker" ADD CONSTRAINT "SpeakingEvidenceMarker_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES app_private."SpeakingSession"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingEvidenceMarker" ADD CONSTRAINT "SpeakingEvidenceMarker_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingRecording" ADD CONSTRAINT "SpeakingRecording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES app_private."SpeakingSession"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingHumanAssessment" ADD CONSTRAINT "SpeakingHumanAssessment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES app_private."SpeakingSession"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingHumanAssessment" ADD CONSTRAINT "SpeakingHumanAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES app_private."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingHumanAssessment" ADD CONSTRAINT "SpeakingHumanAssessment_gradingRunId_fkey" FOREIGN KEY ("gradingRunId") REFERENCES app_private."GradingRun"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAiAnalysis" ADD CONSTRAINT "SpeakingAiAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES app_private."SpeakingSession"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE app_private."SpeakingAiAnalysis" ADD CONSTRAINT "SpeakingAiAnalysis_gradingRunId_fkey" FOREIGN KEY ("gradingRunId") REFERENCES app_private."GradingRun"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

SET search_path TO app_private, public, extensions;

ALTER TABLE app_private."SpeakingAppointment" ADD CONSTRAINT "SpeakingAppointment_time_valid" CHECK ("scheduledEndAt" > "scheduledStartAt");
ALTER TABLE app_private."SpeakingAppointment" ADD CONSTRAINT "SpeakingAppointment_no_examiner_overlap" EXCLUDE USING gist ("examinerId" WITH =, tsrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&) WHERE (status = 'BOOKED');
ALTER TABLE app_private."SpeakingAvailabilityRule" ADD CONSTRAINT "SpeakingAvailabilityRule_values_valid" CHECK (weekday BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute" AND "appointmentDurationMinutes" BETWEEN 10 AND 120 AND ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" >= "validFrom"));
ALTER TABLE app_private."SpeakingAvailabilityOverride" ADD CONSTRAINT "SpeakingAvailabilityOverride_values_valid" CHECK ((kind = 'BLACKOUT' AND "startMinute" IS NULL AND "endMinute" IS NULL) OR (kind = 'AVAILABLE' AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute" AND ("appointmentDurationMinutes" IS NULL OR "appointmentDurationMinutes" BETWEEN 10 AND 120)));
ALTER TABLE app_private."SpeakingEvidenceMarker" ADD CONSTRAINT "SpeakingEvidenceMarker_offset_valid" CHECK ("offsetMs" >= 0);
ALTER TABLE app_private."SpeakingRecording" ADD CONSTRAINT "SpeakingRecording_metadata_valid" CHECK (("durationMs" IS NULL OR "durationMs" >= 0) AND (status <> 'READY' OR "storageKey" IS NOT NULL));
ALTER TABLE app_private."SpeakingHumanAssessment" ADD CONSTRAINT "SpeakingHumanAssessment_bands_valid" CHECK ("fluencyCoherence" BETWEEN 0 AND 9 AND "lexicalResource" BETWEEN 0 AND 9 AND "grammaticalRange" BETWEEN 0 AND 9 AND pronunciation BETWEEN 0 AND 9 AND "overallBand" BETWEEN 0 AND 9 AND mod("fluencyCoherence" * 2, 1) = 0 AND mod("lexicalResource" * 2, 1) = 0 AND mod("grammaticalRange" * 2, 1) = 0 AND mod(pronunciation * 2, 1) = 0 AND mod("overallBand" * 2, 1) = 0 AND (priorities IS NULL OR jsonb_array_length(priorities) <= 3));

RESET search_path;
