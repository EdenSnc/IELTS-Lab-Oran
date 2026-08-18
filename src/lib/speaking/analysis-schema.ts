import { z } from 'zod';

export const SPEAKING_ANALYSIS_SCHEMA_VERSION = 'speaking-analysis.v1';
export const SPEAKING_PROMPT_VERSION = 'speaking-copilot.2026-08-01';

const segmentSchema = z.object({
  speaker: z.enum(['candidate', 'examiner', 'uncertain']),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string().max(4_000),
  confidence: z.number().min(0).max(1).optional(),
}).refine((segment) => segment.endMs >= segment.startMs, 'Segment timestamps are reversed');

const evidenceSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  observation: z.string().min(1).max(600),
  transcriptReference: z.string().max(300).optional(),
  whyItMatters: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
}).refine((evidence) => evidence.endMs >= evidence.startMs, 'Evidence timestamps are reversed');

const criterionSchema = z.object({
  suggestedBand: z.number().min(0).max(9).multipleOf(0.5).nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(evidenceSchema).max(8),
  insufficientEvidence: z.boolean(),
});

export const speakingAnalysisSchema = z.object({
  transcript: z.object({ segments: z.array(segmentSchema).max(2_500) }),
  criterionAnalysis: z.object({
    fluencyCoherence: criterionSchema,
    lexicalResource: criterionSchema,
    grammaticalRangeAccuracy: criterionSchema,
    pronunciation: criterionSchema,
  }),
  observations: z.array(z.string().max(600)).max(12),
  metrics: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
  suggestedPriorities: z.array(z.object({
    criterion: z.enum(['FC', 'LR', 'GRA', 'P']),
    problem: z.string().min(1).max(500),
    evidence: z.string().min(1).max(500),
    whyItMatters: z.string().min(1).max(500),
    recommendedPractice: z.string().min(1).max(500),
  })).max(3),
  uncertainty: z.object({
    summary: z.string().max(1_000),
    insufficientAudioRanges: z.array(z.object({ startMs: z.number().int().nonnegative(), endMs: z.number().int().nonnegative() })).max(30),
  }),
  warnings: z.array(z.string().max(500)).max(12),
});

export type SpeakingAnalysis = z.infer<typeof speakingAnalysisSchema>;

export function validateGrounding(analysis: SpeakingAnalysis) {
  const candidateSegments = analysis.transcript.segments.filter((segment) => segment.speaker === 'candidate');
  const ranges = candidateSegments.map((segment) => ({ start: segment.startMs, end: segment.endMs, text: segment.text }));
  for (const criterion of Object.values(analysis.criterionAnalysis)) {
    criterion.evidence = criterion.evidence.filter((evidence) => {
      const segment = ranges.find((range) => evidence.startMs >= range.start && evidence.endMs <= range.end);
      if (!segment) return false;
      return !evidence.transcriptReference || segment.text.includes(evidence.transcriptReference);
    });
  }
  return analysis;
}
