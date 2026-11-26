import { z } from 'zod';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { readBoundedText } from '@/lib/http/read-body';
import { cohortBlockSchema } from '@/lib/leads/cohort-time-blocks';
import prisma from '@/lib/prisma';

const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), block: cohortBlockSchema, published: z.boolean().default(true) }).strict(),
  z.object({ action: z.literal('publish'), id: z.uuid(), published: z.boolean() }).strict(),
  z.object({ action: z.literal('edit'), id: z.uuid(), block: cohortBlockSchema }).strict(),
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
      if (input.action !== 'edit' && input.published) {
        const count = await tx.cohortTimeBlock.count({ where: { published: true, ...(input.action === 'publish' ? { id: { not: input.id } } : {}) } });
        if (count >= 12) throw new AuthError('COHORT_TIMETABLE_LIMIT', 409);
      }
      let block;
      if (input.action === 'edit') {
        const old = await tx.cohortTimeBlock.findUnique({ where: { id: input.id, supersededAt: null } });
        if (!old) throw new AuthError('COHORT_TIME_BLOCK_CHANGED', 409);
        await tx.cohortTimeBlock.update({ where: { id: old.id }, data: { published: false, supersededAt: new Date() } });
        // A fresh ID rejects stale application forms. Earlier submissions keep their saved schedule.
        block = await tx.cohortTimeBlock.create({ data: { ...input.block, published: old.published } });
      } else if (input.action === 'add') {
        block = await tx.cohortTimeBlock.create({ data: { ...input.block, published: input.published } });
      } else {
        const { count } = await tx.cohortTimeBlock.updateMany({
          where: { id: input.id, supersededAt: null }, data: { published: input.published },
        });
        if (!count) throw new AuthError('COHORT_TIME_BLOCK_CHANGED', 409);
        block = { id: input.id, published: input.published };
      }
      await tx.staffActionAudit.create({ data: {
        actorUserId: actor.id, action: input.action === 'edit' ? 'COHORT_TIME_EDITED'
          : block.published ? 'COHORT_TIME_PUBLISHED' : input.action === 'add' ? 'COHORT_TIME_DRAFTED' : 'COHORT_TIME_WITHDRAWN',
        targetType: 'CohortTimeBlock', targetId: block.id, reason: 'Founder camp timetable update',
        ...(input.action === 'edit' ? { metadata: { supersedes: input.id } } : {}),
      } });
    });
    return noStoreJson({ ok: true });
  } catch (error) {
    return apiError(error, 'COHORT_TIMETABLE_SAVE_FAILED');
  }
}
