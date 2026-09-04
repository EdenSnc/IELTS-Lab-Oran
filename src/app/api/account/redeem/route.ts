import { z } from 'zod';
import { redeemAccessCode } from '@/lib/access-codes/access-code-service';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { requireHumanRequest } from '@/lib/security/bot';

const schema = z.object({ code: z.string().trim().min(10).max(64) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireHumanRequest();
    const user = await requireRequestUser(request, ['STUDENT']);
    const result = await redeemAccessCode({ userId: user.id, ...schema.parse(await request.json()) });
    return noStoreJson(result, result.replay ? 200 : 201);
  } catch (error) {
    return apiError(error, 'ACCESS_CODE_REDEMPTION_FAILED');
  }
}
