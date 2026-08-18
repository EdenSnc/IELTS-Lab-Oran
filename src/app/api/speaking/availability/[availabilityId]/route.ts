import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

const querySchema = z.object({ type: z.enum(['rule', 'override']) });

export async function DELETE(request: Request, context: { params: Promise<{ availabilityId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const { availabilityId } = await context.params;
    z.uuid().parse(availabilityId);
    const { type } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const record = type === 'rule'
      ? await prisma.speakingAvailabilityRule.findUnique({ where: { id: availabilityId }, select: { examinerId: true } })
      : await prisma.speakingAvailabilityOverride.findUnique({ where: { id: availabilityId }, select: { examinerId: true } });
    if (!record) throw new Error('AVAILABILITY_NOT_FOUND');
    if (record.examinerId !== user.id && user.role !== 'ADMIN') throw new Error('FORBIDDEN');
    if (type === 'rule') await prisma.speakingAvailabilityRule.delete({ where: { id: availabilityId } });
    else await prisma.speakingAvailabilityOverride.delete({ where: { id: availabilityId } });
    return noStoreJson({ deleted: true });
  } catch (error) {
    return apiError(error, 'SPEAKING_AVAILABILITY_DELETE_FAILED');
  }
}
