-- =============================================================================
-- =============================================================================
-- IELTS LAB ORAN — PRE-SPEAKING RECONSTRUCTION BASELINE
-- Timestamp: 20260813000000
-- Reconstructs complete pre-Speaking schema (CRM, Auth, Content, Testing, Grading, Commercial)
-- Speaking migrations (20260814...) replay cleanly on top of this baseline
-- =============================================================================
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app_private;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
CREATE TYPE app_private."AccessSessionState" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE app_private."AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ANONYMIZED');
CREATE TYPE app_private."AnswerKeySource" AS ENUM ('OFFICIAL_KEY', 'SOURCE_RESPONSE_DECLARATION', 'HUMAN_VERIFIED', 'INFERRED');
CREATE TYPE app_private."ArtifactKind" AS ENUM ('HTML', 'CSS', 'JAVASCRIPT', 'JSON', 'PDF', 'AUDIO', 'IMAGE', 'VIDEO', 'OTHER');
CREATE TYPE app_private."AttemptState" AS ENUM ('DRAFT', 'ACTIVE', 'SUBMITTED', 'GRADING', 'COMPLETED', 'ABANDONED', 'EXPIRED');
CREATE TYPE app_private."BlueprintSelectionMode" AS ENUM ('WHOLE_PART', 'INDEPENDENT_QUESTION_GROUPS');
CREATE TYPE app_private."ConsentAction" AS ENUM ('ACCEPTED', 'WITHDRAWN');
CREATE TYPE app_private."ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'RECORDING', 'AI_ASSISTED_GRADING', 'MARKETING');
CREATE TYPE app_private."ContentAssetType" AS ENUM ('BAR_CHART', 'LINE_GRAPH', 'PIE_CHART', 'TABLE', 'FLOWCHART', 'PROCESS_DIAGRAM', 'MAP', 'PLAN', 'DIAGRAM', 'PHOTO', 'AUDIO', 'OTHER');
CREATE TYPE app_private."EntitlementStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE app_private."GraderKind" AS ENUM ('OBJECTIVE_ENGINE', 'AI', 'HUMAN');
CREATE TYPE app_private."GradingRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SUPERSEDED');
CREATE TYPE app_private."ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED');
CREATE TYPE app_private."IssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'BLOCKING');
CREATE TYPE app_private."LeadSource" AS ENUM ('cohort_waitlist', 'workshop', 'diagnostic_qualified', 'diagnostic_below_threshold', 'lead_magnet_pdf', 'tally_intake', 'referral', 'partner', 'unknown');
CREATE TYPE app_private."LeadStatus" AS ENUM ('NEW', 'CONTACTED_VIA_WA', 'IN_CONVERSATION', 'CONVERTED', 'DEAD_LEAD');
CREATE TYPE app_private."OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');
CREATE TYPE app_private."PartSlot" AS ENUM ('LISTENING_PART_1', 'LISTENING_PART_2', 'LISTENING_PART_3', 'LISTENING_PART_4', 'READING_SECTION_1', 'READING_SECTION_2', 'READING_SECTION_3', 'WRITING_TASK_1', 'WRITING_TASK_2', 'SPEAKING_PART_1', 'SPEAKING_PART_2', 'SPEAKING_PART_3');
CREATE TYPE app_private."PaymentProvider" AS ENUM ('CHARGILY', 'CASH', 'MANUAL');
CREATE TYPE app_private."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED');
CREATE TYPE app_private."ProductTier" AS ENUM ('TIER_1_BASE', 'TIER_2_DIAGNOSTIC', 'TIER_3_COHORT', 'TIER_4');
CREATE TYPE app_private."PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE app_private."QuestionAssetRole" AS ENUM ('PROMPT', 'INLINE', 'OPTION_BANK', 'DROP_TARGET', 'SUPPORTING');
CREATE TYPE app_private."QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MATCHING', 'MATCHING_INFORMATION', 'MATCHING_HEADINGS', 'MATCHING_FEATURES', 'MATCHING_SENTENCE_ENDINGS', 'IDENTIFYING_INFORMATION', 'IDENTIFYING_WRITER_VIEWS', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION', 'FLOWCHART_COMPLETION', 'DIAGRAM_LABEL_COMPLETION', 'PLAN_MAP_DIAGRAM_LABELING', 'FORM_COMPLETION', 'SHORT_ANSWER', 'UNCLASSIFIED_GAP_FILL', 'WRITING_TASK_1_ACADEMIC', 'WRITING_TASK_1_GENERAL', 'WRITING_TASK_2_ESSAY', 'SPEAKING_PART_1_INTERVIEW', 'SPEAKING_PART_2_LONG_TURN', 'SPEAKING_PART_3_DISCUSSION');
CREATE TYPE app_private."ReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED');
CREATE TYPE app_private."ResponseKind" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_TEXT', 'LONG_TEXT', 'DRAG_DROP', 'AUDIO_RECORDING', 'NONE');
CREATE TYPE app_private."ReviewStatus" AS ENUM ('AUTO_EXTRACTED', 'PENDING_REVIEW', 'VERIFIED');
CREATE TYPE app_private."Role" AS ENUM ('STUDENT', 'TEACHER', 'CONTENT_REVIEWER', 'ADMIN');
CREATE TYPE app_private."ScoringStrategy" AS ENUM ('PER_ITEM_EXACT', 'UNORDERED_EXACT_SET', 'RUBRIC', 'NOT_SCORED');
CREATE TYPE app_private."Skill" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');
CREATE TYPE app_private."SourceProvider" AS ENUM ('IDP', 'BRITISH_COUNCIL', 'IELTS_ORG', 'CAMBRIDGE', 'IELTS_LAB', 'OTHER');
CREATE TYPE app_private."StimulusType" AS ENUM ('READING_PASSAGE', 'AUDIO_TRACK', 'WRITING_PROMPT', 'SPEAKING_PROMPT', 'SHARED_CONTEXT', 'INSTRUCTION');
CREATE TYPE app_private."TestVariant" AS ENUM ('ACADEMIC', 'GENERAL_TRAINING', 'UNIVERSAL');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE app_private."AccessSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "authSessionId" UUID NOT NULL,
  "deviceFingerprintHash" TEXT NOT NULL,
  "ipHash" TEXT,
  "countryCode" CHAR(2) NOT NULL,
  "state" app_private."AccessSessionState" NOT NULL DEFAULT 'ACTIVE'::app_private."AccessSessionState",
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AccessSession_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."AnswerKey" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "questionGroupId" UUID NOT NULL,
  "sourceArtifactId" UUID,
  "encryptedPayload" TEXT NOT NULL,
  "formatVersion" INTEGER NOT NULL DEFAULT 1,
  "sourceType" app_private."AnswerKeySource" NOT NULL,
  "normalization" JSONB,
  "reviewStatus" app_private."ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW'::app_private."ReviewStatus",
  "verifiedById" UUID,
  "verifiedAt" TIMESTAMP(3),
  "sourceLocator" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnswerKey_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."AssessmentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "blueprintId" UUID NOT NULL,
  "entitlementId" UUID,
  "state" app_private."AttemptState" NOT NULL DEFAULT 'DRAFT'::app_private."AttemptState",
  "randomSeed" TEXT NOT NULL,
  "minimumSourceYear" INTEGER,
  "archiveIncluded" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "overallBand" DECIMAL(2,1),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."AttemptManifest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "compiledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptManifest_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."AttemptQuestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "skill" app_private."Skill" NOT NULL,
  "partOrder" INTEGER NOT NULL,
  "groupOrder" INTEGER NOT NULL,
  "questionOrder" INTEGER NOT NULL,
  "questionNumber" INTEGER,
  "maxMarksSnapshot" INTEGER NOT NULL,
  "presentedOptions" JSONB,
  CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."AttemptSkillScore" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "gradingRunId" UUID,
  "bandScaleId" UUID,
  "skill" app_private."Skill" NOT NULL,
  "rawScore" INTEGER,
  "maximumRawScore" INTEGER,
  "band" DECIMAL(2,1) NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptSkillScore_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."BandScale" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "skill" app_private."Skill" NOT NULL,
  "variant" app_private."TestVariant" NOT NULL,
  "status" app_private."PublicationStatus" NOT NULL DEFAULT 'DRAFT'::app_private."PublicationStatus",
  "thresholds" JSONB NOT NULL,
  "sourceUrl" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BandScale_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."BlueprintSlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "blueprintId" UUID NOT NULL,
  "partSlot" app_private."PartSlot" NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "requiredCount" INTEGER NOT NULL DEFAULT 1,
  "selectionMode" app_private."BlueprintSelectionMode" NOT NULL DEFAULT 'WHOLE_PART'::app_private."BlueprintSelectionMode",
  "scoreWeight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  "targetMarks" INTEGER,
  "minimumBand" DECIMAL(2,1),
  "maximumBand" DECIMAL(2,1),
  CONSTRAINT "BlueprintSlot_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ConsentRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" app_private."ConsentType" NOT NULL,
  "action" app_private."ConsentAction" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "acceptedFrom" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ContentAsset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceArtifactId" UUID,
  "type" app_private."ContentAssetType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" BIGINT,
  "width" INTEGER,
  "height" INTEGER,
  "durationMs" INTEGER,
  "altText" TEXT,
  "metadata" JSONB,
  "reviewStatus" app_private."ReviewStatus" NOT NULL DEFAULT 'AUTO_EXTRACTED'::app_private."ReviewStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAsset_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ContentSource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" app_private."SourceProvider" NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceYear" INTEGER,
  "rightsReference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentSource_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."CriterionScore" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "gradingRunId" UUID NOT NULL,
  "rubricCriterionId" UUID NOT NULL,
  "attemptQuestionId" UUID NOT NULL,
  "band" DECIMAL(2,1) NOT NULL,
  "feedback" TEXT,
  "evidence" JSONB,
  CONSTRAINT "CriterionScore_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Entitlement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "orderId" UUID,
  "status" app_private."EntitlementStatus" NOT NULL DEFAULT 'PENDING'::app_private."EntitlementStatus",
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "maximumAttempts" INTEGER,
  "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Entitlement_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ExtractionIssue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceArtifactId" UUID NOT NULL,
  "entityKey" TEXT,
  "code" TEXT NOT NULL,
  "severity" app_private."IssueSeverity" NOT NULL,
  "details" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractionIssue_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."GradingRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "rubricVersionId" UUID,
  "skill" app_private."Skill" NOT NULL,
  "graderKind" app_private."GraderKind" NOT NULL,
  "status" app_private."GradingRunStatus" NOT NULL DEFAULT 'QUEUED'::app_private."GradingRunStatus",
  "provider" TEXT,
  "model" TEXT,
  "promptVersion" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "output" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "isFinal" BOOLEAN NOT NULL DEFAULT false,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "runAttempt" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GradingRun_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ImportBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceArtifactId" UUID NOT NULL,
  "extractorName" TEXT NOT NULL,
  "extractorVersion" TEXT NOT NULL,
  "inputChecksum" TEXT NOT NULL,
  "status" app_private."ImportStatus" NOT NULL DEFAULT 'RUNNING'::app_private."ImportStatus",
  "statistics" JSONB,
  "errorSummary" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Inquiry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prospectId" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inquiry_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."LeadMagnetDownload" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prospectId" UUID NOT NULL,
  "magnetName" TEXT NOT NULL,
  "source" app_private."LeadSource" NOT NULL DEFAULT 'unknown'::app_private."LeadSource",
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "externalEventId" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadMagnetDownload_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."LearnerReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "status" app_private."ReportStatus" NOT NULL DEFAULT 'QUEUED'::app_private."ReportStatus",
  "templateVersion" TEXT NOT NULL,
  "summary" JSONB,
  "storageKey" TEXT,
  "errorMessage" TEXT,
  "generatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerReport_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" app_private."OrderStatus" NOT NULL DEFAULT 'PENDING'::app_private."OrderStatus",
  "amountMinor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'DZD'::bpchar,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."PaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "provider" app_private."PaymentProvider" NOT NULL,
  "providerCheckoutId" TEXT,
  "providerTransactionId" TEXT,
  "status" app_private."PaymentStatus" NOT NULL DEFAULT 'PENDING'::app_private."PaymentStatus",
  "amountMinor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'DZD'::bpchar,
  "checkoutUrl" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "expiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."PaymentEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentAttemptId" UUID NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Product" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "tier" app_private."ProductTier" NOT NULL,
  "name" TEXT NOT NULL,
  "priceMinor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'DZD'::bpchar,
  "accessDays" INTEGER,
  "maximumAttempts" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."ProductBlueprint" (
  "productId" UUID NOT NULL,
  "blueprintId" UUID NOT NULL,
  CONSTRAINT "ProductBlueprint_pkey" PRIMARY KEY ("productId", "blueprintId")
);
CREATE TABLE app_private."Prospect" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "status" app_private."LeadStatus" NOT NULL DEFAULT 'NEW'::app_private."LeadStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prospect_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Question" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "questionGroupId" UUID NOT NULL,
  "stableKey" TEXT NOT NULL,
  "sourceNumber" INTEGER,
  "displayOrder" INTEGER NOT NULL,
  "promptHtml" TEXT,
  "responseKindOverride" app_private."ResponseKind",
  "maxMarks" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Question_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."QuestionAsset" (
  "questionGroupId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "role" app_private."QuestionAssetRole" NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "structuredData" JSONB,
  CONSTRAINT "QuestionAsset_pkey" PRIMARY KEY ("questionGroupId", "assetId", role)
);
CREATE TABLE app_private."QuestionGroup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "testPartId" UUID NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "questionType" app_private."QuestionType" NOT NULL,
  "responseKind" app_private."ResponseKind" NOT NULL,
  "scoringStrategy" app_private."ScoringStrategy" NOT NULL,
  "sourceNumberStart" INTEGER,
  "sourceNumberEnd" INTEGER,
  "instructionsHtml" TEXT,
  "promptHtml" TEXT,
  "options" JSONB,
  "maxMarks" INTEGER NOT NULL,
  "minWordCount" INTEGER,
  "maxWords" INTEGER,
  "allowNumbers" BOOLEAN,
  "rawAnswerInstruction" TEXT,
  "independent" BOOLEAN NOT NULL DEFAULT false,
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
  "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
  "dependencyKey" TEXT,
  "reviewStatus" app_private."ReviewStatus" NOT NULL DEFAULT 'AUTO_EXTRACTED'::app_private."ReviewStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Response" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptQuestionId" UUID NOT NULL,
  "answer" JSONB NOT NULL,
  "markedForReview" BOOLEAN NOT NULL DEFAULT false,
  "isCorrect" BOOLEAN,
  "marksAwarded" DECIMAL(5,2),
  "recordingStorageKey" TEXT,
  "recordingExpiresAt" TIMESTAMP(3),
  "recordingDeletedAt" TIMESTAMP(3),
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Response_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."RubricCriterion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rubricVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "weight" DECIMAL(5,4) NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "description" TEXT,
  CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."RubricVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "skill" app_private."Skill" NOT NULL,
  "variant" app_private."TestVariant",
  "status" app_private."PublicationStatus" NOT NULL DEFAULT 'DRAFT'::app_private."PublicationStatus",
  "sourceUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RubricVersion_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."SalesNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prospectId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesNote_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."SourceArtifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceId" UUID NOT NULL,
  "kind" app_private."ArtifactKind" NOT NULL,
  "filename" TEXT NOT NULL,
  "originalPath" TEXT,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "byteSize" BIGINT,
  "checksum" TEXT NOT NULL,
  "metadata" JSONB,
  "capturedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceArtifact_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Stimulus" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "testPartId" UUID NOT NULL,
  "assetId" UUID,
  "sourceKey" TEXT NOT NULL,
  "type" app_private."StimulusType" NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "title" TEXT,
  "bodyHtml" TEXT,
  "plainText" TEXT,
  "transcript" TEXT,
  "audioStartMs" INTEGER,
  "audioEndMs" INTEGER,
  "isVisibleToLearner" BOOLEAN NOT NULL DEFAULT true,
  "reviewStatus" app_private."ReviewStatus" NOT NULL DEFAULT 'AUTO_EXTRACTED'::app_private."ReviewStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Stimulus_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."Test" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceId" UUID NOT NULL,
  "externalId" TEXT,
  "title" TEXT NOT NULL,
  "variant" app_private."TestVariant" NOT NULL,
  "sourceYear" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Test_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."TestBlueprint" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "variant" app_private."TestVariant" NOT NULL,
  "status" app_private."PublicationStatus" NOT NULL DEFAULT 'DRAFT'::app_private."PublicationStatus",
  "defaultMinimumSourceYear" INTEGER,
  "allowArchiveByDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "TestBlueprint_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."TestPart" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "testSectionId" UUID NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "slot" app_private."PartSlot" NOT NULL,
  "selectionGroupKey" TEXT,
  "title" TEXT,
  "instructionsHtml" TEXT,
  "recommendedTimeSeconds" INTEGER,
  "preparationTimeSeconds" INTEGER,
  "responseTimeSeconds" INTEGER,
  "difficultyBand" DECIMAL(2,1),
  "sourceLocator" TEXT,
  "extractionMetadata" JSONB,
  "reviewStatus" app_private."ReviewStatus" NOT NULL DEFAULT 'AUTO_EXTRACTED'::app_private."ReviewStatus",
  "shuffleQuestionGroups" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestPart_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."TestSection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "testVersionId" UUID NOT NULL,
  "skill" app_private."Skill" NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "timeLimitSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestSection_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."TestVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "testId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" app_private."PublicationStatus" NOT NULL DEFAULT 'DRAFT'::app_private."PublicationStatus",
  "contentHash" TEXT,
  "notes" TEXT,
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestVersion_pkey" PRIMARY KEY (id)
);
CREATE TABLE app_private."User" (
  "id" UUID NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "whatsapp" TEXT,
  "role" app_private."Role" NOT NULL DEFAULT 'STUDENT'::app_private."Role",
  "status" app_private."AccountStatus" NOT NULL DEFAULT 'ACTIVE'::app_private."AccountStatus",
  "anonymizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- Foreign Keys
-- -----------------------------------------------------------------------------
ALTER TABLE app_private."AccessSession" ADD CONSTRAINT "AccessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."AnswerKey" ADD CONSTRAINT "AnswerKey_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES app_private."QuestionGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."AnswerKey" ADD CONSTRAINT "AnswerKey_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES app_private."SourceArtifact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AnswerKey" ADD CONSTRAINT "AnswerKey_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES app_private."TestBlueprint"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES app_private."Entitlement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AttemptManifest" ADD CONSTRAINT "AttemptManifest_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES app_private."Question"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AttemptSkillScore" ADD CONSTRAINT "AttemptSkillScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."AttemptSkillScore" ADD CONSTRAINT "AttemptSkillScore_bandScaleId_fkey" FOREIGN KEY ("bandScaleId") REFERENCES app_private."BandScale"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."AttemptSkillScore" ADD CONSTRAINT "AttemptSkillScore_gradingRunId_fkey" FOREIGN KEY ("gradingRunId") REFERENCES app_private."GradingRun"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."BlueprintSlot" ADD CONSTRAINT "BlueprintSlot_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES app_private."TestBlueprint"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."ContentAsset" ADD CONSTRAINT "ContentAsset_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES app_private."SourceArtifact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."CriterionScore" ADD CONSTRAINT "CriterionScore_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES app_private."AttemptQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."CriterionScore" ADD CONSTRAINT "CriterionScore_gradingRunId_fkey" FOREIGN KEY ("gradingRunId") REFERENCES app_private."GradingRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."CriterionScore" ADD CONSTRAINT "CriterionScore_rubricCriterionId_fkey" FOREIGN KEY ("rubricCriterionId") REFERENCES app_private."RubricCriterion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES app_private."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES app_private."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."ExtractionIssue" ADD CONSTRAINT "ExtractionIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE app_private."ExtractionIssue" ADD CONSTRAINT "ExtractionIssue_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES app_private."SourceArtifact"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."GradingRun" ADD CONSTRAINT "GradingRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."GradingRun" ADD CONSTRAINT "GradingRun_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES app_private."RubricVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."ImportBatch" ADD CONSTRAINT "ImportBatch_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES app_private."SourceArtifact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Inquiry" ADD CONSTRAINT "Inquiry_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES app_private."Prospect"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."LeadMagnetDownload" ADD CONSTRAINT "LeadMagnetDownload_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES app_private."Prospect"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."LearnerReport" ADD CONSTRAINT "LearnerReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES app_private."AssessmentAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES app_private."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES app_private."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES app_private."PaymentAttempt"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."ProductBlueprint" ADD CONSTRAINT "ProductBlueprint_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES app_private."TestBlueprint"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."ProductBlueprint" ADD CONSTRAINT "ProductBlueprint_productId_fkey" FOREIGN KEY ("productId") REFERENCES app_private."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."Question" ADD CONSTRAINT "Question_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES app_private."QuestionGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."QuestionAsset" ADD CONSTRAINT "QuestionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES app_private."ContentAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."QuestionAsset" ADD CONSTRAINT "QuestionAsset_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES app_private."QuestionGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."QuestionGroup" ADD CONSTRAINT "QuestionGroup_testPartId_fkey" FOREIGN KEY ("testPartId") REFERENCES app_private."TestPart"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."Response" ADD CONSTRAINT "Response_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES app_private."AttemptQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES app_private."RubricVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."SalesNote" ADD CONSTRAINT "SalesNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES app_private."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."SalesNote" ADD CONSTRAINT "SalesNote_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES app_private."Prospect"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."SourceArtifact" ADD CONSTRAINT "SourceArtifact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES app_private."ContentSource"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Stimulus" ADD CONSTRAINT "Stimulus_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES app_private."ContentAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."Stimulus" ADD CONSTRAINT "Stimulus_testPartId_fkey" FOREIGN KEY ("testPartId") REFERENCES app_private."TestPart"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."Test" ADD CONSTRAINT "Test_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES app_private."ContentSource"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE app_private."TestPart" ADD CONSTRAINT "TestPart_testSectionId_fkey" FOREIGN KEY ("testSectionId") REFERENCES app_private."TestSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."TestSection" ADD CONSTRAINT "TestSection_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES app_private."TestVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE app_private."TestVersion" ADD CONSTRAINT "TestVersion_testId_fkey" FOREIGN KEY ("testId") REFERENCES app_private."Test"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX "AccessSession_authSessionId_key" ON app_private."AccessSession" USING btree ("authSessionId");
CREATE INDEX "AccessSession_lastSeenAt_idx" ON app_private."AccessSession" USING btree ("lastSeenAt");
CREATE UNIQUE INDEX "AccessSession_one_active_per_user" ON app_private."AccessSession" USING btree ("userId") WHERE (state = 'ACTIVE'::app_private."AccessSessionState");
CREATE INDEX "AccessSession_userId_state_lastSeenAt_idx" ON app_private."AccessSession" USING btree ("userId", state, "lastSeenAt");
CREATE UNIQUE INDEX "AnswerKey_questionGroupId_key" ON app_private."AnswerKey" USING btree ("questionGroupId");
CREATE INDEX "AnswerKey_reviewStatus_idx" ON app_private."AnswerKey" USING btree ("reviewStatus");
CREATE INDEX "AnswerKey_sourceArtifactId_idx" ON app_private."AnswerKey" USING btree ("sourceArtifactId");
CREATE INDEX "AnswerKey_verifiedById_idx" ON app_private."AnswerKey" USING btree ("verifiedById");
CREATE INDEX "AssessmentAttempt_blueprintId_idx" ON app_private."AssessmentAttempt" USING btree ("blueprintId");
CREATE INDEX "AssessmentAttempt_entitlementId_idx" ON app_private."AssessmentAttempt" USING btree ("entitlementId");
CREATE INDEX "AssessmentAttempt_expiresAt_idx" ON app_private."AssessmentAttempt" USING btree ("expiresAt");
CREATE INDEX "AssessmentAttempt_userId_state_createdAt_idx" ON app_private."AssessmentAttempt" USING btree ("userId", state, "createdAt");
CREATE UNIQUE INDEX "AttemptManifest_attemptId_key" ON app_private."AttemptManifest" USING btree ("attemptId");
CREATE INDEX "AttemptManifest_contentHash_idx" ON app_private."AttemptManifest" USING btree ("contentHash");
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_partOrder_groupOrder_questionOrde_key" ON app_private."AttemptQuestion" USING btree ("attemptId", "partOrder", "groupOrder", "questionOrder");
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_questionId_key" ON app_private."AttemptQuestion" USING btree ("attemptId", "questionId");
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_skill_questionNumber_key" ON app_private."AttemptQuestion" USING btree ("attemptId", skill, "questionNumber");
CREATE INDEX "AttemptQuestion_questionId_idx" ON app_private."AttemptQuestion" USING btree ("questionId");
CREATE UNIQUE INDEX "AttemptSkillScore_attemptId_skill_key" ON app_private."AttemptSkillScore" USING btree ("attemptId", skill);
CREATE INDEX "AttemptSkillScore_bandScaleId_idx" ON app_private."AttemptSkillScore" USING btree ("bandScaleId");
CREATE INDEX "AttemptSkillScore_gradingRunId_idx" ON app_private."AttemptSkillScore" USING btree ("gradingRunId");
CREATE UNIQUE INDEX "BandScale_code_version_key" ON app_private."BandScale" USING btree (code, version);
CREATE INDEX "BandScale_skill_variant_status_idx" ON app_private."BandScale" USING btree (skill, variant, status);
CREATE UNIQUE INDEX "BlueprintSlot_blueprintId_displayOrder_key" ON app_private."BlueprintSlot" USING btree ("blueprintId", "displayOrder");
CREATE UNIQUE INDEX "BlueprintSlot_blueprintId_partSlot_key" ON app_private."BlueprintSlot" USING btree ("blueprintId", "partSlot");
CREATE INDEX "ConsentRecord_userId_type_createdAt_idx" ON app_private."ConsentRecord" USING btree ("userId", type, "createdAt");
CREATE INDEX "ContentAsset_sourceArtifactId_idx" ON app_private."ContentAsset" USING btree ("sourceArtifactId");
CREATE UNIQUE INDEX "ContentAsset_storageKey_key" ON app_private."ContentAsset" USING btree ("storageKey");
CREATE INDEX "ContentAsset_type_reviewStatus_idx" ON app_private."ContentAsset" USING btree (type, "reviewStatus");
CREATE UNIQUE INDEX "ContentSource_provider_externalId_key" ON app_private."ContentSource" USING btree (provider, "externalId");
CREATE INDEX "ContentSource_provider_sourceYear_idx" ON app_private."ContentSource" USING btree (provider, "sourceYear");
CREATE INDEX "CriterionScore_attemptQuestionId_idx" ON app_private."CriterionScore" USING btree ("attemptQuestionId");
CREATE UNIQUE INDEX "CriterionScore_gradingRunId_rubricCriterionId_attemptQuesti_key" ON app_private."CriterionScore" USING btree ("gradingRunId", "rubricCriterionId", "attemptQuestionId");
CREATE INDEX "CriterionScore_rubricCriterionId_idx" ON app_private."CriterionScore" USING btree ("rubricCriterionId");
CREATE INDEX "Entitlement_orderId_idx" ON app_private."Entitlement" USING btree ("orderId");
CREATE INDEX "Entitlement_productId_idx" ON app_private."Entitlement" USING btree ("productId");
CREATE INDEX "Entitlement_userId_status_endsAt_idx" ON app_private."Entitlement" USING btree ("userId", status, "endsAt");
CREATE INDEX "ExtractionIssue_code_idx" ON app_private."ExtractionIssue" USING btree (code);
CREATE INDEX "ExtractionIssue_resolvedById_idx" ON app_private."ExtractionIssue" USING btree ("resolvedById");
CREATE INDEX "ExtractionIssue_sourceArtifactId_severity_resolvedAt_idx" ON app_private."ExtractionIssue" USING btree ("sourceArtifactId", severity, "resolvedAt");
CREATE INDEX "GradingRun_attemptId_skill_status_idx" ON app_private."GradingRun" USING btree ("attemptId", skill, status);
CREATE UNIQUE INDEX "GradingRun_idempotencyKey_key" ON app_private."GradingRun" USING btree ("idempotencyKey");
CREATE UNIQUE INDEX "GradingRun_one_final_per_attempt_skill" ON app_private."GradingRun" USING btree ("attemptId", skill) WHERE ("isFinal" = true);
CREATE INDEX "GradingRun_provider_model_idx" ON app_private."GradingRun" USING btree (provider, model);
CREATE INDEX "GradingRun_rubricVersionId_idx" ON app_private."GradingRun" USING btree ("rubricVersionId");
CREATE INDEX "GradingRun_status_leaseExpiresAt_idx" ON app_private."GradingRun" USING btree (status, "leaseExpiresAt");
CREATE UNIQUE INDEX "ImportBatch_sourceArtifactId_extractorName_extractorVersion_key" ON app_private."ImportBatch" USING btree ("sourceArtifactId", "extractorName", "extractorVersion", "inputChecksum");
CREATE INDEX "ImportBatch_status_startedAt_idx" ON app_private."ImportBatch" USING btree (status, "startedAt");
CREATE INDEX "Inquiry_isRead_createdAt_idx" ON app_private."Inquiry" USING btree ("isRead", "createdAt");
CREATE INDEX "Inquiry_prospectId_createdAt_idx" ON app_private."Inquiry" USING btree ("prospectId", "createdAt");
CREATE UNIQUE INDEX "LeadMagnetDownload_externalEventId_key" ON app_private."LeadMagnetDownload" USING btree ("externalEventId");
CREATE INDEX "LeadMagnetDownload_prospectId_createdAt_idx" ON app_private."LeadMagnetDownload" USING btree ("prospectId", "createdAt");
CREATE INDEX "LeadMagnetDownload_source_createdAt_idx" ON app_private."LeadMagnetDownload" USING btree (source, "createdAt");
CREATE UNIQUE INDEX "LearnerReport_attemptId_key" ON app_private."LearnerReport" USING btree ("attemptId");
CREATE INDEX "LearnerReport_status_createdAt_idx" ON app_private."LearnerReport" USING btree (status, "createdAt");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON app_private."Order" USING btree ("idempotencyKey");
CREATE INDEX "Order_productId_idx" ON app_private."Order" USING btree ("productId");
CREATE INDEX "Order_userId_status_createdAt_idx" ON app_private."Order" USING btree ("userId", status, "createdAt");
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON app_private."PaymentAttempt" USING btree ("orderId", status);
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerCheckoutId_key" ON app_private."PaymentAttempt" USING btree (provider, "providerCheckoutId");
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerTransactionId_key" ON app_private."PaymentAttempt" USING btree (provider, "providerTransactionId");
CREATE INDEX "PaymentAttempt_provider_status_createdAt_idx" ON app_private."PaymentAttempt" USING btree (provider, status, "createdAt");
CREATE INDEX "PaymentEvent_paymentAttemptId_receivedAt_idx" ON app_private."PaymentEvent" USING btree ("paymentAttemptId", "receivedAt");
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON app_private."PaymentEvent" USING btree ("providerEventId");
CREATE INDEX "PaymentEvent_unprocessed" ON app_private."PaymentEvent" USING btree ("receivedAt") WHERE ("processedAt" IS NULL);
CREATE UNIQUE INDEX "Product_code_key" ON app_private."Product" USING btree (code);
CREATE INDEX "Product_tier_active_idx" ON app_private."Product" USING btree (tier, active);
CREATE INDEX "ProductBlueprint_blueprintId_idx" ON app_private."ProductBlueprint" USING btree ("blueprintId");
CREATE INDEX "Prospect_email_idx" ON app_private."Prospect" USING btree (email);
CREATE UNIQUE INDEX "Prospect_phone_key" ON app_private."Prospect" USING btree (phone);
CREATE INDEX "Prospect_status_createdAt_idx" ON app_private."Prospect" USING btree (status, "createdAt");
CREATE UNIQUE INDEX "Question_questionGroupId_displayOrder_key" ON app_private."Question" USING btree ("questionGroupId", "displayOrder");
CREATE UNIQUE INDEX "Question_questionGroupId_stableKey_key" ON app_private."Question" USING btree ("questionGroupId", "stableKey");
CREATE INDEX "QuestionAsset_assetId_idx" ON app_private."QuestionAsset" USING btree ("assetId");
CREATE INDEX "QuestionGroup_dependencyKey_idx" ON app_private."QuestionGroup" USING btree ("dependencyKey");
CREATE INDEX "QuestionGroup_questionType_reviewStatus_idx" ON app_private."QuestionGroup" USING btree ("questionType", "reviewStatus");
CREATE UNIQUE INDEX "QuestionGroup_testPartId_displayOrder_key" ON app_private."QuestionGroup" USING btree ("testPartId", "displayOrder");
CREATE UNIQUE INDEX "QuestionGroup_testPartId_sourceKey_key" ON app_private."QuestionGroup" USING btree ("testPartId", "sourceKey");
CREATE UNIQUE INDEX "Response_attemptQuestionId_key" ON app_private."Response" USING btree ("attemptQuestionId");
CREATE UNIQUE INDEX "RubricCriterion_rubricVersionId_code_key" ON app_private."RubricCriterion" USING btree ("rubricVersionId", code);
CREATE UNIQUE INDEX "RubricCriterion_rubricVersionId_displayOrder_key" ON app_private."RubricCriterion" USING btree ("rubricVersionId", "displayOrder");
CREATE UNIQUE INDEX "RubricVersion_code_version_key" ON app_private."RubricVersion" USING btree (code, version);
CREATE INDEX "RubricVersion_skill_status_idx" ON app_private."RubricVersion" USING btree (skill, status);
CREATE INDEX "SalesNote_authorId_createdAt_idx" ON app_private."SalesNote" USING btree ("authorId", "createdAt");
CREATE INDEX "SalesNote_prospectId_createdAt_idx" ON app_private."SalesNote" USING btree ("prospectId", "createdAt");
CREATE UNIQUE INDEX "SourceArtifact_sourceId_checksum_key" ON app_private."SourceArtifact" USING btree ("sourceId", checksum);
CREATE INDEX "SourceArtifact_sourceId_kind_idx" ON app_private."SourceArtifact" USING btree ("sourceId", kind);
CREATE INDEX "Stimulus_assetId_idx" ON app_private."Stimulus" USING btree ("assetId");
CREATE INDEX "Stimulus_reviewStatus_idx" ON app_private."Stimulus" USING btree ("reviewStatus");
CREATE UNIQUE INDEX "Stimulus_testPartId_displayOrder_key" ON app_private."Stimulus" USING btree ("testPartId", "displayOrder");
CREATE UNIQUE INDEX "Stimulus_testPartId_sourceKey_key" ON app_private."Stimulus" USING btree ("testPartId", "sourceKey");
CREATE UNIQUE INDEX "Test_sourceId_externalId_key" ON app_private."Test" USING btree ("sourceId", "externalId");
CREATE INDEX "Test_variant_sourceYear_idx" ON app_private."Test" USING btree (variant, "sourceYear");
CREATE UNIQUE INDEX "TestBlueprint_code_version_key" ON app_private."TestBlueprint" USING btree (code, version);
CREATE INDEX "TestBlueprint_status_variant_idx" ON app_private."TestBlueprint" USING btree (status, variant);
CREATE INDEX "TestPart_slot_reviewStatus_idx" ON app_private."TestPart" USING btree (slot, "reviewStatus");
CREATE INDEX "TestPart_testSectionId_selectionGroupKey_idx" ON app_private."TestPart" USING btree ("testSectionId", "selectionGroupKey");
CREATE UNIQUE INDEX "TestPart_testSectionId_slot_key" ON app_private."TestPart" USING btree ("testSectionId", slot);
CREATE UNIQUE INDEX "TestPart_testSectionId_sourceKey_key" ON app_private."TestPart" USING btree ("testSectionId", "sourceKey");
CREATE INDEX "TestSection_skill_idx" ON app_private."TestSection" USING btree (skill);
CREATE UNIQUE INDEX "TestSection_testVersionId_displayOrder_key" ON app_private."TestSection" USING btree ("testVersionId", "displayOrder");
CREATE UNIQUE INDEX "TestSection_testVersionId_skill_key" ON app_private."TestSection" USING btree ("testVersionId", skill);
CREATE INDEX "TestVersion_status_publishedAt_idx" ON app_private."TestVersion" USING btree (status, "publishedAt");
CREATE UNIQUE INDEX "TestVersion_testId_contentHash_key" ON app_private."TestVersion" USING btree ("testId", "contentHash");
CREATE UNIQUE INDEX "TestVersion_testId_version_key" ON app_private."TestVersion" USING btree ("testId", version);
CREATE UNIQUE INDEX "User_email_key" ON app_private."User" USING btree (email);
CREATE INDEX "User_status_role_idx" ON app_private."User" USING btree (status, role);
CREATE UNIQUE INDEX "User_whatsapp_key" ON app_private."User" USING btree (whatsapp);

-- -----------------------------------------------------------------------------
-- Custom Constraints (CHECK and EXCLUDE)
-- -----------------------------------------------------------------------------
ALTER TABLE app_private."AccessSession" ADD CONSTRAINT "AccessSession_country_is_Algeria" CHECK (("countryCode" = 'DZ'::bpchar));
ALTER TABLE app_private."AnswerKey" ADD CONSTRAINT "AnswerKey_verified_state_valid" CHECK ((("reviewStatus" <> 'VERIFIED'::app_private."ReviewStatus") OR (("verifiedAt" IS NOT NULL) AND ("sourceType" <> 'INFERRED'::app_private."AnswerKeySource") AND (("verifiedById" IS NOT NULL) OR (("sourceType" = 'OFFICIAL_KEY'::app_private."AnswerKeySource") AND ("sourceArtifactId" IS NOT NULL))))));
ALTER TABLE app_private."AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_overall_band_valid" CHECK ((("overallBand" IS NULL) OR (("overallBand" >= (0)::numeric) AND ("overallBand" <= (9)::numeric) AND (mod(("overallBand" * (2)::numeric), (1)::numeric) = (0)::numeric))));
ALTER TABLE app_private."AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_snapshot_valid" CHECK ((("maxMarksSnapshot" >= 0) AND ("partOrder" >= 0) AND ("groupOrder" >= 0) AND ("questionOrder" >= 0) AND (("questionNumber" IS NULL) OR ("questionNumber" > 0))));
ALTER TABLE app_private."AttemptSkillScore" ADD CONSTRAINT "AttemptSkillScore_values_valid" CHECK (((band >= (0)::numeric) AND (band <= (9)::numeric) AND (mod((band * (2)::numeric), (1)::numeric) = (0)::numeric) AND (("rawScore" IS NULL) OR ("rawScore" >= 0)) AND (("maximumRawScore" IS NULL) OR ("maximumRawScore" >= 0)) AND (("rawScore" IS NULL) OR ("maximumRawScore" IS NULL) OR ("rawScore" <= "maximumRawScore"))));
ALTER TABLE app_private."BlueprintSlot" ADD CONSTRAINT "BlueprintSlot_values_valid" CHECK ((("requiredCount" > 0) AND ("scoreWeight" > (0)::numeric) AND (("targetMarks" IS NULL) OR ("targetMarks" >= 0)) AND (("minimumBand" IS NULL) OR (("minimumBand" >= (0)::numeric) AND ("minimumBand" <= (9)::numeric))) AND (("maximumBand" IS NULL) OR (("maximumBand" >= (0)::numeric) AND ("maximumBand" <= (9)::numeric))) AND (("minimumBand" IS NULL) OR ("maximumBand" IS NULL) OR ("minimumBand" <= "maximumBand"))));
ALTER TABLE app_private."CriterionScore" ADD CONSTRAINT "CriterionScore_band_valid" CHECK (((band >= (0)::numeric) AND (band <= (9)::numeric) AND (mod((band * (2)::numeric), (1)::numeric) = (0)::numeric)));
ALTER TABLE app_private."Entitlement" ADD CONSTRAINT "Entitlement_attempt_count_valid" CHECK ((("attemptsUsed" >= 0) AND (("maximumAttempts" IS NULL) OR (("maximumAttempts" >= 0) AND ("attemptsUsed" <= "maximumAttempts")))));
ALTER TABLE app_private."GradingRun" ADD CONSTRAINT "GradingRun_final_state_valid" CHECK ((("isFinal" = false) OR ((status = 'SUCCEEDED'::app_private."GradingRunStatus") AND ("finalizedAt" IS NOT NULL) AND ("completedAt" IS NOT NULL))));
ALTER TABLE app_private."Order" ADD CONSTRAINT "Order_amount_valid" CHECK ((("amountMinor" >= 0) AND (currency ~ '^[A-Z]{3}$'::text)));
ALTER TABLE app_private."PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_amount_valid" CHECK ((("amountMinor" >= 0) AND (currency ~ '^[A-Z]{3}$'::text)));
ALTER TABLE app_private."Product" ADD CONSTRAINT "Product_commercial_values_valid" CHECK ((("priceMinor" >= 0) AND (currency ~ '^[A-Z]{3}$'::text) AND (("accessDays" IS NULL) OR ("accessDays" > 0)) AND (("maximumAttempts" IS NULL) OR ("maximumAttempts" >= 0))));
ALTER TABLE app_private."Prospect" ADD CONSTRAINT "Prospect_phone_e164" CHECK ((phone ~ '^\+[1-9][0-9]{7,14}$'::text));
ALTER TABLE app_private."Question" ADD CONSTRAINT "Question_marks_valid" CHECK (("maxMarks" >= 0));
ALTER TABLE app_private."QuestionGroup" ADD CONSTRAINT "QuestionGroup_numbers_and_marks_valid" CHECK ((((("scoringStrategy" = 'RUBRIC'::app_private."ScoringStrategy") AND ("maxMarks" = 0)) OR (("scoringStrategy" <> 'RUBRIC'::app_private."ScoringStrategy") AND ("maxMarks" > 0))) AND (("sourceNumberStart" IS NULL) OR ("sourceNumberStart" > 0)) AND (("sourceNumberEnd" IS NULL) OR (("sourceNumberStart" IS NOT NULL) AND ("sourceNumberEnd" >= "sourceNumberStart"))) AND (("minWordCount" IS NULL) OR ("minWordCount" >= 0)) AND (("maxWords" IS NULL) OR ("maxWords" >= 0))));
ALTER TABLE app_private."Response" ADD CONSTRAINT "Response_marks_valid" CHECK (((("marksAwarded" IS NULL) OR ("marksAwarded" >= (0)::numeric)) AND (("recordingDeletedAt" IS NULL) OR ("recordingStorageKey" IS NULL))));
ALTER TABLE app_private."Test" ADD CONSTRAINT "Test_variant_is_concrete" CHECK ((variant = ANY (ARRAY['ACADEMIC'::app_private."TestVariant", 'GENERAL_TRAINING'::app_private."TestVariant"])));
ALTER TABLE app_private."TestBlueprint" ADD CONSTRAINT "TestBlueprint_publication_valid" CHECK (((variant = ANY (ARRAY['ACADEMIC'::app_private."TestVariant", 'GENERAL_TRAINING'::app_private."TestVariant"])) AND (((status = 'DRAFT'::app_private."PublicationStatus") AND ("publishedAt" IS NULL)) OR ((status = 'PUBLISHED'::app_private."PublicationStatus") AND ("publishedAt" IS NOT NULL)) OR ((status = 'RETIRED'::app_private."PublicationStatus") AND ("publishedAt" IS NOT NULL)))));
ALTER TABLE app_private."TestPart" ADD CONSTRAINT "TestPart_timing_valid" CHECK (((("recommendedTimeSeconds" IS NULL) OR ("recommendedTimeSeconds" > 0)) AND (("preparationTimeSeconds" IS NULL) OR ("preparationTimeSeconds" > 0)) AND (("responseTimeSeconds" IS NULL) OR ("responseTimeSeconds" > 0))));
ALTER TABLE app_private."TestSection" ADD CONSTRAINT "TestSection_values_valid" CHECK ((("displayOrder" >= 0) AND (("timeLimitSeconds" IS NULL) OR ("timeLimitSeconds" > 0))));
ALTER TABLE app_private."TestVersion" ADD CONSTRAINT "TestVersion_publication_dates_valid" CHECK ((((status = 'DRAFT'::app_private."PublicationStatus") AND ("publishedAt" IS NULL) AND ("retiredAt" IS NULL)) OR ((status = 'PUBLISHED'::app_private."PublicationStatus") AND ("contentHash" IS NOT NULL) AND ("publishedAt" IS NOT NULL) AND ("retiredAt" IS NULL)) OR ((status = 'RETIRED'::app_private."PublicationStatus") AND ("contentHash" IS NOT NULL) AND ("publishedAt" IS NOT NULL) AND ("retiredAt" IS NOT NULL))));
ALTER TABLE app_private."User" ADD CONSTRAINT "User_anonymized_has_no_contact_data" CHECK (((status <> 'ANONYMIZED'::app_private."AccountStatus") OR ((email IS NULL) AND (whatsapp IS NULL) AND ("anonymizedAt" IS NOT NULL))));
ALTER TABLE app_private."User" ADD CONSTRAINT "User_whatsapp_e164" CHECK (((whatsapp IS NULL) OR (whatsapp ~ '^\+[1-9][0-9]{7,14}$'::text)));
