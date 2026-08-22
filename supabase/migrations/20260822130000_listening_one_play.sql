CREATE TABLE app_private."AttemptMediaPlayback" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "stimulusId" UUID NOT NULL,
  "deviceSlotId" UUID NOT NULL,
  "playbackHash" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "AttemptMediaPlayback_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON DELETE CASCADE,
  CONSTRAINT "AttemptMediaPlayback_stimulusId_fkey"
    FOREIGN KEY ("stimulusId") REFERENCES app_private."Stimulus"(id) ON DELETE RESTRICT,
  CONSTRAINT "AttemptMediaPlayback_deviceSlotId_fkey"
    FOREIGN KEY ("deviceSlotId") REFERENCES app_private."DeviceSlot"(id) ON DELETE RESTRICT,
  CONSTRAINT "AttemptMediaPlayback_hash_check" CHECK ("playbackHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AttemptMediaPlayback_expiry_check" CHECK ("expiresAt" > "startedAt")
);

CREATE UNIQUE INDEX "AttemptMediaPlayback_attemptId_stimulusId_key"
  ON app_private."AttemptMediaPlayback" ("attemptId", "stimulusId");
CREATE INDEX "AttemptMediaPlayback_deviceSlotId_expiresAt_idx"
  ON app_private."AttemptMediaPlayback" ("deviceSlotId", "expiresAt");
