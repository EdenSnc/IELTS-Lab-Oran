ALTER TABLE app_private."DiagnosticSession"
 ADD COLUMN "writingAiAdultAttested" BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN "writingAiConsented" BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN "writingConsentVersion" INTEGER NOT NULL DEFAULT 0 CHECK("writingConsentVersion">=0),
 ADD COLUMN "writingAiRevokedAt" TIMESTAMP(3),
 ADD CONSTRAINT "DiagnosticSession_writing_consent_check" CHECK(NOT "writingAiConsented" OR "writingAiAdultAttested");
ALTER TABLE app_private."DiagnosticWritingRun" ADD COLUMN "consentVersion" INTEGER NOT NULL DEFAULT 0 CHECK("consentVersion">=0);
-- Existing runs carry no diagnostic-specific adult consent; they cannot resume.
UPDATE app_private."DiagnosticWritingRun" SET state='CANCELLED',feedback=NULL,"leaseOwner"=NULL,"leaseExpiresAt"=NULL,
 "completedAt"=CURRENT_TIMESTAMP,"errorCode"='CONSENT_REQUIRED' WHERE "consentVersion"=0;
