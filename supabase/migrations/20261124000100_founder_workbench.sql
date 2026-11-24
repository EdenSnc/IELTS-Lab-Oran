ALTER TABLE app_private."AcquisitionCampaign" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp(3);
ALTER TABLE app_private."AcquisitionPlacement" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp(3);
ALTER TABLE app_private."Inquiry"
  ADD COLUMN IF NOT EXISTS "archivedAt" timestamp(3),
  ADD COLUMN IF NOT EXISTS "founderDetails" jsonb;
