import assert from 'node:assert/strict';
import test from 'node:test';
import { compileDiagnosticManifest } from '../../src/lib/diagnostic/compile';
import type { DiagnosticReview } from '../../src/lib/diagnostic/policy';
import { parseDiagnosticManifestPayload, type DiagnosticManifestPayload } from '../../src/lib/diagnostic/manifest';
import {
  compileAttemptManifest, parseFrozenManifestPayload,
  type AssemblyBlueprint, type AssemblyPart,
} from '../../src/lib/attempts/manifest-core';

// Synthetic structure only. Never provision these fixtures as learner content.
function fixture(readingCount = 13) {
  let counter = 0;
  const id = () => `00000000-0000-4000-8000-${(++counter).toString(16).padStart(12, '0')}`;
  const definitions = [
    ['LISTENING_PART_3', 'LISTENING', 10], ['LISTENING_PART_4', 'LISTENING', 10],
    ['READING_SECTION_2', 'READING', readingCount], ['WRITING_TASK_2', 'WRITING', 1],
  ] as const;
  const blueprint: AssemblyBlueprint = {
    id: id(), version: 1, variant: 'ACADEMIC', status: 'PUBLISHED',
    fixedTestVersionId: null, defaultMinimumSourceYear: null, allowArchiveByDefault: false,
    slots: definitions.map(([partSlot], index) => ({
      id: id(), partSlot, displayOrder: index + 1, requiredCount: 1,
      selectionMode: 'WHOLE_PART', targetMarks: null,
    })),
  };
  const candidates: AssemblyPart[] = definitions.map(([slot, skill, count]) => ({
    id: id(), testVersionId: id(), testVersionContentHash: 'a'.repeat(64),
    testVariant: 'ACADEMIC', sourceYear: 2026, skill, sectionId: id(),
    sectionTimeLimitSeconds: 3600, slot, reviewStatus: 'VERIFIED',
    stimuliReady: true, assetsReady: true, shuffleQuestionGroups: false,
    groups: [{
      id: id(), displayOrder: 1, reviewStatus: 'VERIFIED',
      scoringStrategy: skill === 'WRITING' ? 'RUBRIC' : 'PER_ITEM_EXACT',
      maxMarks: skill === 'WRITING' ? 0 : count, independent: false,
      shuffleQuestions: false, shuffleOptions: false, options: null,
      answerKey: skill === 'WRITING' ? null : { reviewStatus: 'VERIFIED', formatVersion: 1 },
      questions: Array.from({ length: count }, (_, index) => ({
        id: id(), stableKey: `${slot}-${index}`, displayOrder: index + 1,
        maxMarks: skill === 'WRITING' ? 0 : 1,
      })),
    }],
  }));
  const reviews: DiagnosticReview[] = candidates.map((part) => ({
    partId: part.id, contentHash: 'a'.repeat(64), reviewerId: id(),
    reviewedAt: '2026-10-01T00:00:00.000Z', reviewDueAt: '2027-01-01T00:00:00.000Z',
    suitability: part.skill === 'LISTENING' ? 'HARDER_LISTENING'
      : part.skill === 'READING' ? 'REPRESENTATIVE_READING' : 'TASK_2_DIAGNOSTIC',
    ...(part.skill === 'LISTENING' ? { audio: {
      assetId: id(), sha256: 'b'.repeat(64), durationSeconds: 540, boundariesVerified: true as const,
    } } : {}),
  }));
  return { blueprint, candidates, reviews, seed: 'diagnostic-regression', now: new Date('2026-10-06T12:00:00Z') };
}

for (const readingCount of [13, 14]) {
  test(`diagnostic freezes intact 20/${readingCount}/1 questions in 60 minutes without changing sources`, () => {
    const input = fixture(readingCount);
    const before = structuredClone(input);
    const result = compileDiagnosticManifest(input);
    assert.equal(result.payload.totalTimeLimitSeconds, 3600);
    assert.equal(result.payload.questions.length, 21 + readingCount);
    assert.deepEqual(result.payload.parts.map((part) => part.sectionTimeLimitSeconds), [1200, 1200, 1200, 1200]);
    assert.deepEqual(result.payload.parts.map((part) => part.partId), input.candidates.map((part) => part.id));
    assert.deepEqual(result.payload.diagnostic?.reviews, input.reviews);
    assert.deepEqual(parseDiagnosticManifestPayload(JSON.parse(JSON.stringify(result.payload))), result.payload);
    assert.throws(() => parseFrozenManifestPayload(result.payload));
    assert.deepEqual(compileDiagnosticManifest(input), result);
    assert.deepEqual(input, before);
    assert.doesNotMatch(JSON.stringify(result.payload), /answerKey|answersByStableKey|encryptedPayload/);
    assert.equal(compileAttemptManifest(input).payload.totalTimeLimitSeconds, 10800);
    assert.equal('diagnostic' in compileAttemptManifest(input).payload, false);
  });
}

test('real encoded audio retains millisecond-accurate duration and cannot exceed the allowance by one millisecond', () => {
  const input = fixture();
  input.reviews[0].audio!.durationSeconds = 540.333;
  input.reviews[1].audio!.durationSeconds = 539.667;
  const result = compileDiagnosticManifest(input);
  assert.equal(result.payload.diagnostic.reviews[0].audio!.durationSeconds, 540.333);
  input.reviews[1].audio!.durationSeconds = 539.668;
  assert.throws(() => compileDiagnosticManifest(input), /DIAGNOSTIC_AUDIO_TOO_LONG/u);
  input.reviews[1].audio!.durationSeconds = 500.1234;
  assert.throws(() => compileDiagnosticManifest(input));
});

const badInputs: Array<[string, (input: ReturnType<typeof fixture>) => void]> = [
  ['unpublished blueprint', (i) => { i.blueprint.status = 'DRAFT'; }],
  ['wrong variant', (i) => { i.blueprint.variant = 'GENERAL_TRAINING'; }],
  ['Task 1', (i) => { i.blueprint.slots[3].partSlot = 'WRITING_TASK_1'; }],
  ['group selection instead of intact parts', (i) => { i.blueprint.slots[2].selectionMode = 'INDEPENDENT_QUESTION_GROUPS'; }],
  ['duplicate slot order', (i) => { i.blueprint.slots[2].displayOrder = 1; }],
  ['extra written part', (i) => { i.blueprint.slots.push({ ...i.blueprint.slots[3] }); }],
  ['expired review at exact deadline', (i) => { i.now = new Date(i.reviews[0].reviewDueAt); }],
  ['future review', (i) => { i.reviews[0].reviewedAt = '2026-11-01T00:00:00Z'; }],
  ['changed source hash', (i) => { i.candidates[0].testVersionContentHash = 'c'.repeat(64); }],
  ['missing review', (i) => { i.reviews.pop(); }],
  ['duplicate review', (i) => { i.reviews.push({ ...i.reviews[0] }); }],
  ['unreviewed audio boundary', (i) => { Reflect.set(i.reviews[0].audio!, 'boundariesVerified', false); }],
  ['missing audio', (i) => { delete i.reviews[0].audio; }],
  ['audio over available time by one second', (i) => { i.reviews[0].audio!.durationSeconds += 1; }],
  ['shuffled group order', (i) => { i.candidates[0].shuffleQuestionGroups = true; }],
  ['shuffled question order', (i) => { i.candidates[0].groups[0].shuffleQuestions = true; }],
  ['shuffled options', (i) => { i.candidates[0].groups[0].shuffleOptions = true; }],
  ['unverified answer key', (i) => { i.candidates[0].groups[0].answerKey!.reviewStatus = 'DRAFT'; }],
  ['missing passage', (i) => { i.candidates[2].stimuliReady = false; }],
  ['missing source asset', (i) => { i.candidates[0].assetsReady = false; }],
  ['wrong suitability', (i) => { i.reviews[2].suitability = 'HARDER_LISTENING'; }],
  ['reading too short', (i) => { i.candidates[2].groups[0].questions.pop(); i.candidates[2].groups[0].maxMarks--; }],
  ['invalid clock', (i) => { i.now = new Date(NaN); }],
  ['duplicate candidate identity', (i) => { i.candidates.push(structuredClone(i.candidates[0])); }],
  ['duplicate group identity', (i) => { i.candidates[1].groups[0].id = i.candidates[0].groups[0].id; }],
  ['duplicate source question order', (i) => { i.candidates[0].groups[0].questions[1].displayOrder = 1; }],
  ['invalid review date', (i) => { i.reviews[0].reviewedAt = 'not-a-date'; }],
  ['reversed review dates', (i) => { i.reviews[0].reviewedAt = i.reviews[0].reviewDueAt; }],
  ['duplicate audio asset', (i) => { i.reviews[1].audio!.assetId = i.reviews[0].audio!.assetId; }],
  ['malformed options', (i) => { i.candidates[0].groups[0].options = { label: 'A', text: 'Alpha' }; }],
  ['answer key in options', (i) => { i.candidates[0].groups[0].options = [{ label: 'A', text: 'Alpha', answerKey: 'secret' }]; }],
  ['duplicate option labels', (i) => { i.candidates[0].groups[0].options = [{ label: 'A', text: 'Alpha' }, { label: 'A', text: 'Beta' }]; }],
];
for (const [name, mutate] of badInputs) {
  test(`diagnostic refuses ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.throws(() => compileDiagnosticManifest(input));
  });
}

const corruptSnapshots: Array<[string, (payload: DiagnosticManifestPayload) => void]> = [
  ['duration changed', (p) => { p.totalTimeLimitSeconds = 7200; }],
  ['source review rebound', (p) => { p.diagnostic!.reviews[0].partId = p.parts[1].partId; }],
  ['source hash changed', (p) => { p.parts[0].testVersionContentHash = 'c'.repeat(64); }],
  ['wrong reading slot', (p) => { p.parts[2].slot = 'WRITING_TASK_1'; }],
  ['reading questions attached to listening', (p) => { p.questions.find((q) => q.skill === 'READING')!.partOrder = 1; }],
  ['reordered sections', (p) => { [p.parts[0], p.parts[2]] = [p.parts[2], p.parts[0]]; }],
  ['duplicate question', (p) => { p.questions[1].questionId = p.questions[0].questionId; }],
  ['missing question', (p) => { p.questions.pop(); }],
  ['duplicate audio asset', (p) => { p.diagnostic!.reviews[1].audio!.assetId = p.diagnostic!.reviews[0].audio!.assetId; }],
  ['duplicate part identity', (p) => { p.parts[1].partId = p.parts[0].partId; }],
  ['duplicate group identity', (p) => { p.parts[1].groupIds[0] = p.parts[0].groupIds[0]; }],
  ['unused group', (p) => { p.parts[0].groupIds.push(p.parts[1].groupIds[0]); }],
  ['unknown part mapping', (p) => { p.questions[0].partOrder = 5; }],
  ['unknown group mapping', (p) => { p.questions[0].groupOrder = 2; }],
  ['duplicate question order', (p) => { p.questions[1].questionOrder = 1; }],
  ['nonconsecutive question number', (p) => { p.questions[1].questionNumber = 3; }],
  ['question skill mismatch', (p) => { p.questions[0].skill = 'READING'; }],
  ['part skill mismatch', (p) => { p.parts[2].skill = 'LISTENING'; }],
  ['wrong marks', (p) => { p.questions[0].maxMarks = 2; }],
  ['reordered questions', (p) => { [p.questions[0], p.questions[1]] = [p.questions[1], p.questions[0]]; }],
  ['reordered reviews', (p) => { [p.diagnostic!.reviews[0], p.diagnostic!.reviews[1]] = [p.diagnostic!.reviews[1], p.diagnostic!.reviews[0]]; }],
  ['invalid review chronology', (p) => { p.diagnostic!.reviews[0].reviewDueAt = p.diagnostic!.reviews[0].reviewedAt; }],
  ['wrong review suitability', (p) => { p.diagnostic!.reviews[2].suitability = 'HARDER_LISTENING'; }],
  ['missing listening audio', (p) => { delete p.diagnostic!.reviews[0].audio; }],
  ['reading audio', (p) => { p.diagnostic!.reviews[2].audio = structuredClone(p.diagnostic!.reviews[0].audio); }],
  ['oversized audio pair', (p) => { p.diagnostic!.reviews[0].audio!.durationSeconds += 1; }],
  ['answer key field', (p) => { Reflect.set(p.questions[0], 'answerKey', { secret: 'answer' }); }],
  ['answer key inside option', (p) => { p.questions.forEach((q) => { q.presentedOptions = [{ label: 'A', text: 'Alpha', answersByStableKey: 'secret' }]; }); }],
  ['empty options', (p) => { p.questions.forEach((q) => { q.presentedOptions = []; }); }],
];
for (const [name, mutate] of corruptSnapshots) {
  test(`loading diagnostic rejects ${name}`, () => {
    const { payload } = compileDiagnosticManifest(fixture());
    mutate(payload);
    assert.throws(() => parseDiagnosticManifestPayload(payload));
  });
}

test('a frozen session remains loadable after its review expires; new sessions do not', () => {
  const input = fixture();
  const { payload } = compileDiagnosticManifest(input);
  input.now = new Date('2028-01-01T00:00:00Z');
  assert.throws(() => compileDiagnosticManifest(input));
  assert.deepEqual(parseDiagnosticManifestPayload(payload), payload);
});

test('exactly 1080 seconds of reviewed audio is accepted, 1081 is rejected', () => {
  const input = fixture();
  const { payload } = compileDiagnosticManifest(input);
  assert.equal(payload.diagnostic!.reviews.reduce((sum, review) => sum + (review.audio?.durationSeconds ?? 0), 0), 1080);
  assert.doesNotThrow(() => parseDiagnosticManifestPayload(payload));
  input.reviews[1].audio!.durationSeconds += 1;
  assert.throws(() => compileDiagnosticManifest(input));
});

test('100 seeds select deterministically regardless of candidate, group and question input order', () => {
  const input = fixture();
  // A second eligible Part 3 permits real seeded selection, not just a one-choice pool.
  const alternative = structuredClone(input.candidates[0]);
  alternative.id = '11111111-1111-4111-8111-111111111111';
  alternative.groups[0].id = '22222222-2222-4222-8222-222222222222';
  alternative.groups[0].questions.forEach((question, index) => {
    question.id = `33333333-3333-4333-8333-${index.toString(16).padStart(12, '0')}`;
  });
  input.candidates.push(alternative);
  input.reviews.push({ ...structuredClone(input.reviews[0]), partId: alternative.id,
    audio: { ...input.reviews[0].audio!, assetId: '44444444-4444-4444-8444-444444444444' } });
  input.candidates[2].groups[0].options = [{ label: 'B', text: 'Beta' }, { label: 'A', text: 'Alpha' }];
  const readingGroup = input.candidates[2].groups[0];
  const secondGroup = { ...structuredClone(readingGroup), id: '55555555-5555-4555-8555-555555555555', displayOrder: 2,
    questions: readingGroup.questions.splice(6), maxMarks: 7 };
  readingGroup.maxMarks = 6;
  input.candidates[2].groups.push(secondGroup);
  const before = structuredClone(input);
  const selections = new Set<string>();
  for (let index = 0; index < 100; index += 1) {
    input.seed = `seed-${index}`;
    const result = compileDiagnosticManifest(input);
    const reordered = structuredClone(input);
    reordered.candidates.reverse();
    reordered.reviews.reverse();
    reordered.blueprint.slots.reverse();
    reordered.candidates.forEach((part) => {
      part.groups.reverse();
      part.groups.forEach((group) => group.questions.reverse());
    });
    assert.deepEqual(compileDiagnosticManifest(reordered), result);
    selections.add(result.payload.parts[0].partId);
    assert.deepEqual(result.payload.questions.find((q) => q.skill === 'READING')!.presentedOptions,
      [{ label: 'B', text: 'Beta' }, { label: 'A', text: 'Alpha' }]);
  }
  assert.equal(selections.size, 2);
  assert.deepEqual({ ...input, seed: before.seed }, before);
});

test('zero-based published source orders are preserved without rejecting valid content', () => {
  const input = fixture();
  input.candidates.forEach((part) => part.groups.forEach((group) => {
    group.displayOrder -= 1;
    group.questions.forEach((question) => { question.displayOrder -= 1; });
  }));
  const result = compileDiagnosticManifest(input);
  assert.deepEqual(result.payload.questions.slice(0, 10).map((question) => question.questionId),
    input.candidates[0].groups[0].questions.map((question) => question.id));
});

test('diagnostic parser requires its own strict profile while ordinary parser keeps its contract', () => {
  const ordinary = compileAttemptManifest(fixture()).payload;
  assert.deepEqual(parseFrozenManifestPayload(ordinary), ordinary);
  assert.throws(() => parseDiagnosticManifestPayload(ordinary));
  const { payload } = compileDiagnosticManifest(fixture());
  Reflect.set(payload.diagnostic, 'unexpected', true);
  assert.throws(() => parseDiagnosticManifestPayload(payload));
});
