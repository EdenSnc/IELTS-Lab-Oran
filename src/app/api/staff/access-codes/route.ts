import { z } from 'zod';
import { generateAccessCodes, listAccessCodes } from '@/lib/access-codes/access-code-service';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

const schema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(50),
  reason: z.string().trim().min(5).max(500),
  expiresAt: z.iso.datetime().nullable().optional(),
}).strict();

export async function GET(request: Request) {
  try {
    await requirePrivilegedRequestUser(request);
    return noStoreJson({ accessCodes: await listAccessCodes() });
  } catch (error) {
    return apiError(error, 'ACCESS_CODE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request);
    const input = schema.parse(await request.json());
    const accessCodes = await generateAccessCodes({
      ...input,
      actorUserId: actor.id,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    return noStoreJson({ accessCodes }, 201);
  } catch (error) {
    return apiError(error, 'ACCESS_CODE_GENERATION_FAILED');
  }
}
