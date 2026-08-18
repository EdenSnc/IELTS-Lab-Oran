import 'server-only';

function enabled(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export const speakingConfig = {
  enabled: enabled(process.env.SPEAKING_ENABLED, true),
  videoEnabled: enabled(process.env.SPEAKING_VIDEO_ENABLED, true),
  storedVideoEnabled: enabled(process.env.SPEAKING_STORED_VIDEO_ENABLED, false),
  aiEnabled: enabled(process.env.SPEAKING_AI_ENABLED, true),
  defaultTimezone: process.env.SPEAKING_DEFAULT_TIMEZONE ?? 'Africa/Algiers',
  slotMinutes: 20,
  bookingDayStartMinute: 10 * 60,
  bookingDayEndMinute: 20 * 60,
  centreName: process.env.SPEAKING_CENTRE_NAME ?? 'IELTS Lab Oran centre',
  centreAddress: process.env.SPEAKING_CENTRE_ADDRESS ?? 'Oran, Algeria',
  cancellationHours: boundedInteger(process.env.SPEAKING_CANCELLATION_HOURS, 4, 0, 168),
  joinEarlyMinutes: boundedInteger(process.env.SPEAKING_JOIN_EARLY_MINUTES, 10, 0, 60),
  tokenTtlSeconds: boundedInteger(process.env.SPEAKING_RTC_TOKEN_TTL_SECONDS, 900, 300, 3600),
  rtcProvider: process.env.SPEAKING_RTC_PROVIDER ?? 'livekit',
  recordingPolicyVersion: process.env.SPEAKING_RECORDING_POLICY_VERSION ?? '2026-08-01',
  analysisModel: process.env.GEMINI_SPEAKING_MODEL ?? 'gemini-3.5-flash-lite',
  disagreementThreshold: Number(process.env.SPEAKING_AI_DISAGREEMENT_THRESHOLD ?? 1),
  recordingRetentionDays: boundedInteger(process.env.SPEAKING_RECORDING_RETENTION_DAYS, 180, 1, 3650),
} as const;

export function publicSpeakingConfig() {
  return {
    enabled: speakingConfig.enabled,
    videoEnabled: speakingConfig.videoEnabled,
    slotMinutes: speakingConfig.slotMinutes,
    defaultTimezone: speakingConfig.defaultTimezone,
    recordingPolicyVersion: speakingConfig.recordingPolicyVersion,
    centreName: speakingConfig.centreName,
    centreAddress: speakingConfig.centreAddress,
  };
}
