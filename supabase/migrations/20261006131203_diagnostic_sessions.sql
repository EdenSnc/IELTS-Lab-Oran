-- Additive standalone diagnostics. No ordinary attempt, payment or device objects change.
CREATE TABLE app_private."DiagnosticInvitation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipientId" UUID NOT NULL REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  "issuedById" UUID NOT NULL REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  "blueprintId" UUID NOT NULL REFERENCES app_private."TestBlueprint"(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3), "revocationReason" TEXT,
  UNIQUE(id,"recipientId","blueprintId"),
  CHECK("expiresAt" = "createdAt" + interval '7 days'),
  CHECK("revokedAt" IS NULL OR "revokedAt" >= "createdAt"),
  CHECK(("revokedAt" IS NULL) = ("revocationReason" IS NULL))
);
CREATE TABLE app_private."DiagnosticContentReview" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "testPartId" UUID NOT NULL REFERENCES app_private."TestPart"(id) ON DELETE RESTRICT,
  "contentHash" CHAR(64) NOT NULL CHECK("contentHash" ~ '^[a-f0-9]{64}$'),
  "reviewerId" UUID NOT NULL REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  "reviewedAt" TIMESTAMP(3) NOT NULL, "reviewDueAt" TIMESTAMP(3) NOT NULL,
  suitability TEXT NOT NULL CHECK(suitability IN ('HARDER_LISTENING','REPRESENTATIVE_READING','TASK_2_DIAGNOSTIC')),
  "audioAssetId" UUID REFERENCES app_private."ContentAsset"(id) ON DELETE RESTRICT,
  "audioHash" CHAR(64), "audioDurationSeconds" INTEGER,
  "audioBoundariesVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK("reviewDueAt" > "reviewedAt"),
  CHECK(("audioAssetId" IS NULL AND "audioHash" IS NULL AND "audioDurationSeconds" IS NULL AND NOT "audioBoundariesVerified")
    OR ("audioAssetId" IS NOT NULL AND "audioHash" ~ '^[a-f0-9]{64}$' AND "audioDurationSeconds" > 0 AND "audioBoundariesVerified"))
);
CREATE TABLE app_private."DiagnosticSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invitationId" UUID NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES app_private."User"(id) ON DELETE RESTRICT,
  "blueprintId" UUID NOT NULL REFERENCES app_private."TestBlueprint"(id) ON DELETE RESTRICT,
  manifest JSONB NOT NULL,
  "manifestHash" CHAR(64) NOT NULL CHECK("manifestHash" ~ '^[a-f0-9]{64}$'),
  state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','SUBMITTED')),
  "startedAt" TIMESTAMP(3) NOT NULL, deadline TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3), "writerTokenHash" CHAR(64), "writerExpiresAt" TIMESTAMP(3),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  FOREIGN KEY("invitationId","userId","blueprintId") REFERENCES app_private."DiagnosticInvitation"(id,"recipientId","blueprintId") ON DELETE RESTRICT,
  UNIQUE("invitationId","userId","blueprintId"),
  CHECK(deadline="startedAt" + interval '1 hour'),
  CHECK((state='ACTIVE' AND "submittedAt" IS NULL) OR (state='SUBMITTED' AND "submittedAt" >= "startedAt")),
  CHECK(("writerTokenHash" IS NULL AND "writerExpiresAt" IS NULL)
    OR ("writerTokenHash" ~ '^[a-f0-9]{64}$' AND "writerExpiresAt" >= "startedAt"))
);
CREATE TABLE app_private."DiagnosticResponse" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES app_private."DiagnosticSession"(id) ON DELETE CASCADE,
  "questionId" UUID NOT NULL REFERENCES app_private."Question"(id) ON DELETE RESTRICT,
  answer TEXT NOT NULL DEFAULT '' CHECK(char_length(answer)<=20000),
  "markedForReview" BOOLEAN NOT NULL DEFAULT false,
  "savedAt" TIMESTAMP(3), "finalizedAt" TIMESTAMP(3),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
  UNIQUE("sessionId","questionId"),
  CHECK("finalizedAt" IS NULL OR "savedAt" IS NULL OR "finalizedAt">="savedAt")
);
CREATE INDEX "DiagnosticInvitation_recipientId_createdAt_idx" ON app_private."DiagnosticInvitation"("recipientId","createdAt");
CREATE INDEX "DiagnosticInvitation_issuedById_idx" ON app_private."DiagnosticInvitation"("issuedById");
CREATE INDEX "DiagnosticInvitation_blueprintId_idx" ON app_private."DiagnosticInvitation"("blueprintId");
CREATE INDEX "DiagnosticContentReview_testPartId_createdAt_idx" ON app_private."DiagnosticContentReview"("testPartId","createdAt");
CREATE INDEX "DiagnosticContentReview_reviewerId_idx" ON app_private."DiagnosticContentReview"("reviewerId");
CREATE INDEX "DiagnosticContentReview_audioAssetId_idx" ON app_private."DiagnosticContentReview"("audioAssetId");
CREATE INDEX "DiagnosticSession_userId_startedAt_idx" ON app_private."DiagnosticSession"("userId","startedAt");
CREATE INDEX "DiagnosticSession_blueprintId_idx" ON app_private."DiagnosticSession"("blueprintId");
CREATE INDEX "DiagnosticSession_state_deadline_idx" ON app_private."DiagnosticSession"(state,deadline);
CREATE INDEX "DiagnosticResponse_questionId_idx" ON app_private."DiagnosticResponse"("questionId");
CREATE FUNCTION app_private.diagnostic_review_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
  RAISE EXCEPTION 'Diagnostic content review facts are immutable' USING ERRCODE='55000';
END $$;
CREATE TRIGGER diagnostic_review_immutable BEFORE UPDATE OR DELETE ON app_private."DiagnosticContentReview"
FOR EACH ROW EXECUTE FUNCTION app_private.diagnostic_review_immutable();
ALTER TABLE app_private."DiagnosticInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."DiagnosticContentReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."DiagnosticSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."DiagnosticResponse" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DiagnosticInvitation",app_private."DiagnosticContentReview",app_private."DiagnosticSession",app_private."DiagnosticResponse" FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION app_private.diagnostic_review_immutable() FROM PUBLIC,anon,authenticated;
-- Server uses the existing direct postgres connection; service_role remains server-only.
GRANT ALL ON app_private."DiagnosticInvitation",app_private."DiagnosticContentReview",app_private."DiagnosticSession",app_private."DiagnosticResponse" TO service_role;

-- additional complete-value constraints (CHECK alone accepts SQL NULL).
ALTER TABLE app_private."DiagnosticContentReview" ADD CONSTRAINT "DiagnosticContentReview_audio_complete_check" CHECK (
  ("audioAssetId" IS NULL AND "audioHash" IS NULL AND "audioDurationSeconds" IS NULL AND NOT "audioBoundariesVerified")
  OR ("audioAssetId" IS NOT NULL AND "audioHash" IS NOT NULL AND "audioDurationSeconds" IS NOT NULL
    AND "audioHash" ~ '^[a-f0-9]{64}$' AND "audioDurationSeconds">0 AND "audioBoundariesVerified")
);
ALTER TABLE app_private."DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_writer_complete_check" CHECK (
  ("writerTokenHash" IS NULL AND "writerExpiresAt" IS NULL)
  OR ("writerTokenHash" IS NOT NULL AND "writerExpiresAt" IS NOT NULL
    AND "writerTokenHash" ~ '^[a-f0-9]{64}$' AND "writerExpiresAt">="startedAt")
);
ALTER TABLE app_private."DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_state_complete_check" CHECK (
  (state='ACTIVE' AND "submittedAt" IS NULL)
  OR (state='SUBMITTED' AND "submittedAt" IS NOT NULL AND "submittedAt">="startedAt")
);
