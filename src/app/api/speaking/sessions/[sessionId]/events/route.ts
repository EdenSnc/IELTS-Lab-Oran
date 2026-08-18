import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { assertSessionTransition, partForState, type SessionState } from '@/lib/speaking/lifecycle';

const eventSchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['start', 'part2', 'part3', 'end']) }),
  z.object({ action: z.literal('mark'), criterion: z.enum(['FC', 'LR', 'GRA', 'P']).optional(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal('saveNotes'), notes: z.string().max(10_000) }),
]);

function targetState(action: 'start' | 'part2' | 'part3' | 'end') {
  if (action === 'start') return 'LIVE_PART_1' as const;
  if (action === 'part2') return 'LIVE_PART_2' as const;
  if (action === 'part3') return 'LIVE_PART_3' as const;
  return 'ENDED' as const;
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    const event = eventSchema.parse(await request.json());
    const session = await prisma.speakingSession.findUnique({ where: { id: sessionId }, include: { appointment: true } });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (user.role !== 'ADMIN' && session.appointment.examinerId !== user.id) throw new Error('FORBIDDEN');
    if (event.action === 'saveNotes') {
      const updated = await prisma.speakingSession.update({
        where: { id: sessionId },
        data: { examinerNotes: event.notes },
        select: { id: true, updatedAt: true },
      });
      return noStoreJson({ session: updated });
    }
    if (event.action === 'mark') {
      if (!session.startedAt || !session.state.startsWith('LIVE_')) throw new Error('INVALID_SESSION_TRANSITION');
      const marker = await prisma.speakingEvidenceMarker.create({
        data: {
          sessionId,
          createdById: user.id,
          offsetMs: Math.max(0, Date.now() - session.startedAt.getTime()),
          part: session.currentPart,
          criterion: event.criterion,
          note: event.note,
        },
      });
      return noStoreJson({ marker });
    }
    const next = targetState(event.action);
    assertSessionTransition(session.state as SessionState, next);
    if (event.action === 'start' && session.appointment.deliveryMode === 'ONLINE' && !session.recordingConsentAt) throw new Error('RECORDING_CONSENT_REQUIRED');
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.speakingSession.update({
        where: { id: sessionId, state: session.state },
        data: {
          state: next,
          currentPart: partForState(next),
          ...(event.action === 'start' ? { startedAt: now, ...(session.appointment.deliveryMode === 'ONLINE' ? { recordingStartedAt: now } : {}) } : {}),
          ...(event.action === 'end' ? { endedAt: now } : {}),
        },
      });
      if (event.action === 'start' && session.appointment.deliveryMode === 'ONLINE') {
        await tx.speakingRecording.createMany({
          data: [
            { sessionId, kind: 'CANDIDATE_AUDIO', status: 'REQUESTED' },
            { sessionId, kind: 'EXAMINER_AUDIO', status: 'REQUESTED' },
          ],
        });
      }
      return result;
    });
    return noStoreJson({ session: updated });
  } catch (error) {
    return apiError(error, 'SPEAKING_SESSION_EVENT_FAILED');
  }
}
