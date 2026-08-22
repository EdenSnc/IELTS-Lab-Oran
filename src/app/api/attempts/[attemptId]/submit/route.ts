import { authorizeAttemptSubmission } from '@/lib/attempts/execution-lease';
import { submitAndGradeObjectiveAttempt } from '@/lib/attempts/objective-attempt-grading';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import prisma from '@/lib/prisma';

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
    return noStoreJson(await submitAndGradeObjectiveAttempt(attemptId, user.id));
  } catch (error) {
    return apiError(error, 'ATTEMPT_SUBMISSION_FAILED');
  }
}
