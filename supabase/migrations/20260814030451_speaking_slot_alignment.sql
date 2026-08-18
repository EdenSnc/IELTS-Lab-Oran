ALTER TABLE app_private."SpeakingAvailabilityRule"
  DROP CONSTRAINT "SpeakingAvailabilityRule_values_valid";
ALTER TABLE app_private."SpeakingAvailabilityRule"
  ADD CONSTRAINT "SpeakingAvailabilityRule_values_valid" CHECK (
    weekday BETWEEN 0 AND 6
    AND "startMinute" >= 600
    AND "endMinute" <= 1200
    AND "endMinute" > "startMinute"
    AND MOD("startMinute", 20) = 0
    AND MOD("endMinute", 20) = 0
    AND "appointmentDurationMinutes" = 20
    AND ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" >= "validFrom")
  );

ALTER TABLE app_private."SpeakingAvailabilityOverride"
  DROP CONSTRAINT "SpeakingAvailabilityOverride_values_valid";
ALTER TABLE app_private."SpeakingAvailabilityOverride"
  ADD CONSTRAINT "SpeakingAvailabilityOverride_values_valid" CHECK (
    (kind = 'BLACKOUT' AND "startMinute" IS NULL AND "endMinute" IS NULL)
    OR (
      kind = 'AVAILABLE'
      AND "deliveryMode" IS NOT NULL
      AND "startMinute" >= 600
      AND "endMinute" <= 1200
      AND "endMinute" > "startMinute"
      AND MOD("startMinute", 20) = 0
      AND MOD("endMinute", 20) = 0
      AND "appointmentDurationMinutes" = 20
    )
  );
