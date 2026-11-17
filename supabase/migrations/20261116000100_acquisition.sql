-- Acquisition placements, inspections, daily request counters, and lead attribution column.
ALTER TABLE app_private."LeadMagnetDownload" ADD COLUMN IF NOT EXISTS "utmContent" text;
CREATE INDEX IF NOT EXISTS "LeadMagnetDownload_utmSource_utmContent_idx" ON app_private."LeadMagnetDownload"("utmSource", "utmContent");

CREATE TABLE IF NOT EXISTS app_private."AcquisitionCampaign" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  "createdAt" timestamp(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_private."AcquisitionPlacement" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaignId" uuid NOT NULL REFERENCES app_private."AcquisitionCampaign"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code varchar(24) NOT NULL UNIQUE,
  label varchar(120) NOT NULL,
  destination varchar(300) NOT NULL,
  medium varchar(40) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AcquisitionPlacement_campaignId_createdAt_idx" ON app_private."AcquisitionPlacement"("campaignId", "createdAt");

CREATE TABLE IF NOT EXISTS app_private."AcquisitionInspection" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "placementId" uuid NOT NULL REFERENCES app_private."AcquisitionPlacement"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" uuid NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('present', 'missing', 'damaged', 'unknown')),
  note varchar(300),
  "checkedAt" timestamp(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AcquisitionInspection_placementId_checkedAt_idx" ON app_private."AcquisitionInspection"("placementId", "checkedAt");

CREATE TABLE IF NOT EXISTS app_private."AcquisitionDailyCount" (
  "placementId" uuid NOT NULL REFERENCES app_private."AcquisitionPlacement"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  day date NOT NULL,
  requests integer NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY ("placementId", day)
);
