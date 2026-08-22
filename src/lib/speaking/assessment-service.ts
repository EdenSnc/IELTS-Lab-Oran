import 'server-only';

import { createHash } from 'node:crypto';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { finalizeAttemptIfReady } from '@/lib/attempts/finalize-attempt';
import { deriveSpeakingBand } from './lifecycle';
import { canPublishSpeakingResult } from './permissions';

export type HumanSpeakingScores = {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  pronunciation: number;
  notes?: string;
  priorities?: Array<{
    criterion: 'FC' | 'LR' | 'GRA' | 'P';
    problem: string;
    evidence: string;
    whyItMatters: string;
    recommendedPractice: string;
  }>;
};

function normalized(input: HumanSpeakingScores) {
  const values = [input.fluencyCoherence, input.lexicalResource, input.grammaticalRange, input.pronunciation];
  return { ...input, overallBand: deriveSpeakingBand(values), priorities: (input.priorities ?? []).slice(0, 3) };
}

export async function saveHumanSpeakingAssessment(input: {
  user: User;
  sessionId: string;
  stage: 'PROVISIONAL' | 'FINAL';
  scores: HumanSpeakingScores;
}) {
  const scores = normalized(input.scores);
  const session = await prisma.speakingSession.findUnique({
    where: { id: input.sessionId },
    include: { appointment: true, assessments: true },
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (!canPublishSpeakingResult(input.user, session.appointment)) throw new Error('FORBIDDEN');
  if (!session.endedAt) throw new Error('SESSION_NOT_ENDED');
  const provisional = session.assessments.find((assessment) => assessment.stage === 'PROVISIONAL');
  if (input.stage === 'FINAL' && !provisional) throw new Error('PROVISIONAL_SCORE_REQUIRED');
  const existing = session.assessments.find((assessment) => assessment.stage === input.stage);
  if (existing) return existing;

  if (input.stage === 'PROVISIONAL') {
    return prisma.$transaction(async (tx) => {
      const assessment = await tx.speakingHumanAssessment.create({
        data: { sessionId: input.sessionId, assessorId: input.user.id, stage: 'PROVISIONAL', ...scores },
      });
      if (['ENDED', 'RECORDING_PROCESSING'].includes(session.state)) {
        await tx.speakingSession.update({ where: { id: input.sessionId }, data: { state: 'AWAITING_HUMAN_SCORE' } });
      }
      return assessment;
    });
  }

  const hash = createHash('sha256').update(JSON.stringify(scores)).digest('hex');
  return prisma.$transaction(async (tx) => {
    const gradingRun = await tx.gradingRun.create({
      data: {
        attemptId: session.appointment.attemptId,
        skill: 'SPEAKING', graderKind: 'HUMAN', status: 'SUCCEEDED', isFinal: true,
        idempotencyKey: `speaking-human-final:${input.sessionId}`,
        inputHash: hash, output: scores, startedAt: new Date(), completedAt: new Date(), finalizedAt: new Date(), runAttempt: 1,
      },
    });
    const assessment = await tx.speakingHumanAssessment.create({
      data: {
        sessionId: input.sessionId, assessorId: input.user.id, gradingRunId: gradingRun.id,
        stage: 'FINAL', ...scores, aiAnalysisRevealedAt: new Date(),
      },
    });
    await tx.attemptSkillScore.upsert({
      where: { attemptId_skill: { attemptId: session.appointment.attemptId, skill: 'SPEAKING' } },
      create: { attemptId: session.appointment.attemptId, gradingRunId: gradingRun.id, skill: 'SPEAKING', band: scores.overallBand },
      update: { gradingRunId: gradingRun.id, band: scores.overallBand, finalizedAt: new Date() },
    });
    await finalizeAttemptIfReady(tx, session.appointment.attemptId);
    await tx.speakingSession.update({ where: { id: input.sessionId }, data: { state: 'FINALIZED' } });
    await tx.speakingAppointment.update({ where: { id: session.appointmentId }, data: { status: 'COMPLETED' } });
    return assessment;
  });
}
