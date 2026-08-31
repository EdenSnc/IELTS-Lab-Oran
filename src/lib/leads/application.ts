import { z } from 'zod';

const nullableShortText = z.string().trim().max(200).nullish();
const isoDate = z.string().date();

export const applicationSchema = z.object({
  schemaVersion: z.literal(2),
  discoverySource: z.enum(['social_media', 'workshop', 'friend', 'other']),
  bookedExam: z.boolean(),
  bookedExamDate: isoDate.nullish(),
  targetExamDate: isoDate.nullish(),
  purpose: z.enum(['higher_education', 'immigration', 'career', 'other']),
  universityAdmission: z.boolean(),
  targetCountry: z.string().trim().min(2).max(100),
  targetBand: z.enum(['5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5-9.0']),
  takenIelts: z.boolean(),
  recentScore: z.string().trim().max(50).nullish(),
  challengingModules: z.array(
    z.enum(['listening', 'reading', 'writing', 'speaking']),
  ).min(1).max(4),
  englishLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1+']),
  urgencyAndObstacles: z.string().trim().min(10).max(1_500),
  commitmentAccepted: z.literal(true),
  locale: z.enum(['en', 'fr', 'ar']),
  attribution: z.object({
    utmTerm: nullableShortText,
    utmContent: nullableShortText,
    gclid: nullableShortText,
    fbclid: nullableShortText,
    landingPath: z.string().trim().max(500).nullish(),
    referrerHost: z.string().trim().max(253).nullish(),
  }).strict(),
}).strict().superRefine((application, context) => {
  if (application.bookedExam && !application.bookedExamDate) {
    context.addIssue({
      code: 'custom',
      path: ['bookedExamDate'],
      message: 'A booked test date is required.',
    });
  }
  if (!application.bookedExam && !application.targetExamDate) {
    context.addIssue({
      code: 'custom',
      path: ['targetExamDate'],
      message: 'A target test date is required.',
    });
  }
  if (application.takenIelts && !application.recentScore) {
    context.addIssue({
      code: 'custom',
      path: ['recentScore'],
      message: 'The most recent score is required.',
    });
  }
});

export type ApplicationData = z.infer<typeof applicationSchema>;

export function boundedTallyAnswer(value: unknown): string | string[] | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().slice(0, 2_000) || null;
  }
  if (Array.isArray(value)) {
    const values = value
      .map((entry) => boundedTallyAnswer(entry))
      .flatMap((entry) => Array.isArray(entry) ? entry : entry ? [entry] : [])
      .slice(0, 20);
    return values.length ? values : null;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, 2_000);
    } catch {
      return null;
    }
  }
  return null;
}
