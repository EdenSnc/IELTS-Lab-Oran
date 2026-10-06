import { z } from 'zod';

export const DIAGNOSTIC_PROFILE = {
  code: 'IELTS_LAB_SHORT_ACADEMIC',
  version: 1,
  listeningSeconds: 1_200,
  readingSeconds: 1_200,
  writingSeconds: 1_200,
  writtenSeconds: 3_600,
  audioAllowanceSeconds: 120,
  speaking: { part1Seconds: 120, preparationSeconds: 60, part2Seconds: 90, part3Seconds: 150 },
} as const;

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
// Match published ChoiceOption data, with no extra secret-bearing metadata.
export const diagnosticOptionsSchema = z.array(z.object({
  label: z.string().min(1), text: z.string(),
}).strict()).min(1).refine((options) => new Set(options.map((option) => option.label)).size === options.length, {
  message: 'Option labels must be unique',
}).nullable();

export const diagnosticReviewSchema = z.object({
  partId: z.uuid(),
  contentHash: hash,
  reviewerId: z.uuid(),
  reviewedAt: z.iso.datetime(),
  reviewDueAt: z.iso.datetime(),
  suitability: z.enum(['HARDER_LISTENING', 'REPRESENTATIVE_READING', 'TASK_2_DIAGNOSTIC']),
  audio: z.object({
    assetId: z.uuid(),
    sha256: hash,
    durationSeconds: z.number().int().positive(),
    boundariesVerified: z.literal(true),
  }).strict().optional(),
}).strict().refine((review) => Date.parse(review.reviewedAt) < Date.parse(review.reviewDueAt), {
  message: 'Review due date must follow review date',
});

export type DiagnosticReview = z.infer<typeof diagnosticReviewSchema>;

export const diagnosticSnapshotSchema = z.object({
  code: z.literal(DIAGNOSTIC_PROFILE.code),
  version: z.literal(DIAGNOSTIC_PROFILE.version),
  scoreMeaning: z.literal('DIAGNOSTIC_ONLY'),
  listeningSeconds: z.literal(1_200),
  readingSeconds: z.literal(1_200),
  writingSeconds: z.literal(1_200),
  speakingDelivery: z.literal('IN_PERSON_SEPARATE'),
  reviews: z.array(diagnosticReviewSchema).length(4),
}).strict();

export type DiagnosticSnapshot = z.infer<typeof diagnosticSnapshotSchema>;

export class DiagnosticContentError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function rejectDiagnosticContent(code: string): never {
  throw new DiagnosticContentError(code);
}
