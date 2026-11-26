import { apiError, noStoreJson } from '@/lib/http/api';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const blocks = await prisma.cohortTimeBlock.findMany({
      where: { published: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, days: true, startMinutes: true, endMinutes: true },
    });
    return noStoreJson({ blocks });
  } catch (error) {
    return apiError(error, 'COHORT_TIMETABLE_LOAD_FAILED');
  }
}
