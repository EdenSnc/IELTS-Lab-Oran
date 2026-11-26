CREATE TABLE app_private."CohortTimeBlock" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days text[] NOT NULL CHECK (cardinality(days) BETWEEN 1 AND 7 AND days <@ ARRAY['sun','mon','tue','wed','thu','fri','sat']::text[]),
  "startMinutes" integer NOT NULL CHECK ("startMinutes" BETWEEN 480 AND 1199),
  "endMinutes" integer NOT NULL CHECK ("endMinutes" <= 1200),
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT now(),
  CHECK ("endMinutes" > "startMinutes")
);
CREATE INDEX "CohortTimeBlock_published_createdAt_idx" ON app_private."CohortTimeBlock" (published, "createdAt");
ALTER TABLE app_private."CohortTimeBlock" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."CohortTimeBlock" FROM anon, authenticated, PUBLIC;
