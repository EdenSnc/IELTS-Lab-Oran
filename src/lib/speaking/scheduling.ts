export type AvailabilityWindow = {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  appointmentDurationMinutes: number;
  deliveryMode?: 'ONLINE' | 'IN_PERSON';
  validFrom?: Date | null;
  validUntil?: Date | null;
};

export type AvailabilityOverride = {
  date: Date;
  kind: 'AVAILABLE' | 'BLACKOUT';
  startMinute?: number | null;
  endMinute?: number | null;
  appointmentDurationMinutes?: number | null;
  timezone: string;
  deliveryMode?: 'ONLINE' | 'IN_PERSON' | null;
};

export type OccupiedWindow = { start: Date; end: Date };
export type SpeakingSlot = { start: Date; end: Date; timezone: string };

function calendarParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

export function zonedLocalToUtc(date: string, minuteOfDay: number, timezone: string) {
  const [year, month, day] = date.split('-').map(Number);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(localAsUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = calendarParts(candidate, timezone);
    const representedAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const delta = localAsUtc - representedAsUtc;
    if (delta === 0) break;
    candidate = new Date(candidate.getTime() + delta);
  }
  const verified = calendarParts(candidate, timezone);
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== hour || verified.minute !== minute) {
    throw new Error('INVALID_LOCAL_TIME');
  }
  return candidate;
}

export function localDateKey(value: Date, timezone: string) {
  const parts = calendarParts(value, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function utcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function overlaps(left: OccupiedWindow, right: OccupiedWindow) {
  return left.start < right.end && right.start < left.end;
}

export function generateSpeakingSlots(input: {
  date: string;
  deliveryMode?: 'ONLINE' | 'IN_PERSON';
  rules: AvailabilityWindow[];
  overrides: AvailabilityOverride[];
  occupied: OccupiedWindow[];
  now?: Date;
}) {
  const [year, month, day] = input.date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dayOverrides = input.overrides.filter((item) => utcDateKey(item.date) === input.date);
  if (dayOverrides.some((item) => item.kind === 'BLACKOUT')) return [];
  const overrideWindows = dayOverrides.filter((item) => item.kind === 'AVAILABLE' && (!input.deliveryMode || item.deliveryMode === input.deliveryMode)).map((item) => ({
    weekday,
    startMinute: item.startMinute ?? 0,
    endMinute: item.endMinute ?? 0,
    timezone: item.timezone,
    appointmentDurationMinutes: item.appointmentDurationMinutes ?? 20,
  }));
  const recurring = input.rules.filter((rule) => {
    if (input.deliveryMode && rule.deliveryMode !== input.deliveryMode) return false;
    if (rule.weekday !== weekday) return false;
    const from = rule.validFrom ? utcDateKey(rule.validFrom) : null;
    const until = rule.validUntil ? utcDateKey(rule.validUntil) : null;
    return (!from || input.date >= from) && (!until || input.date <= until);
  });
  const windows = overrideWindows.length ? overrideWindows : recurring;
  const now = input.now ?? new Date();
  const slots: SpeakingSlot[] = [];
  for (const window of windows) {
    const duration = window.appointmentDurationMinutes;
    for (let minute = window.startMinute; minute + duration <= window.endMinute; minute += duration) {
      const start = zonedLocalToUtc(input.date, minute, window.timezone);
      const end = new Date(start.getTime() + duration * 60_000);
      const candidate = { start, end, timezone: window.timezone };
      if (start > now && !input.occupied.some((item) => overlaps(candidate, item))) slots.push(candidate);
    }
  }
  return slots.sort((left, right) => left.start.getTime() - right.start.getTime());
}

export function canCancelAppointment(start: Date, now: Date, minimumHours: number) {
  return start.getTime() - now.getTime() >= minimumHours * 3_600_000;
}
