CREATE TABLE app_private."PosterDesign" (
  id uuid PRIMARY KEY,
  "placementId" uuid NOT NULL REFERENCES app_private."AcquisitionPlacement"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  title varchar(100) NOT NULL,
  artwork bytea NOT NULL CHECK (octet_length(artwork) BETWEEN 1 AND 4194304),
  thumbnail bytea NOT NULL,
  mime varchar(16) NOT NULL CHECK (mime IN ('image/png', 'image/jpeg')),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 8192),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 8192),
  x integer NOT NULL CHECK (x >= 0),
  y integer NOT NULL CHECK (y >= 0),
  size integer NOT NULL CHECK (size > 0),
  dpi integer NOT NULL CHECK (dpi BETWEEN 72 AND 1200),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  "createdAt" timestamp(3) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(3) NOT NULL,
  "deletedAt" timestamp(3),
  CHECK (width * height <= 24000000),
  CHECK (x + size <= width AND y + size <= height)
);
CREATE INDEX "PosterDesign_deletedAt_updatedAt_idx" ON app_private."PosterDesign"("deletedAt", "updatedAt");
CREATE INDEX "PosterDesign_placementId_idx" ON app_private."PosterDesign"("placementId");
ALTER TABLE app_private."PosterDesign" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."PosterDesign" FROM anon, authenticated, PUBLIC;
