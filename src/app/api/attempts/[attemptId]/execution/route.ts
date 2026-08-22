import { acquireAttemptExecution, heartbeatAttemptExecution } from '@/lib/attempts/execution-lease';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    const deviceSlot = await requireRequestDeviceSlot(request, user.id);
    const execution = await acquireAttemptExecution({ attemptId, userId: user.id, deviceSlot });
    return noStoreJson({
      mode: execution.mode,
      leaseToken: execution.leaseToken,
      startedAt: execution.attempt.startedAt,
      expiresAt: execution.attempt.expiresAt,
    });
  } catch (error) {
    return apiError(error, 'ATTEMPT_EXECUTION_FAILED');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    const deviceSlot = await requireRequestDeviceSlot(request, user.id);
    return noStoreJson(await heartbeatAttemptExecution({
      request,
      attemptId,
      userId: user.id,
      deviceSlotId: deviceSlot.id,
    }));
  } catch (error) {
    return apiError(error, 'ATTEMPT_HEARTBEAT_FAILED');
  }
}
