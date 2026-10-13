-- Real MP3/AAC durations are not whole seconds. Preserve milliseconds without padding source audio.
ALTER TABLE app_private."DiagnosticContentReview"
  ALTER COLUMN "audioDurationSeconds" TYPE DOUBLE PRECISION USING "audioDurationSeconds"::double precision;
ALTER TABLE app_private."DiagnosticContentReview" ADD CONSTRAINT "diagnostic_audio_duration_precision"
  CHECK ("audioDurationSeconds" IS NULL OR ("audioDurationSeconds">0 AND "audioDurationSeconds"<=1080
    AND round("audioDurationSeconds"::numeric,3)="audioDurationSeconds"::numeric));
