import { z } from 'zod';
import { diagnosticWritingFeedbackSchema } from './writing-core';

const note = z.string().trim().min(1).max(1200);
export const diagnosticSpeakingFeedbackSchema = z.object({
  observations: z.array(note).min(1).max(8), nextSteps: z.array(note).max(3), limitations: z.array(note).min(1).max(5),
}).strict();
export const diagnosticAssessmentEditSchema = z.object({
  expectedVersion: z.number().int().nonnegative(), writing: diagnosticWritingFeedbackSchema,
  speaking: diagnosticSpeakingFeedbackSchema.nullable(), nextSteps: z.array(note).max(3),
  writingRunId: z.uuid().nullable().optional(),
  speakingRunId: z.uuid().nullable().optional(),
}).strict();
export type DiagnosticAssessmentEdit = z.infer<typeof diagnosticAssessmentEditSchema>;
export type DiagnosticSpeakingFeedback = z.infer<typeof diagnosticSpeakingFeedbackSchema>;
