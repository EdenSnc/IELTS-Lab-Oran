-- Seed canonical BandScale v1 reference data migrated from objective-grading.ts
-- Preserves exact historical thresholds for Listening, Academic Reading, and General Reading.

INSERT INTO app_private."BandScale" (
  id,
  code,
  version,
  skill,
  variant,
  status,
  thresholds,
  "sourceUrl",
  "effectiveFrom"
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'IELTS_LISTENING_ESTIMATE',
  1,
  'LISTENING',
  'UNIVERSAL',
  'PUBLISHED',
  '[[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1]]'::jsonb,
  'https://ielts.org',
  '2026-01-01 00:00:00'
),
(
  '00000000-0000-0000-0000-000000000002',
  'IELTS_ACADEMIC_READING_ESTIMATE',
  1,
  'READING',
  'ACADEMIC',
  'PUBLISHED',
  '[[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1]]'::jsonb,
  'https://ielts.org',
  '2026-01-01 00:00:00'
),
(
  '00000000-0000-0000-0000-000000000003',
  'IELTS_GENERAL_READING_ESTIMATE',
  1,
  'READING',
  'GENERAL_TRAINING',
  'PUBLISHED',
  '[[40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [3, 2], [1, 1]]'::jsonb,
  'https://ielts.org',
  '2026-01-01 00:00:00'
)
ON CONFLICT (code, version) DO UPDATE SET
  thresholds = EXCLUDED.thresholds,
  status = EXCLUDED.status;
