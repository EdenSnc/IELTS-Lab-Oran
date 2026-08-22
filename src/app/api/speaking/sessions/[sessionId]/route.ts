import prisma from '@/lib/prisma';
import { isExaminer, requirePrivilegedRequestUser, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireRequestUser(request);
    if (isExaminer(user.role)) await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: { include: { learner: { select: { id: true, name: true } }, examiner: { select: { id: true, name: true } } } },
        markers: { orderBy: { offsetMs: 'asc' } },
        recordings: { select: { id: true, kind: true, status: true, durationMs: true } },
        assessments: { select: { id: true, stage: true, overallBand: true, createdAt: true } },
        aiAnalyses: { select: { id: true, status: true, promptVersion: true, schemaVersion: true, completedAt: true } },
      },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    const examiner = isExaminer(user.role) && (user.role === 'ADMIN' || session.appointment.examinerId === user.id);
    if (session.appointment.learnerId !== user.id && !examiner) throw new Error('FORBIDDEN');
    if (examiner) return noStoreJson({ session });
    return noStoreJson({
      session: {
        id: session.id,
        state: session.state,
        currentPart: session.currentPart,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        recordingConsentAt: session.recordingConsentAt,
        appointment: {
          id: session.appointment.id,
          status: session.appointment.status,
          scheduledStartAt: session.appointment.scheduledStartAt,
          scheduledEndAt: session.appointment.scheduledEndAt,
          deliveryMode: session.appointment.deliveryMode,
        },
      },
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_SESSION_FAILED');
  }
}
