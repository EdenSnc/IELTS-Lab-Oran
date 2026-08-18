import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const includeWithoutAvailability = user.role === 'ADMIN'
      && new URL(request.url).searchParams.get('includeWithoutAvailability') === 'true';
    const examiners = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: ['TEACHER', 'ADMIN'] },
        ...(includeWithoutAvailability ? {} : {
          OR: [
            { speakingRules: { some: { active: true } } },
            { speakingOverrides: { some: { kind: 'AVAILABLE', date: { gte: new Date() } } } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        speakingRules: {
          where: { active: true },
          select: { timezone: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
    return noStoreJson({
      examiners: examiners.map(({ speakingRules, ...examiner }) => ({
        ...examiner,
        timezone: speakingRules[0]?.timezone ?? 'Africa/Algiers',
      })),
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_EXAMINERS_FAILED');
  }
}
