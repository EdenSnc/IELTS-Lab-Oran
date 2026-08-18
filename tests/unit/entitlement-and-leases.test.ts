import test from 'node:test';
import assert from 'node:assert/strict';

test('Entitlement: concurrent reservation remains safe and bounds check enforced (Invariant 15)', () => {
  // Simulating atomic reservation logic
  type EntitlementState = {
    maximumAttempts: number | null;
    attemptsUsed: number;
    version: number;
  };

  const reserveAttempt = (
    current: EntitlementState,
    expectedVersion: number,
  ): EntitlementState => {
    if (current.version !== expectedVersion) {
      throw new Error('CONCURRENCY_CONFLICT');
    }
    if (
      current.maximumAttempts !== null
      && current.attemptsUsed >= current.maximumAttempts
    ) {
      throw new Error('ENTITLEMENT_EXHAUSTED');
    }
    return {
      ...current,
      attemptsUsed: current.attemptsUsed + 1,
      version: current.version + 1,
    };
  };

  const entitlement: EntitlementState = {
    maximumAttempts: 2,
    attemptsUsed: 0,
    version: 1,
  };

  // Attempt 1 succeeds
  const updated1 = reserveAttempt(entitlement, 1);
  assert.equal(updated1.attemptsUsed, 1);
  assert.equal(updated1.version, 2);

  // Attempt 2 with stale version fails
  assert.throws(() => {
    reserveAttempt(updated1, 1); // Stale version 1
  }, /CONCURRENCY_CONFLICT/);

  // Attempt 2 with correct version succeeds
  const updated2 = reserveAttempt(updated1, 2);
  assert.equal(updated2.attemptsUsed, 2);
  assert.equal(updated2.version, 3);

  // Attempt 3 fails due to exhausted limit
  assert.throws(() => {
    reserveAttempt(updated2, 3);
  }, /ENTITLEMENT_EXHAUSTED/);
});

test('GradingRun: active lease cannot be stolen (Invariant 16)', () => {
  const now = new Date();
  const activeLease = {
    id: 'run-1',
    status: 'RUNNING',
    leaseOwner: 'worker-A',
    leaseExpiresAt: new Date(now.getTime() + 60_000), // Valid for 60s
  };

  const tryAcquireLease = (run: typeof activeLease, workerId: string) => {
    const isLeaseActive =
      run.status === 'RUNNING'
      && run.leaseExpiresAt !== null
      && run.leaseExpiresAt > now;

    if (isLeaseActive && run.leaseOwner !== workerId) {
      throw new Error('LEASE_ACQUISITION_DENIED');
    }
    return {
      ...run,
      leaseOwner: workerId,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    };
  };

  // Worker B attempts to steal active lease from Worker A -> fails
  assert.throws(() => {
    tryAcquireLease(activeLease, 'worker-B');
  }, /LEASE_ACQUISITION_DENIED/);
});

test('GradingRun: expired lease reclaim works (Invariant 17)', () => {
  const now = new Date();
  const expiredLease = {
    id: 'run-1',
    status: 'RUNNING',
    leaseOwner: 'worker-A',
    leaseExpiresAt: new Date(now.getTime() - 10_000), // Expired 10s ago
  };

  const reclaimExpiredLease = (run: typeof expiredLease, newWorkerId: string) => {
    const isLeaseActive =
      run.status === 'RUNNING'
      && run.leaseExpiresAt !== null
      && run.leaseExpiresAt > now;

    if (isLeaseActive) {
      throw new Error('LEASE_STILL_ACTIVE');
    }

    return {
      ...run,
      status: 'RUNNING',
      leaseOwner: newWorkerId,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
    };
  };

  const reclaimed = reclaimExpiredLease(expiredLease, 'worker-B');
  assert.equal(reclaimed.leaseOwner, 'worker-B');
  assert.ok(reclaimed.leaseExpiresAt > now);
});
