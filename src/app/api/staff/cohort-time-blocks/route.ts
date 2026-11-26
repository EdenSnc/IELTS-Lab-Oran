import { z } from 'zod';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { readBoundedText } from '@/lib/http/read-body';
import { cohortBlockSchema } from '@/lib/leads/cohort-time-blocks';
import prisma from '@/lib/prisma';

const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), block: cohortBlockSchema }).strict(),
  z.object({ action: z.literal('publish'), id: z.uuid(), published: z.boolean() }).strict(),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN']);
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return noStoreJson({ error: 'INVALID_CONTENT_TYPE' }, 415);
    }
    const raw = await readBoundedText(request, 2048);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return noStoreJson({ error: 'INVALID_JSON' }, 400); }
    const input = action.parse(body);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ieltslab-cohort-timetable'))`;
      if (input.action === 'add' || input.published) {
        const count = await tx.cohortTimeBlock.count({ where: { published: true, ...(input.action === 'publish' ? { id: { not: input.id } } : {}) } });
        if (count >= 12) throw new AuthError('COHORT_TIMETABLE_LIMIT', 409);
      }
      const block = input.action === 'add' ? await tx.cohortTimeBlock.create({ data: input.block })
        : await tx.cohortTimeBlock.update({ where: { id: input.id }, data: { published: input.published } });
      await tx.staffActionAudit.create({ data: {
        actorUserId: actor.id, action: block.published ? 'COHORT_TIME_PUBLISHED' : 'COHORT_TIME_WITHDRAWN',
        targetType: 'CohortTimeBlock', targetId: block.id, reason: 'Founder camp timetable update',
      } });
    });
    return noStoreJson({ ok: true });
  } catch (error) {
    return apiError(error, 'COHORT_TIMETABLE_SAVE_FAILED');
  }
}
