import 'server-only';

import { createHash } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { downloadPrivateAsset } from '@/lib/content/private-asset-storage';
import { speakingConfig } from './config';
import {
  SPEAKING_ANALYSIS_SCHEMA_VERSION,
  SPEAKING_PROMPT_VERSION,
  speakingAnalysisSchema,
  validateGrounding,
} from './analysis-schema';
import { buildSpeakingAnalysisPayload, speakingAnalysisSystemInstruction } from './analysis-prompt';

const transcriptSchema = z.array(z.object({
  speaker: z.enum(['candidate', 'examiner', 'uncertain']),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string().max(4_000),
  confidence: z.number().min(0).max(1).optional(),
})).max(2_500);

export async function runSpeakingAnalysis(sessionId: string, transcriptInput: unknown = []) {
  if (!speakingConfig.aiEnabled || !process.env.GEMINI_API_KEY) throw new Error('SPEAKING_AI_NOT_CONFIGURED');
  const transcriptSegments = transcriptSchema.parse(transcriptInput);
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: {
      appointment: { select: { attemptId: true } },
      markers: { orderBy: { offsetMs: 'asc' }, select: { offsetMs: true, part: true, criterion: true, note: true } },
      recordings: { where: { status: 'READY', kind: { in: ['CANDIDATE_AUDIO', 'MIXED_AUDIO'] } }, orderBy: { createdAt: 'asc' }, take: 1 },
      assessments: { where: { stage: 'PROVISIONAL' }, select: { id: true }, take: 1 },
    },
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (!session.assessments.length) throw new Error('PROVISIONAL_SCORE_REQUIRED');
  const recording = session.recordings[0];
  if (!transcriptSegments.length && !recording?.storageKey) throw new Error('RECORDING_NOT_READY');
  // Human scores are deliberately not selected above and therefore cannot be
  // serialized into the independent model input.
  const payload = buildSpeakingAnalysisPayload({
    sessionId,
    contentSnapshot: session.contentSnapshot,
    transcriptSegments,
    examinerMarkers: session.markers,
    audioMetrics: recording ? { recordingKey: recording.storageKey, checksum: recording.checksum } : undefined,
  });
  const inputHash = createHash('sha256').update(payload).digest('hex');
  const existing = await prisma.speakingAiAnalysis.findUnique({
    where: { sessionId_inputHash_promptVersion: { sessionId, inputHash, promptVersion: SPEAKING_PROMPT_VERSION } },
  });
  if (existing?.status === 'SUCCEEDED') return existing;

  const record = await prisma.$transaction(async (tx) => {
    const gradingRun = await tx.gradingRun.upsert({
      where: { idempotencyKey: `speaking-ai:${sessionId}:${inputHash}:${SPEAKING_PROMPT_VERSION}` },
      create: {
        attemptId: session.appointment.attemptId,
        skill: 'SPEAKING', graderKind: 'AI', status: 'RUNNING',
        provider: 'google', model: speakingConfig.analysisModel,
        promptVersion: SPEAKING_PROMPT_VERSION, inputHash,
        idempotencyKey: `speaking-ai:${sessionId}:${inputHash}:${SPEAKING_PROMPT_VERSION}`,
        startedAt: new Date(), runAttempt: 1,
      },
      update: { status: 'RUNNING', startedAt: new Date(), runAttempt: { increment: 1 }, errorCode: null, errorMessage: null },
    });
    const analysis = await tx.speakingAiAnalysis.upsert({
      where: { sessionId_inputHash_promptVersion: { sessionId, inputHash, promptVersion: SPEAKING_PROMPT_VERSION } },
      create: {
        sessionId, gradingRunId: gradingRun.id, status: 'RUNNING', provider: 'google',
        model: speakingConfig.analysisModel, promptVersion: SPEAKING_PROMPT_VERSION,
        schemaVersion: SPEAKING_ANALYSIS_SCHEMA_VERSION, inputHash, startedAt: new Date(), runAttempt: 1,
      },
      update: { status: 'RUNNING', gradingRunId: gradingRun.id, startedAt: new Date(), runAttempt: { increment: 1 }, errorCode: null, errorMessage: null },
    });
    await tx.speakingSession.update({ where: { id: sessionId }, data: { state: 'AI_PROCESSING' } });
    return { analysis, gradingRun };
  });

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
    if (!transcriptSegments.length && recording?.storageKey) {
      const audio = await downloadPrivateAsset(
        recording.storageKey,
        process.env.PRIVATE_SPEAKING_RECORDING_BUCKET ?? 'private-speaking-recordings',
      );
      parts.push({ inlineData: { data: audio.toString('base64'), mimeType: recording.contentType ?? 'audio/ogg' } });
    }
    parts.push({ text: payload });
    const response = await client.models.generateContent({
      model: speakingConfig.analysisModel,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: speakingAnalysisSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: z.toJSONSchema(speakingAnalysisSchema),
      },
    });
    const output = validateGrounding(speakingAnalysisSchema.parse(JSON.parse(response.text || '{}')));
    return await prisma.$transaction(async (tx) => {
      await tx.gradingRun.update({ where: { id: record.gradingRun.id }, data: { status: 'SUCCEEDED', output, completedAt: new Date() } });
      const analysis = await tx.speakingAiAnalysis.update({
        where: { id: record.analysis.id }, data: { status: 'SUCCEEDED', output, completedAt: new Date() },
      });
      await tx.speakingSession.update({ where: { id: sessionId }, data: { state: 'READY_FOR_REVIEW' } });
      return analysis;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SPEAKING_AI_FAILED';
    await prisma.$transaction([
      prisma.gradingRun.update({ where: { id: record.gradingRun.id }, data: { status: 'FAILED', errorCode: 'SPEAKING_AI_FAILED', errorMessage: message, completedAt: new Date() } }),
      prisma.speakingAiAnalysis.update({ where: { id: record.analysis.id }, data: { status: 'FAILED', errorCode: 'SPEAKING_AI_FAILED', errorMessage: message, completedAt: new Date() } }),
      prisma.speakingSession.update({ where: { id: sessionId }, data: { state: 'AWAITING_HUMAN_SCORE' } }),
    ]);
    throw new Error('SPEAKING_AI_FAILED');
  }
}
