import assert from 'node:assert/strict';
import test from 'node:test';
import { DiagnosticAutosave } from '../../src/lib/diagnostic/client-core';
import type { DiagnosticResponseDto } from '../../src/lib/diagnostic/protocol';

const response = (answer = '', version = 0): DiagnosticResponseDto => ({ questionId: 'q', answer, version,
  markedForReview: false, savedAt: version ? '2026-10-06T00:00:00Z' : null, finalizedAt: null });

test('edits made during a save are sent after its acknowledgement, with the new revision', async () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'first' });
  let release!: (r: DiagnosticResponseDto) => void;
  const sent: number[] = [];
  const saving = queue.flush(async (draft) => {
    sent.push(draft.expectedVersion);
    if (sent.length === 1) return new Promise<DiagnosticResponseDto>(resolve => { release = resolve; });
    return response(draft.answer, 2);
  });
  queue.edit('q', { answer: 'second' });
  assert.equal(queue.view().responses[0].answer, 'second');
  release(response('first', 1));
  await saving;
  assert.deepEqual(sent, [0, 1]);
  assert.equal(queue.view().responses[0].answer, 'second');
  assert.equal(queue.view().saveStates.q, 'saved');
});

test('lost acknowledgement retains the draft and retries exactly the same revision', async () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'retained' });
  await assert.rejects(queue.flush(async () => { throw new TypeError('offline'); }));
  assert.equal(queue.view().saveStates.q, 'offline');
  await queue.flush(async draft => { assert.equal(draft.expectedVersion, 0); return response(draft.answer, 1); });
  assert.equal(queue.view().saveStates.q, 'saved');
});

test('newer conflicting server response never silently overwrites the local draft', () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'my work' });
  queue.reconcile([response('other tab', 1)]);
  assert.equal(queue.view().responses[0].answer, 'my work');
  assert.equal(queue.view().saveStates.q, 'conflict');
  assert.equal(queue.hasPending, true);
});

test('reconciliation accepts a lost acknowledgement only when answer and review flag agree', () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'same', markedForReview: true });
  queue.reconcile([{ ...response('same', 1), markedForReview: true }]);
  assert.equal(queue.hasPending, false);
  assert.equal(queue.view().saveStates.q, 'saved');
});

test('a stale save locks the draft and stops the queue instead of overwriting', async () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'local' });
  await assert.rejects(queue.flush(async () => { throw Object.assign(new Error('conflict'), { code: 'RESPONSE_CONFLICT' }); }));
  assert.equal(queue.view().saveStates.q, 'conflict');
  let called = false;
  await queue.flush(async () => { called = true; return response(); });
  assert.equal(called, false);
});

test('a malformed acknowledgement cannot mark a different answer as saved', async () => {
  const queue = new DiagnosticAutosave([response()]);
  queue.edit('q', { answer: 'my answer' });
  await assert.rejects(queue.flush(async () => response('wrong answer', 1)), /INVALID_ACKNOWLEDGEMENT/u);
  assert.equal(queue.view().responses[0].answer, 'my answer');
  assert.equal(queue.hasPending, true);
});
