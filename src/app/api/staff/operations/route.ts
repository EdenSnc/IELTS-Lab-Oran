import { z } from 'zod';
import { releaseAttempt } from '@/lib/db/concurrency';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { extendEntitlementAccess, loadStaffPaymentOperations } from '@/lib/payments/staff-operations';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('release_attempt'), attemptId: z.string().uuid(), reason: z.string().trim().min(5).max(500), force: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('extend_access'), entitlementId: z.string().uuid(), days: z.number().int().min(1).max(365), reason: z.string().trim().min(5).max(500) }).strict(),
]);

export async function GET(request: Request) {
  try {
    await requirePrivilegedRequestUser(request);
    return noStoreJson(await loadStaffPaymentOperations());
  } catch (error) {
    return apiError(error, 'STAFF_OPERATIONS_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request);
    const input = schema.parse(await request.json());
    if (input.action === 'release_attempt') {
      const result = await releaseAttempt({ attemptId: input.attemptId, reason: input.reason, force: input.force, actor: { kind: 'STAFF', userId: user.id } });
      if (!result.released) throw new AuthError('ATTEMPT_ALREADY_RELEASED', 409);
      return noStoreJson({ success: true });
    }
    await extendEntitlementAccess({ entitlementId: input.entitlementId, days: input.days, reason: input.reason, actorUserId: user.id });
    return noStoreJson({ success: true });
  } catch (error) {
    return apiError(error, 'STAFF_ACTION_FAILED');
  }
}
