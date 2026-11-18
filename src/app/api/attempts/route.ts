import { z } from 'zod';
import { AttemptMode } from '@prisma/client';
import { createAuthenticatedAttempt } from '@/lib/attempts/attempt-service';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

const createAttemptSchema = z.object({
  entitlementId: z.string().uuid(),
  blueprintId: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    await requireRequestDeviceSlot(request, user.id);
    const input = createAttemptSchema.parse(await request.json());
    const attempt = await createAuthenticatedAttempt({
      userId: user.id,
      mode: AttemptMode.STRICT,
      ...input,
    });
    return noStoreJson({
      id: attempt.id,
      state: attempt.state,
      mode: attempt.mode,
      manifestContentHash: attempt.manifest?.contentHash,
      questionCount: attempt.questions.length,
    }, 201);
  } catch (error) {
    return apiError(error, 'ATTEMPT_CREATION_FAILED');
  }
}
