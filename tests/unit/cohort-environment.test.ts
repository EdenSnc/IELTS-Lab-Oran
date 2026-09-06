import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('blank cohort capacity uses the default without losing explicit zero', () => {
  for (const [capacity, expected] of [
    ['', 8], ['   ', 8], ['0', 0], ['12', 12], ['-1', 8], ['invalid', 8], ['2.5', 8],
  ] as const) {
    const result = spawnSync(process.execPath, [
      '--import', 'tsx', '-e',
      "console.log(JSON.stringify(require('./src/lib/cohort.ts').getFoundingCohortStatus()))",
    ], {
      encoding: 'utf8',
      env: { ...process.env, FOUNDING_COHORT_CAPACITY: capacity, FOUNDING_COHORT_CLAIMED: '' },
    });
    assert.equal(result.status, 0, result.stderr);
    const status = JSON.parse(result.stdout);
    assert.equal(status.total, expected);
    assert.equal(status.claimed, 0);
    assert.equal(status.remaining, expected);
    assert.equal(status.isFull, expected === 0);
  }
});
