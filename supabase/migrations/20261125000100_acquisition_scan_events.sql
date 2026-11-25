ALTER TABLE app_private."AcquisitionCampaign" ADD COLUMN "keepQrAfterArchive" boolean NOT NULL DEFAULT false;
ALTER TABLE app_private."AcquisitionPlacement" ADD COLUMN "keepQrAfterArchive" boolean NOT NULL DEFAULT false;
CREATE TABLE app_private."AcquisitionScan" (
  id uuid PRIMARY KEY,
  "placementId" uuid NOT NULL REFERENCES app_private."AcquisitionPlacement"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "scannedAt" timestamp(3) NOT NULL DEFAULT now(),
  "placementLabel" varchar(120) NOT NULL,
  "inquiryId" uuid UNIQUE REFERENCES app_private."Inquiry"(id) ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX "AcquisitionScan_placementId_scannedAt_idx" ON app_private."AcquisitionScan" ("placementId", "scannedAt");
ALTER TABLE app_private."AcquisitionScan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."AcquisitionScan" FROM anon, authenticated, PUBLIC;
