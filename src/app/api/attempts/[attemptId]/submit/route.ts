import { authorizeAttemptSubmission } from '@/lib/attempts/execution-lease';
import { submitAndGradeObjectiveAttempt } from '@/lib/attempts/objective-attempt-grading';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import prisma from '@/lib/prisma';
import { publishWritingGradingRun } from '@/lib/qstash/jobs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    const device = await requireRequestDeviceSlot(request, user.id);
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId: user.id },
      select: { state: true },
    });
    if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
    if (attempt.state === 'ACTIVE') {
      await authorizeAttemptSubmission({
        request,
        attemptId,
        userId: user.id,
        deviceSlotId: device.id,
      });
    }
    const result = await submitAndGradeObjectiveAttempt(attemptId, user.id);
    if (result.writingGradingRunId) {
      try {
        await publishWritingGradingRun(result.writingGradingRunId);
      } catch {
        // The QUEUED GradingRun is durable. Recovery will republish it; a
        // QStash outage must never roll back submission or objective scores.
      }
    }
    return noStoreJson({
      attemptId: result.attemptId,
      state: result.state,
      scores: result.scores,
      writingStatus: result.writingGradingRunId ? 'PENDING' : null,
    });
  } catch (error) {
    return apiError(error, 'ATTEMPT_SUBMISSION_FAILED');
  }
}
