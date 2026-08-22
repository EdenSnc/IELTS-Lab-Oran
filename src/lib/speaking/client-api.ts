'use client';

function storedAccessToken() {
  if (typeof window === 'undefined') return null;
  const direct = window.localStorage.getItem('ielts-access-token');
  if (direct) return direct;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      if (typeof parsed.access_token === 'string') return parsed.access_token;
    } catch { /* Ignore unrelated storage entries. */ }
  }
  return null;
}

export async function speakingApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = storedAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const friendly: Record<string, string> = {
      AUTH_REQUIRED: 'Sign in to manage your Speaking appointment.',
      INVALID_SESSION: 'Your session expired. Sign in again.',
      RECORDING_CONSENT_REQUIRED: 'Recording consent is required before joining.',
      AI_ANALYSIS_CONSENT_REQUIRED: 'The candidate has not consented to optional AI-assisted analysis.',
      JOIN_WINDOW_CLOSED: 'This interview is not open for joining yet.',
      SPEAKING_RTC_NOT_CONFIGURED: 'The live room is not configured yet.',
      SPEAKING_RECORDING_NOT_CONFIGURED: 'Private recording is not configured yet.',
      INVALID_REQUEST: 'Please check the selected date, time, and form values.',
      SLOT_CONFLICT: 'That time was just booked or is no longer available. Choose another time.',
      APPOINTMENT_CONFLICT: 'This test already has an active Speaking appointment.',
      ATTEMPT_NOT_FOUND: 'That test attempt is not eligible for this appointment.',
      EXAMINER_NOT_FOUND: 'That examiner is no longer available.',
      CANCELLATION_WINDOW_CLOSED: 'The cancellation or rescheduling window has closed.',
      APPOINTMENT_ALREADY_STARTED: 'A started or completed interview cannot be cancelled or rescheduled.',
      FORBIDDEN: 'You do not have permission to perform this action.',
      AVAILABILITY_NOT_FOUND: 'That availability entry no longer exists.',
      IN_PERSON_APPOINTMENT: 'This appointment takes place at the centre and does not use the online call room.',
    };
    throw new Error(friendly[body.error] ?? body.error ?? 'Request failed.');
  }
  return body as T;
}
