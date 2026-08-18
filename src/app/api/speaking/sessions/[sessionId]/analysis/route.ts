import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { runSpeakingAnalysis } from '@/lib/speaking/analysis-service';

const schema = z.object({ transcriptSegments: z.array(z.unknown()).max(2_500).default([]) });

async function authorizedSession(userId: string, role: string, sessionId: string) {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: { appointment: true, assessments: { where: { stage: 'PROVISIONAL' }, take: 1 } },
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (role !== 'ADMIN' && session.appointment.examinerId !== userId) throw new Error('FORBIDDEN');
  if (!session.assessments.length) throw new Error('PROVISIONAL_SCORE_REQUIRED');
  return session;
}

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    await authorizedSession(user.id, user.role, sessionId);
    const analysis = await prisma.speakingAiAnalysis.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' } });
    return noStoreJson({ analysis });
  } catch (error) {
    return apiError(error, 'SPEAKING_ANALYSIS_FAILED');
  }
}

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    await authorizedSession(user.id, user.role, sessionId);
    const input = schema.parse(await request.json());
    return noStoreJson({ analysis: await runSpeakingAnalysis(sessionId, input.transcriptSegments) }, 202);
  } catch (error) {
    return apiError(error, 'SPEAKING_ANALYSIS_FAILED');
  }
}
