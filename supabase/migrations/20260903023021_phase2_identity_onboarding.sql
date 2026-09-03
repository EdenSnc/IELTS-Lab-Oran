ALTER TABLE app_private."User"
  ADD COLUMN "wilaya" TEXT,
  ADD COLUMN "preferredLocale" VARCHAR(2),
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
