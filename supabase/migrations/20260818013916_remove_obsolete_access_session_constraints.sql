-- Remove obsolete architecture constraints on AccessSession:
-- 1. countryCode forced to 'DZ' (Algeria-only rule removed; country is a risk hint, not hard authorization)
-- 2. one active session per user (replaced by the two-trusted-device model)

ALTER TABLE app_private."AccessSession"
  DROP CONSTRAINT IF EXISTS "AccessSession_country_is_Algeria";

DROP INDEX IF EXISTS app_private."AccessSession_one_active_per_user";
