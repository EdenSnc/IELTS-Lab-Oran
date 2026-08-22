import { loadAttemptDelivery } from '@/lib/attempts/load-attempt-delivery';
import { requireLiveAttemptExecution } from '@/lib/attempts/execution-lease';
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
    const device = await requireRequestDeviceSlot(request, user.id);
    await requireLiveAttemptExecution({
      request,
      attemptId,
      userId: user.id,
      deviceSlotId: device.id,
    });
    return noStoreJson(await loadAttemptDelivery(attemptId, user.id));
  } catch (error) {
    return apiError(error, 'ATTEMPT_LOAD_FAILED');
  }
}
