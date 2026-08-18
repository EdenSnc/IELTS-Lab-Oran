-- PostgreSQL constraints that Prisma schema syntax cannot currently express.
-- Apply these statements in the first database migration after Prisma creates
-- the app_private tables. They are intentionally kept outside schema.prisma so
-- the missing invariants remain visible during schema review.

-- One paid-platform device/session per account at a time.
CREATE UNIQUE INDEX "AccessSession_one_active_per_user"
  ON app_private."AccessSession" ("userId")
  WHERE state = 'ACTIVE';

-- Algeria-only access for the current paid-platform launch.
ALTER TABLE app_private."AccessSession"
  ADD CONSTRAINT "AccessSession_country_is_Algeria"
  CHECK ("countryCode" = 'DZ');

-- Account deletion is anonymisation, not an ambiguous soft delete. The
-- application must revoke auth/access sessions and clear these fields in the
-- same transaction before setting ANONYMIZED.
ALTER TABLE app_private."User"
  ADD CONSTRAINT "User_anonymized_has_no_contact_data"
  CHECK (
    status <> 'ANONYMIZED'
    OR (
      email IS NULL
      AND whatsapp IS NULL
      AND "anonymizedAt" IS NOT NULL
    )
  );

-- Canonical Algerian/foreign phone fields are stored in E.164 format.
ALTER TABLE app_private."Prospect"
  ADD CONSTRAINT "Prospect_phone_e164"
  CHECK (phone ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE app_private."User"
  ADD CONSTRAINT "User_whatsapp_e164"
  CHECK (whatsapp IS NULL OR whatsapp ~ '^\+[1-9][0-9]{7,14}$');

-- Database backstop for atomic entitlement reservation.
ALTER TABLE app_private."Entitlement"
  ADD CONSTRAINT "Entitlement_attempt_count_valid"
  CHECK (
    "attemptsUsed" >= 0
    AND (
      "maximumAttempts" IS NULL
      OR (
        "maximumAttempts" >= 0
        AND "attemptsUsed" <= "maximumAttempts"
      )
    )
  );

-- Only one grading run may be selected as the final result for a skill.
CREATE UNIQUE INDEX "GradingRun_one_final_per_attempt_skill"
  ON app_private."GradingRun" ("attemptId", skill)
  WHERE "isFinal" = true;

-- Webhook processing normally scans only the small set of unprocessed events.
CREATE INDEX "PaymentEvent_unprocessed"
  ON app_private."PaymentEvent" ("receivedAt")
  WHERE "processedAt" IS NULL;

ALTER TABLE app_private."GradingRun"
  ADD CONSTRAINT "GradingRun_final_state_valid"
  CHECK (
    "isFinal" = false
    OR (
      status = 'SUCCEEDED'
      AND "finalizedAt" IS NOT NULL
      AND "completedAt" IS NOT NULL
    )
  );

ALTER TABLE app_private."AnswerKey"
  ADD CONSTRAINT "AnswerKey_verified_state_valid"
  CHECK (
    "reviewStatus" <> 'VERIFIED'
    OR (
      "verifiedAt" IS NOT NULL
      AND "sourceType" <> 'INFERRED'
      AND (
        "verifiedById" IS NOT NULL
        OR (
          "sourceType" = 'OFFICIAL_KEY'
          AND "sourceArtifactId" IS NOT NULL
        )
      )
    )
  );

ALTER TABLE app_private."TestVersion"
  ADD CONSTRAINT "TestVersion_publication_dates_valid"
  CHECK (
    (status = 'DRAFT' AND "publishedAt" IS NULL AND "retiredAt" IS NULL)
    OR (
      status = 'PUBLISHED'
      AND "contentHash" IS NOT NULL
      AND "publishedAt" IS NOT NULL
      AND "retiredAt" IS NULL
    )
    OR (
      status = 'RETIRED'
      AND "contentHash" IS NOT NULL
      AND "publishedAt" IS NOT NULL
      AND "retiredAt" IS NOT NULL
    )
  );

-- UNIVERSAL is valid for reusable rubrics and source material, not for a
-- concrete IELTS test or a learner-facing blueprint.
ALTER TABLE app_private."Test"
  ADD CONSTRAINT "Test_variant_is_concrete"
  CHECK (variant IN ('ACADEMIC', 'GENERAL_TRAINING'));

ALTER TABLE app_private."TestBlueprint"
  ADD CONSTRAINT "TestBlueprint_publication_valid"
  CHECK (
    variant IN ('ACADEMIC', 'GENERAL_TRAINING')
    AND (
      (status = 'DRAFT' AND "publishedAt" IS NULL)
      OR (status = 'PUBLISHED' AND "publishedAt" IS NOT NULL)
      OR (status = 'RETIRED' AND "publishedAt" IS NOT NULL)
    )
  );

ALTER TABLE app_private."BlueprintSlot"
  ADD CONSTRAINT "BlueprintSlot_values_valid"
  CHECK (
    "requiredCount" > 0
    AND "scoreWeight" > 0
    AND ("targetMarks" IS NULL OR "targetMarks" >= 0)
    AND ("minimumBand" IS NULL OR ("minimumBand" >= 0 AND "minimumBand" <= 9))
    AND ("maximumBand" IS NULL OR ("maximumBand" >= 0 AND "maximumBand" <= 9))
    AND (
      "minimumBand" IS NULL
      OR "maximumBand" IS NULL
      OR "minimumBand" <= "maximumBand"
    )
  );

ALTER TABLE app_private."TestSection"
  ADD CONSTRAINT "TestSection_values_valid"
  CHECK (
    "displayOrder" >= 0
    AND ("timeLimitSeconds" IS NULL OR "timeLimitSeconds" > 0)
  );

ALTER TABLE app_private."TestPart"
  ADD CONSTRAINT "TestPart_timing_valid"
  CHECK (
    ("recommendedTimeSeconds" IS NULL OR "recommendedTimeSeconds" > 0)
    AND ("preparationTimeSeconds" IS NULL OR "preparationTimeSeconds" > 0)
    AND ("responseTimeSeconds" IS NULL OR "responseTimeSeconds" > 0)
  );

ALTER TABLE app_private."QuestionGroup"
  ADD CONSTRAINT "QuestionGroup_numbers_and_marks_valid"
  CHECK (
    (
      ("scoringStrategy" = 'RUBRIC' AND "maxMarks" = 0)
      OR ("scoringStrategy" <> 'RUBRIC' AND "maxMarks" > 0)
    )
    AND ("sourceNumberStart" IS NULL OR "sourceNumberStart" > 0)
    AND (
      "sourceNumberEnd" IS NULL
      OR (
        "sourceNumberStart" IS NOT NULL
        AND "sourceNumberEnd" >= "sourceNumberStart"
      )
    )
    AND ("minWordCount" IS NULL OR "minWordCount" >= 0)
    AND ("maxWords" IS NULL OR "maxWords" >= 0)
  );

ALTER TABLE app_private."Question"
  ADD CONSTRAINT "Question_marks_valid"
  CHECK ("maxMarks" >= 0);

ALTER TABLE app_private."AttemptQuestion"
  ADD CONSTRAINT "AttemptQuestion_snapshot_valid"
  CHECK (
    "maxMarksSnapshot" >= 0
    AND "partOrder" >= 0
    AND "groupOrder" >= 0
    AND "questionOrder" >= 0
    AND ("questionNumber" IS NULL OR "questionNumber" > 0)
  );

ALTER TABLE app_private."Response"
  ADD CONSTRAINT "Response_marks_valid"
  CHECK (
    ("marksAwarded" IS NULL OR "marksAwarded" >= 0)
    AND (
      "recordingDeletedAt" IS NULL
      OR "recordingStorageKey" IS NULL
    )
  );

ALTER TABLE app_private."CriterionScore"
  ADD CONSTRAINT "CriterionScore_band_valid"
  CHECK (
    band >= 0
    AND band <= 9
    AND mod(band * 2, 1) = 0
  );

ALTER TABLE app_private."AttemptSkillScore"
  ADD CONSTRAINT "AttemptSkillScore_values_valid"
  CHECK (
    band >= 0
    AND band <= 9
    AND mod(band * 2, 1) = 0
    AND ("rawScore" IS NULL OR "rawScore" >= 0)
    AND ("maximumRawScore" IS NULL OR "maximumRawScore" >= 0)
    AND (
      "rawScore" IS NULL
      OR "maximumRawScore" IS NULL
      OR "rawScore" <= "maximumRawScore"
    )
  );

ALTER TABLE app_private."AssessmentAttempt"
  ADD CONSTRAINT "AssessmentAttempt_overall_band_valid"
  CHECK (
    "overallBand" IS NULL
    OR (
      "overallBand" >= 0
      AND "overallBand" <= 9
      AND mod("overallBand" * 2, 1) = 0
    )
  );

ALTER TABLE app_private."Product"
  ADD CONSTRAINT "Product_commercial_values_valid"
  CHECK (
    "priceMinor" >= 0
    AND currency ~ '^[A-Z]{3}$'
    AND ("accessDays" IS NULL OR "accessDays" > 0)
    AND ("maximumAttempts" IS NULL OR "maximumAttempts" >= 0)
  );

ALTER TABLE app_private."Order"
  ADD CONSTRAINT "Order_amount_valid"
  CHECK ("amountMinor" >= 0 AND currency ~ '^[A-Z]{3}$');

ALTER TABLE app_private."PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_amount_valid"
  CHECK ("amountMinor" >= 0 AND currency ~ '^[A-Z]{3}$');

-- Speaking appointment integrity. The GiST exclusion is the database-side
-- concurrency backstop: even differently aligned slots cannot overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE app_private."SpeakingAppointment"
  ADD CONSTRAINT "SpeakingAppointment_time_valid"
  CHECK ("scheduledEndAt" > "scheduledStartAt");

ALTER TABLE app_private."SpeakingAppointment"
  ADD CONSTRAINT "SpeakingAppointment_no_examiner_overlap"
  EXCLUDE USING gist (
    "examinerId" WITH =,
    tsrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&
  ) WHERE (status = 'BOOKED');

ALTER TABLE app_private."SpeakingAvailabilityRule"
  ADD CONSTRAINT "SpeakingAvailabilityRule_values_valid"
  CHECK (
    weekday BETWEEN 0 AND 6
    AND "startMinute" >= 600
    AND "endMinute" <= 1200
    AND "endMinute" > "startMinute"
    AND MOD("startMinute", 20) = 0
    AND MOD("endMinute", 20) = 0
    AND "appointmentDurationMinutes" = 20
    AND ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" >= "validFrom")
  );

ALTER TABLE app_private."SpeakingAvailabilityOverride"
  ADD CONSTRAINT "SpeakingAvailabilityOverride_values_valid"
  CHECK (
    (kind = 'BLACKOUT' AND "startMinute" IS NULL AND "endMinute" IS NULL)
    OR (
      kind = 'AVAILABLE'
      AND "deliveryMode" IS NOT NULL
      AND "startMinute" >= 600
      AND "endMinute" <= 1200
      AND "endMinute" > "startMinute"
      AND MOD("startMinute", 20) = 0
      AND MOD("endMinute", 20) = 0
      AND "appointmentDurationMinutes" = 20
    )
  );

ALTER TABLE app_private."SpeakingEvidenceMarker"
  ADD CONSTRAINT "SpeakingEvidenceMarker_offset_valid"
  CHECK ("offsetMs" >= 0);

ALTER TABLE app_private."SpeakingRecording"
  ADD CONSTRAINT "SpeakingRecording_metadata_valid"
  CHECK (
    ("durationMs" IS NULL OR "durationMs" >= 0)
    AND (status <> 'READY' OR "storageKey" IS NOT NULL)
  );

ALTER TABLE app_private."SpeakingHumanAssessment"
  ADD CONSTRAINT "SpeakingHumanAssessment_bands_valid"
  CHECK (
    "fluencyCoherence" BETWEEN 0 AND 9
    AND "lexicalResource" BETWEEN 0 AND 9
    AND "grammaticalRange" BETWEEN 0 AND 9
    AND pronunciation BETWEEN 0 AND 9
    AND "overallBand" BETWEEN 0 AND 9
    AND mod("fluencyCoherence" * 2, 1) = 0
    AND mod("lexicalResource" * 2, 1) = 0
    AND mod("grammaticalRange" * 2, 1) = 0
    AND mod(pronunciation * 2, 1) = 0
    AND mod("overallBand" * 2, 1) = 0
    AND (priorities IS NULL OR jsonb_array_length(priorities) <= 3)
  );
