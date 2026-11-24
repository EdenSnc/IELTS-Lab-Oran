ALTER TABLE app_private."PosterDesign"
  ADD COLUMN "qrBackground" varchar(7) NOT NULL DEFAULT '#ffffff'
    CHECK ("qrBackground" = 'artwork' OR "qrBackground" ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN "roundQr" boolean NOT NULL DEFAULT false;
