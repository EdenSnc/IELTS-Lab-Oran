import 'server-only';

import { Client } from '@upstash/qstash';
import prisma from '@/lib/prisma';
import { qstashEndpoint } from './verification';

export {
  qstashEndpoint,
  verifyQStashRequest,
  writingGradingJobSchema,
  writingRecoveryJobSchema,
} from './verification';

function qstashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error('QSTASH_TOKEN_NOT_CONFIGURED');
  return new Client({ token });
}

export async function publishWritingGradingRun(gradingRunId: string) {
  const run = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.gradingRun.findUnique({
      where: { id: gradingRunId },
      select: { id: true, status: true, enqueueAttempt: true, lastEnqueuedAt: true },
    });
    if (!existing) throw new Error('GRADING_RUN_NOT_FOUND');
    if (existing.status === 'SUCCEEDED' || existing.status === 'SUPERSEDED') return existing;
    if (existing.status === 'QUEUED' && existing.lastEnqueuedAt && existing.lastEnqueuedAt > new Date(Date.now() - 5 * 60_000)) {
      return existing;
    }
    const reserved = await transaction.gradingRun.updateMany({
      where: { id: gradingRunId, status: 'QUEUED', enqueueAttempt: existing.enqueueAttempt },
      data: { enqueueAttempt: { increment: 1 }, lastEnqueueError: null },
    });
    if (reserved.count !== 1) throw new Error('GRADING_RUN_NOT_QUEUEABLE');
    return { ...existing, enqueueAttempt: existing.enqueueAttempt + 1 };
  });
  if (run.status === 'SUCCEEDED' || run.status === 'SUPERSEDED') {
    return { skipped: true, messageId: null };
  }
  if (run.lastEnqueuedAt && run.lastEnqueuedAt > new Date(Date.now() - 5 * 60_000)) {
    return { skipped: true, messageId: null };
  }

  try {
    const result = await qstashClient().publishJSON({
      url: qstashEndpoint('/api/internal/grading/writing'),
      body: { version: 1, type: 'WRITING_GRADING', gradingRunId: run.id },
      retries: 5,
      timeout: '60s',
      deduplicationId: `writing-${run.id}-${run.enqueueAttempt}`,
      flowControl: { key: 'gemini-writing', parallelism: 2, rate: 10, period: '1m' },
      label: ['grading', 'writing'],
    });
    await prisma.gradingRun.updateMany({
      where: { id: run.id, status: 'QUEUED' },
      data: { lastEnqueuedAt: new Date(), lastEnqueueError: null },
    });
    return { skipped: false, messageId: result.messageId };
  } catch (error) {
    await prisma.gradingRun.updateMany({
      where: { id: run.id, status: 'QUEUED' },
      data: {
        lastEnqueueError: error instanceof Error ? error.message.slice(0, 500) : 'QSTASH_PUBLISH_FAILED',
      },
    });
    throw error;
  }
}

export async function recoverWritingGradingRuns(
  limit = 25,
  publish: (gradingRunId: string) => Promise<unknown> = publishWritingGradingRun,
) {
  const now = new Date();
  await prisma.gradingRun.updateMany({
    where: {
      skill: 'WRITING',
      status: 'RUNNING',
      leaseExpiresAt: { lt: now },
    },
    data: {
      status: 'QUEUED',
      leaseOwner: null,
      leaseExpiresAt: null,
      errorCode: 'WORKER_LEASE_EXPIRED',
      errorMessage: 'Recovered after a worker lease expired.',
    },
  });
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  const queued = await prisma.gradingRun.findMany({
    where: {
      skill: 'WRITING',
      status: 'QUEUED',
      OR: [
        { lastEnqueuedAt: null },
        { lastEnqueuedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, Math.min(limit, 100)),
    select: { id: true },
  });
  const results: Array<{ id: string; published: boolean }> = [];
  for (const run of queued) {
    try {
      await publish(run.id);
      results.push({ id: run.id, published: true });
    } catch {
      results.push({ id: run.id, published: false });
    }
  }
  return results;
}
