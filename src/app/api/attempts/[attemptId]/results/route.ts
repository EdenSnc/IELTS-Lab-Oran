import { loadStoredAttemptResult } from '@/lib/attempts/attempt-results';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    await requireRequestDeviceSlot(request, user.id);
    return noStoreJson(await loadStoredAttemptResult(attemptId, user.id));
  } catch (error) {
    return apiError(error, 'ATTEMPT_RESULTS_FAILED');
  }
}
