import { loadStoredAttemptResult } from '@/lib/attempts/attempt-results';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import { recordFunnelEvent } from '@/lib/growth/funnel-events';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    await requireRequestDeviceSlot(request, user.id);
    const result = await loadStoredAttemptResult(attemptId, user.id);
    await recordFunnelEvent({
      type: 'RESULT_VIEWED',
      idempotencyKey: `attempt:${attemptId}:result-viewed`,
      userId: user.id,
      attemptId,
    });
    return noStoreJson(result);
  } catch (error) {
    return apiError(error, 'ATTEMPT_RESULTS_FAILED');
  }
}
