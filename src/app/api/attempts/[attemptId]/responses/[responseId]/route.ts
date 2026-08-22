import { z } from 'zod';
import { saveResponseOptimistically } from '@/lib/db/concurrency';
import { requireLiveAttemptExecution } from '@/lib/attempts/execution-lease';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

const saveSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  answer: z.string().max(20_000),
  markedForReview: z.boolean().default(false),
}).strict();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; responseId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { attemptId, responseId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    const device = await requireRequestDeviceSlot(request, user.id);
    await requireLiveAttemptExecution({
      request,
      attemptId,
      userId: user.id,
      deviceSlotId: device.id,
    });
    const input = saveSchema.parse(await request.json());
    return noStoreJson(await saveResponseOptimistically({ responseId, attemptId, ...input }));
  } catch (error) {
    return apiError(error, 'RESPONSE_SAVE_FAILED');
  }
}
