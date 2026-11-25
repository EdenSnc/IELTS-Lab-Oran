import { z } from 'zod';
import { applicationSchema, isIeltsBand, oranToday } from './application';
import { latestAvailabilityEnd } from './availability';

export function normalizeLeadPhone(value: string): string | null {
  let phone = value.normalize('NFKC').trim()
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) & 15))
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (/^2130?[567]\d{8}$/.test(phone)) phone = `+${phone}`;
  if (/^0[567]\d{8}$/.test(phone)) phone = `+213${phone.slice(1)}`;
  phone = phone.replace(/^\+2130(?=[567]\d{8}$)/, '+213');
  if (phone.startsWith('+213')) return /^\+213[567]\d{8}$/.test(phone) ? phone : null;
  return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : null;
}

const optionalText = z.string().trim().max(200).nullish();

export const directLeadSchema = z.object({
  phone: z.string().trim().min(1).max(32).transform((value, context) => {
    const phone = normalizeLeadPhone(value);
    if (phone) return phone;
    context.addIssue({ code: 'custom', message: 'Enter a valid phone number.' });
    return z.NEVER;
  }),
  email: z.string().trim().pipe(z.email().max(320)).nullish(),
  fullName: z.string().trim().min(2).max(120).nullish(),
  utmSource: optionalText,
  utmMedium: optionalText,
  utmCampaign: optionalText,
  utmContent: optionalText,
  scanId: z.uuid().nullish(),
  formName: z.string().trim().min(1).max(200).default('Direct Submission'),
  submissionId: z.uuid().optional(),
  source: z.enum(['lead_magnet_pdf', 'workshop', 'cohort_waitlist', 'unknown']).default('unknown'),
  application: applicationSchema.optional(),
}).strict().superRefine(({ application }, context) => {
  if (!application) return;
  const examField = application.bookedExam ? 'bookedExamDate' : 'targetExamDate';
  const examDate = application[examField];
  if (examDate && examDate < oranToday()) context.addIssue({ code: 'custom', path: ['application', examField], message: 'Choose today or a future date.' });
  if (application.takenIelts && !isIeltsBand(application.recentScore)) {
    context.addIssue({ code: 'custom', path: ['application', 'recentScore'], message: 'Choose an IELTS band from 0 to 9.' });
  }
  if (application.availability?.mode === 'windows' && application.availability.windows.some(({ endHour }) => endHour > latestAvailabilityEnd)) {
    context.addIssue({ code: 'custom', path: ['application', 'availability'], message: 'Availability must end by 20:00.' });
  }
});

export function invalidLeadFields(issues: readonly { path: PropertyKey[] }[]) {
  return [...new Set(issues.map(({ path }) => String(path[path[0] === 'application' ? 1 : 0] ?? 'application')))];
}
