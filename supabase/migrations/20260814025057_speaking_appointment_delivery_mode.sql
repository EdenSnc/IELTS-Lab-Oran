CREATE TYPE app_private."SpeakingAppointmentMode" AS ENUM ('ONLINE', 'IN_PERSON');

ALTER TABLE app_private."SpeakingAvailabilityRule"
  ADD COLUMN "deliveryMode" app_private."SpeakingAppointmentMode" NOT NULL DEFAULT 'ONLINE';

ALTER TABLE app_private."SpeakingAvailabilityOverride"
  ADD COLUMN "deliveryMode" app_private."SpeakingAppointmentMode";

ALTER TABLE app_private."SpeakingAppointment"
  ADD COLUMN "deliveryMode" app_private."SpeakingAppointmentMode" NOT NULL DEFAULT 'ONLINE';

ALTER TABLE app_private."SpeakingAvailabilityRule"
  DROP CONSTRAINT IF EXISTS "SpeakingAvailabilityRule_values_valid";
ALTER TABLE app_private."SpeakingAvailabilityRule"
  ADD CONSTRAINT "SpeakingAvailabilityRule_values_valid" CHECK (
    weekday BETWEEN 0 AND 6
    AND "startMinute" >= 600
    AND "endMinute" <= 1200
    AND "endMinute" > "startMinute"
    AND "appointmentDurationMinutes" = 20
    AND ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" >= "validFrom")
  );

ALTER TABLE app_private."SpeakingAvailabilityOverride"
  DROP CONSTRAINT IF EXISTS "SpeakingAvailabilityOverride_values_valid";
ALTER TABLE app_private."SpeakingAvailabilityOverride"
  ADD CONSTRAINT "SpeakingAvailabilityOverride_values_valid" CHECK (
    (kind = 'BLACKOUT' AND "startMinute" IS NULL AND "endMinute" IS NULL)
    OR (
      kind = 'AVAILABLE'
      AND "deliveryMode" IS NOT NULL
      AND "startMinute" >= 600
      AND "endMinute" <= 1200
      AND "endMinute" > "startMinute"
      AND "appointmentDurationMinutes" = 20
    )
  );
