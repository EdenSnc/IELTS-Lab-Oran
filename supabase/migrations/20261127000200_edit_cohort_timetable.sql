ALTER TABLE app_private."CohortTimeBlock" ADD COLUMN "supersededAt" timestamp(3);
ALTER TABLE app_private."CohortTimeBlock" ADD CONSTRAINT "CohortTimeBlock_superseded_unpublished"
  CHECK ("supersededAt" IS NULL OR NOT published);
