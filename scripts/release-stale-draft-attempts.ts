import prisma from '../src/lib/prisma';
import { releaseAttempt } from '../src/lib/db/concurrency';

const staleBefore = new Date(Date.now() - 30 * 60_000);
const stale = await prisma.assessmentAttempt.findMany({
  where: {
    state: 'DRAFT',
    startedAt: null,
    entitlementId: { not: null },
    createdAt: { lt: staleBefore },
  },
  orderBy: { createdAt: 'asc' },
  take: 100,
  select: { id: true },
});

let released = 0;
for (const attempt of stale) {
  const result = await releaseAttempt({
    attemptId: attempt.id,
    reason: 'Automatic release of an unstarted draft older than 30 minutes.',
    actor: { kind: 'SYSTEM' },
  });
  if (result.released) released += 1;
}

console.log(JSON.stringify({ scanned: stale.length, released }));
await prisma.$disconnect();
