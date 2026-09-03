INSERT INTO app_private."Product" (
  code,
  tier,
  name,
  "priceMinor",
  currency,
  "accessDays",
  "maximumAttempts",
  active,
  metadata,
  "updatedAt"
)
VALUES (
  'academic-mock-test-1',
  'TIER_2_DIAGNOSTIC'::app_private."ProductTier",
  'IELTS Academic Mock Test',
  390000,
  'DZD',
  30,
  1,
  true,
  '{"resultsAccessDays":30}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;
