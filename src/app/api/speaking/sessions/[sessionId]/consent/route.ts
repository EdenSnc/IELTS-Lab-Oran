import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { speakingConfig } from '@/lib/speaking/config';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    const { sessionId } = await context.params;
    const session = await prisma.speakingSession.findFirst({
      where: { id: sessionId, appointment: { learnerId: user.id } },
      select: { id: true, consentRecordId: true },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.consentRecordId) return noStoreJson({ consented: true });
    await prisma.$transaction(async (tx) => {
      const consent = await tx.consentRecord.create({
        data: {
          userId: user.id,
          type: 'RECORDING',
          action: 'ACCEPTED',
          policyVersion: speakingConfig.recordingPolicyVersion,
          acceptedFrom: 'speaking-preflight',
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
    });
    return noStoreJson({ consented: true });
  } catch (error) {
    return apiError(error, 'SPEAKING_CONSENT_FAILED');
  }
}
