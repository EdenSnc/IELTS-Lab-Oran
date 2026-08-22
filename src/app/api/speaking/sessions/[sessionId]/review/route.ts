import prisma from '@/lib/prisma';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import { speakingConfig } from '@/lib/speaking/config';

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: { include: { learner: { select: { id: true, name: true } } } },
        markers: { orderBy: { offsetMs: 'asc' } },
        recordings: { where: { status: 'READY' }, orderBy: { kind: 'asc' } },
        assessments: { orderBy: { createdAt: 'asc' } },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (user.role !== 'ADMIN' && session.appointment.examinerId !== user.id) throw new Error('FORBIDDEN');
    const hasProvisional = session.assessments.some((assessment) => assessment.stage === 'PROVISIONAL');
    return noStoreJson({
      session: {
        ...session,
        disagreementThreshold: speakingConfig.disagreementThreshold,
        aiAnalyses: hasProvisional ? session.aiAnalyses : session.aiAnalyses.map((analysis) => ({
          id: analysis.id, status: analysis.status, createdAt: analysis.createdAt, output: null,
        })),
        recordings: session.recordings.map((recording) => ({
          id: recording.id, kind: recording.kind, durationMs: recording.durationMs,
          url: `/api/speaking/recordings/${recording.id}`,
        })),
      },
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_REVIEW_FAILED');
  }
}
