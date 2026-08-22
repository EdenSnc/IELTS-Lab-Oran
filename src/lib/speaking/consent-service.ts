import 'server-only';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { speakingConfig } from './config';

function sourceFor(sessionId: string) {
  return `speaking-session:${sessionId}`;
}

export async function recordSpeakingConsent(input: {
  sessionId: string;
  learnerId: string;
  aiAnalysis: boolean;
  trainingData: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."SpeakingSession"
      WHERE id = ${input.sessionId}::uuid
      FOR UPDATE
    `);
    const session = await tx.speakingSession.findFirst({
      where: { id: input.sessionId, appointment: { learnerId: input.learnerId } },
      select: { id: true, consentRecordId: true },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (!session.consentRecordId) {
      const consent = await tx.consentRecord.create({
        data: {
          userId: input.learnerId,
          type: 'RECORDING',
          action: 'ACCEPTED',
          policyVersion: speakingConfig.recordingPolicyVersion,
          acceptedFrom: sourceFor(session.id),
        },
      });
      await tx.speakingSession.update({
        where: { id: session.id },
        data: {
          consentRecordId: consent.id,
          recordingConsentAt: consent.createdAt,
          recordingPolicyVersion: speakingConfig.recordingPolicyVersion,
        },
      });
    }
    for (const decision of [
      {
        type: 'AI_ASSISTED_GRADING' as const,
        action: input.aiAnalysis ? 'ACCEPTED' as const : 'WITHDRAWN' as const,
        policyVersion: speakingConfig.aiPolicyVersion,
      },
      {
        type: 'TRAINING_DATA' as const,
        action: input.trainingData ? 'ACCEPTED' as const : 'WITHDRAWN' as const,
        policyVersion: speakingConfig.trainingPolicyVersion,
      },
    ]) {
      const previous = await tx.consentRecord.findFirst({
        where: {
          userId: input.learnerId,
          type: decision.type,
          acceptedFrom: sourceFor(session.id),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { action: true, policyVersion: true },
      });
      if (previous?.action !== decision.action || previous.policyVersion !== decision.policyVersion) {
        await tx.consentRecord.create({
          data: { userId: input.learnerId, acceptedFrom: sourceFor(session.id), ...decision },
        });
      }
    }
    return { consented: true as const, aiAnalysis: input.aiAnalysis, trainingData: input.trainingData };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function hasSpeakingAiConsent(sessionId: string, learnerId: string) {
  const consent = await prisma.consentRecord.findFirst({
    where: {
      userId: learnerId,
      type: 'AI_ASSISTED_GRADING',
      acceptedFrom: sourceFor(sessionId),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { action: true },
  });
  return consent?.action === 'ACCEPTED';
}
