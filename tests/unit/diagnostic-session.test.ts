import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDiagnosticResponseWritable,
  deriveDiagnosticWindow,
  DiagnosticTimingError,
  formatDiagnosticRemaining,
  type DiagnosticStage,
  type DiagnosticTimingErrorCode,
} from '../../src/lib/diagnostic/session-core';

const startTimestamp = Date.parse('2026-10-06T12:00:00.000Z');

function at(elapsedMilliseconds: number): { startedAt: Date; now: Date } {
  return { startedAt: new Date(startTimestamp), now: new Date(startTimestamp + elapsedMilliseconds) };
}

function rejectsWith(action: () => unknown, code: DiagnosticTimingErrorCode): void {
  assert.throws(action, (error: unknown) => error instanceof DiagnosticTimingError && error.code === code);
}

// These hand-derived cases catch inclusive-deadline and rounded-stage regressions.
const boundaries: Array<[number, DiagnosticStage, string | null, number]> = [
  [0, 'LISTENING', '2026-10-06T12:20:00.000Z', 1200],
  [1_199_999, 'LISTENING', '2026-10-06T12:20:00.000Z', 1],
  [1_200_000, 'READING', '2026-10-06T12:40:00.000Z', 1200],
  [1_200_001, 'READING', '2026-10-06T12:40:00.000Z', 1200],
  [2_399_999, 'READING', '2026-10-06T12:40:00.000Z', 1],
  [2_400_000, 'WRITING', '2026-10-06T13:00:00.000Z', 1200],
  [2_400_001, 'WRITING', '2026-10-06T13:00:00.000Z', 1200],
  [3_599_999, 'WRITING', '2026-10-06T13:00:00.000Z', 1],
  [3_600_000, 'SUBMITTED', null, 0],
  [3_600_001, 'SUBMITTED', null, 0],
  [86_400_000, 'SUBMITTED', null, 0],
];

for (const [elapsed, stage, sectionDeadline, remainingSeconds] of boundaries) {
  test(`derives fixed ${stage} window at elapsed ${elapsed}ms`, () => {
    const result = deriveDiagnosticWindow(at(elapsed));
    assert.equal(result.stage, stage);
    assert.equal(result.sectionDeadline?.toISOString() ?? null, sectionDeadline);
    assert.equal(result.absoluteDeadline.toISOString(), '2026-10-06T13:00:00.000Z');
    assert.equal(result.remainingSeconds, remainingSeconds);
  });
}

for (const [elapsed, stage] of boundaries) {
  test(`response writes accept only the active skill at elapsed ${elapsed}ms`, () => {
    for (const skill of ['LISTENING', 'READING', 'WRITING']) {
      const write = () => assertDiagnosticResponseWritable({ ...at(elapsed), skill });
      if (stage === skill) {
        assert.doesNotThrow(write);
      } else {
        rejectsWith(write, stage === 'SUBMITTED' ? 'SESSION_EXPIRED' : 'SECTION_NOT_ACTIVE');
      }
    }
  });
}

test('forged skills cannot become writable at any written stage', () => {
  for (const elapsed of [0, 1_200_000, 2_400_000]) {
    for (const skill of ['SPEAKING', 'SUBMITTED', 'reading', '', null, undefined, 1, {}, ['LISTENING']]) {
      rejectsWith(() => assertDiagnosticResponseWritable({ ...at(elapsed), skill }), 'INVALID_SKILL');
    }
  }
});

test('a stale Listening autosave is rejected by receipt time despite an earlier client window', () => {
  assert.equal(deriveDiagnosticWindow(at(1_199_999)).stage, 'LISTENING');
  rejectsWith(() => assertDiagnosticResponseWritable({ ...at(1_200_000), skill: 'LISTENING' }), 'SECTION_NOT_ACTIVE');
});

test('client-requested early transitions cannot authorize the next skill', () => {
  const input = { ...at(0), stage: 'READING', sectionDeadline: new Date(startTimestamp + 7_200_000) };
  assert.equal(deriveDiagnosticWindow(input).stage, 'LISTENING');
  rejectsWith(() => assertDiagnosticResponseWritable({ ...input, skill: 'READING' }), 'SECTION_NOT_ACTIVE');
});

test('refreshing or sleeping derives the same fixed window without replaying ticks', () => {
  // A live tab samples several times; a resumed tab observes only the receipt time.
  for (const elapsed of [0, 999_999, 1_200_000, 2_000_000]) deriveDiagnosticWindow(at(elapsed));
  const live = deriveDiagnosticWindow(at(2_520_000));
  const restored = deriveDiagnosticWindow({
    startedAt: new Date('2026-10-06T12:00:00.000Z'), now: new Date('2026-10-06T12:42:00.000Z'),
  });
  assert.deepEqual(live, restored);
  assert.equal(restored.stage, 'WRITING');
  assert.equal(restored.remainingSeconds, 1080);
  assert.equal(restored.sectionDeadline?.toISOString(), '2026-10-06T13:00:00.000Z');
});

test('timezone offsets and DST boundaries cannot change absolute elapsed time', () => {
  for (const [start, now, deadline, remainingSeconds] of [
    ['2026-10-06T17:45:00+05:45', '2026-10-06T06:35:00-06:00', '2026-10-06T13:00:00.000Z', 300],
    ['2026-10-25T02:50:00+02:00', '2026-10-25T02:10:00+01:00', '2026-10-25T01:50:00.000Z', 1200],
    ['2026-03-29T01:50:00+01:00', '2026-03-29T03:10:00+02:00', '2026-03-29T01:50:00.000Z', 1200],
  ] as const) {
    const result = deriveDiagnosticWindow({ startedAt: new Date(start), now: new Date(now) });
    assert.equal(result.stage, 'READING');
    assert.equal(result.remainingSeconds, remainingSeconds);
    assert.equal(result.absoluteDeadline.toISOString(), deadline);
  }
});

const invalidTimes: Array<[string, { startedAt: Date; now: Date }, DiagnosticTimingErrorCode]> = [
  ['invalid start', { ...at(0), startedAt: new Date(NaN) }, 'INVALID_STARTED_AT'],
  ['invalid now', { ...at(0), now: new Date(NaN) }, 'INVALID_NOW'],
  ['now one millisecond before start', at(-1), 'NOW_BEFORE_START'],
  ['unrepresentable deadline', { startedAt: new Date(8_640_000_000_000_000), now: new Date(8_640_000_000_000_000) }, 'INVALID_DEADLINE'],
  ['non-Date start', { ...at(0), startedAt: '2026-10-06T12:00:00Z' as unknown as Date }, 'INVALID_STARTED_AT'],
  ['non-Date now', { ...at(0), now: null as unknown as Date }, 'INVALID_NOW'],
];
for (const [name, input, code] of invalidTimes) {
  test(`window and write gate reject ${name}`, () => {
    rejectsWith(() => deriveDiagnosticWindow(input), code);
    rejectsWith(() => assertDiagnosticResponseWritable({ ...input, skill: 'LISTENING' }), code);
  });
}

test('returned deadline mutations cannot reset subsequent windows or alter input dates', () => {
  const input = at(1_200_000);
  const result = deriveDiagnosticWindow(input);
  result.sectionDeadline?.setTime(0);
  result.absoluteDeadline.setTime(0);
  assert.equal(input.startedAt.toISOString(), '2026-10-06T12:00:00.000Z');
  assert.equal(input.now.toISOString(), '2026-10-06T12:20:00.000Z');
  assert.equal(deriveDiagnosticWindow(input).absoluteDeadline.toISOString(), '2026-10-06T13:00:00.000Z');
});

for (const [seconds, token] of [[1200, '20'], [1199.999, '20'], [61, '2'], [60.001, '2'], [60, '1'], [1, '1'], [0.001, '1'], [Number.MIN_VALUE, '1'], [0, '0']] as const) {
  test(`minutes-only English timer formats ${seconds} seconds as ${token}`, () => {
    assert.equal(formatDiagnosticRemaining(seconds), token);
    assert.match(formatDiagnosticRemaining(seconds), /^[0-9]+$/u);
  });
}

test('timer refuses malformed or negative remaining time instead of displaying misleading tokens', () => {
  for (const seconds of [-1, NaN, Infinity, -Infinity, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER + 1, '60', null, undefined]) {
    rejectsWith(() => formatDiagnosticRemaining(seconds as number), 'INVALID_REMAINING_SECONDS');
  }
});
