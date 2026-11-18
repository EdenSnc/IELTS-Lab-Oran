import { z } from 'zod';
import prisma from '@/lib/prisma';
import { resultAccessActive } from '@/lib/attempts/result-access';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { AuthError, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';

export async function GET(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const user = await requireRequestUser(request, ['STUDENT']);
    await requireRequestDeviceSlot(request, user.id);
    const { attemptId } = await context.params;
    if (!z.string().uuid().safeParse(attemptId).success) throw new Error('ATTEMPT_NOT_FOUND');
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        entitlement: { select: { status: true, endsAt: true } },
        skillScores: { select: { skill: true, band: true, finalizedAt: true } },
        speakingAppointment: {
          include: { session: { include: { assessments: { where: { stage: 'FINAL' }, take: 1, select: { overallBand: true, priorities: true } } } } },
        },
      },
    });
    if (!attempt || attempt.userId !== user.id) throw new Error('ATTEMPT_NOT_FOUND');
    if (
      attempt.entitlement
      && (attempt.entitlement.status === 'REVOKED' || !resultAccessActive(attempt.entitlement.endsAt))
    ) {
      throw new AuthError('RESULT_ACCESS_EXPIRED', 403);
    }
    const appointment = attempt.speakingAppointment;
    const finalSpeaking = appointment?.session?.assessments[0];
    const speakingStatus = !appointment ? 'NOT_BOOKED'
      : appointment.status === 'BOOKED' ? 'BOOKED'
        : finalSpeaking ? 'RESULT_AVAILABLE' : 'AWAITING_ASSESSMENT';
    const hasAllFour = new Set(attempt.skillScores.map((score) => score.skill)).size === 4;
    return noStoreJson({
      attemptId,
      completeResultAvailable: hasAllFour && attempt.overallBand != null,
      overallBand: hasAllFour ? attempt.overallBand : null,
      componentScores: attempt.skillScores,
      speaking: {
        status: speakingStatus,
        scheduledStartAt: appointment?.scheduledStartAt ?? null,
        band: finalSpeaking?.overallBand ?? null,
        priorities: finalSpeaking?.priorities ?? null,
      },
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_RESULT_FAILED');
  }
}
