import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileAttemptManifest,
  parseFrozenManifestPayload,
  type AssemblyBlueprint,
  type AssemblyPart,
} from '../../src/lib/attempts/manifest-core';
import { scoreObjectiveGroups, type ObjectiveGroup } from '../../src/lib/grading/objective-scoring-core';

let idCounter = 1;
function uuid() {
  const tail = (idCounter++).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${tail}`;
}

const slotDefinitions = [
  ['LISTENING_PART_1', 'LISTENING', 10],
  ['LISTENING_PART_2', 'LISTENING', 10],
  ['LISTENING_PART_3', 'LISTENING', 10],
  ['LISTENING_PART_4', 'LISTENING', 10],
  ['READING_SECTION_1', 'READING', 13],
  ['READING_SECTION_2', 'READING', 13],
  ['READING_SECTION_3', 'READING', 14],
] as const;

const blueprint: AssemblyBlueprint = {
  id: uuid(),
  version: 1,
  variant: 'ACADEMIC',
  status: 'PUBLISHED',
  fixedTestVersionId: null,
  defaultMinimumSourceYear: 2020,
  allowArchiveByDefault: false,
  slots: slotDefinitions.map(([partSlot, , marks], index) => ({
    id: uuid(),
    partSlot,
    displayOrder: index + 1,
    requiredCount: 1,
    selectionMode: 'WHOLE_PART',
    targetMarks: marks,
  })),
};

const candidates: AssemblyPart[] = slotDefinitions.flatMap(([slot, skill, marks], slotIndex) => (
  [0, 1].map((candidateIndex) => {
    const testVersionId = uuid();
    const questions = Array.from({ length: marks }, (_, questionIndex) => ({
      id: uuid(),
      stableKey: `${slot}-${candidateIndex}-q${questionIndex + 1}`,
      displayOrder: questionIndex + 1,
      maxMarks: 1,
    }));
    return {
      id: uuid(),
      testVersionId,
      testVersionContentHash: `version-${slotIndex}-${candidateIndex}`,
      testVariant: skill === 'LISTENING' ? 'UNIVERSAL' : 'ACADEMIC',
      sourceYear: 2025 + candidateIndex,
      skill,
      sectionId: uuid(),
      sectionTimeLimitSeconds: 3_600,
      slot,
      reviewStatus: 'VERIFIED',
      stimuliReady: true,
      assetsReady: true,
      shuffleQuestionGroups: false,
      groups: [{
        id: uuid(),
        displayOrder: 1,
        reviewStatus: 'VERIFIED',
        scoringStrategy: 'PER_ITEM_EXACT',
        maxMarks: marks,
        independent: true,
        shuffleQuestions: false,
        shuffleOptions: true,
        options: [{ label: 'A', text: 'Alpha' }, { label: 'B', text: 'Beta' }],
        answerKey: { reviewStatus: 'VERIFIED', formatVersion: 1 },
        questions,
      }],
    } satisfies AssemblyPart;
  })
));

function scoreSkill(manifest: ReturnType<typeof compileAttemptManifest>['payload'], skill: string, correct: boolean) {
  const groups: ObjectiveGroup[] = [];
  const answers: Record<string, string> = {};
  for (const frozenPart of manifest.parts.filter((part) => part.skill === skill)) {
    const sourcePart = candidates.find((candidate) => candidate.id === frozenPart.partId) as AssemblyPart;
    for (const sourceGroup of sourcePart.groups) {
      const selected = manifest.questions.filter((question) => (
        question.skill === skill
        && sourceGroup.questions.some((candidate) => candidate.id === question.questionId)
      ));
      groups.push({
        scoringStrategy: 'PER_ITEM_EXACT',
        maxMarks: sourceGroup.maxMarks,
        questions: selected.map((question) => {
          const source = sourceGroup.questions.find((candidate) => candidate.id === question.questionId)!;
          return { stableKey: source.stableKey, sourceNumber: question.questionNumber, maxMarks: question.maxMarks };
        }),
        answerKey: {
          strategy: 'PER_ITEM_EXACT',
          answersByStableKey: Object.fromEntries(sourceGroup.questions.map((question) => (
            [question.stableKey, [`correct-${question.stableKey}`]]
          ))),
        },
      });
      for (const question of selected) {
        const source = sourceGroup.questions.find((candidate) => candidate.id === question.questionId)!;
        answers[String(question.questionNumber)] = correct ? `correct-${source.stableKey}` : '__wrong__';
      }
    }
  }
  return scoreObjectiveGroups({ groups, answers });
}

test('1,000 deterministic full manifests preserve atomic structure and 40-mark LR scoring', () => {
  const selectedParts = new Set<string>();
  for (let index = 0; index < 1_000; index += 1) {
    const seed = `20260818-${index}`;
    const compiled = compileAttemptManifest({ blueprint, candidates, seed });
    const repeated = compileAttemptManifest({ blueprint, candidates, seed });
    assert.deepEqual(repeated, compiled);
    parseFrozenManifestPayload(JSON.parse(JSON.stringify(compiled.payload)));
    assert.equal(compiled.payload.totalTimeLimitSeconds, 7_200, 'Listening and Reading durations count once per assembled skill');

    assert.equal(new Set(compiled.payload.questions.map((question) => question.questionId)).size, 80);
    assert.equal(new Set(compiled.payload.parts.map((part) => part.slot)).size, 7);
    assert.deepEqual(
      compiled.payload.questions.filter((question) => question.skill === 'LISTENING').map((question) => question.questionNumber),
      Array.from({ length: 40 }, (_, question) => question + 1),
    );
    assert.deepEqual(
      compiled.payload.questions.filter((question) => question.skill === 'READING').map((question) => question.questionNumber),
      Array.from({ length: 40 }, (_, question) => question + 1),
    );
    assert.deepEqual(scoreSkill(compiled.payload, 'LISTENING', true), { rawScore: 40, maximumRawScore: 40, answered: 40 });
    assert.deepEqual(scoreSkill(compiled.payload, 'READING', true), { rawScore: 40, maximumRawScore: 40, answered: 40 });
    assert.equal(scoreSkill(compiled.payload, 'LISTENING', false).rawScore, 0);
    assert.equal(scoreSkill(compiled.payload, 'READING', false).rawScore, 0);
    const serialized = JSON.stringify(compiled.payload);
    assert.ok(!/answerKey|acceptedSets|answersByStableKey|encryptedPayload/.test(serialized));
    compiled.payload.parts.forEach((part) => selectedParts.add(part.partId));
  }
  assert.ok(selectedParts.size > slotDefinitions.length, 'different seeds must select across eligible atomic parts');
});

test('independent-group mode stays within one source part and satisfies exact target marks', () => {
  const source = candidates.find((candidate) => candidate.slot === 'READING_SECTION_1')!;
  const groups = [3, 4, 6].map((marks, groupIndex) => ({
    ...source.groups[0],
    id: uuid(),
    displayOrder: groupIndex + 1,
    maxMarks: marks,
    questions: Array.from({ length: marks }, (_, questionIndex) => ({
      id: uuid(),
      stableKey: `independent-${groupIndex}-${questionIndex}`,
      displayOrder: questionIndex + 1,
      maxMarks: 1,
    })),
  }));
  const independentBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    slots: [{
      id: uuid(),
      partSlot: 'READING_SECTION_1',
      displayOrder: 1,
      requiredCount: 2,
      selectionMode: 'INDEPENDENT_QUESTION_GROUPS',
      targetMarks: 10,
    }],
  };
  const compiled = compileAttemptManifest({
    blueprint: independentBlueprint,
    candidates: [{ ...source, id: uuid(), groups }],
    seed: 'independent-20260818',
  });
  assert.equal(compiled.payload.parts.length, 1);
  assert.equal(compiled.payload.parts[0].groupIds.length, 2);
  assert.equal(compiled.payload.questions.length, 10);
});

test('rubric-scored Writing tasks compile with zero raw marks', () => {
  const rubricBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    fixedTestVersionId: null,
    slots: [{
      id: uuid(),
      partSlot: 'WRITING_TASK_1',
      displayOrder: 1,
      requiredCount: 1,
      selectionMode: 'WHOLE_PART',
      targetMarks: 0,
    }],
  };
  const rubricPart: AssemblyPart = {
    id: uuid(),
    testVersionId: uuid(),
    testVersionContentHash: 'writing-version',
    testVariant: 'ACADEMIC',
    sourceYear: 2026,
    skill: 'WRITING',
    sectionId: uuid(),
    sectionTimeLimitSeconds: 3_600,
    slot: 'WRITING_TASK_1',
    reviewStatus: 'VERIFIED',
    stimuliReady: true,
    assetsReady: true,
    shuffleQuestionGroups: false,
    groups: [{
      id: uuid(),
      displayOrder: 1,
      reviewStatus: 'VERIFIED',
      scoringStrategy: 'RUBRIC',
      maxMarks: 0,
      independent: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      options: null,
      answerKey: null,
      questions: [{ id: uuid(), stableKey: 'writing-task-1', displayOrder: 1, maxMarks: 0 }],
    }],
  };

  const compiled = compileAttemptManifest({
    blueprint: rubricBlueprint,
    candidates: [rubricPart],
    seed: 'writing-rubric',
  });
  assert.equal(compiled.payload.questions[0].maxMarks, 0);
  assert.equal(compiled.payload.totalTimeLimitSeconds, 3_600);
  parseFrozenManifestPayload(JSON.parse(JSON.stringify(compiled.payload)));
});

test('assembled skill timing rejects inconsistent source limits and excludes scheduled Speaking', () => {
  const listening = candidates.filter((candidate) => candidate.skill === 'LISTENING' && candidate.testVersionContentHash?.endsWith('-0'));
  const reading = candidates.filter((candidate) => candidate.skill === 'READING' && candidate.testVersionContentHash?.endsWith('-0'));
  const listeningBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    slots: blueprint.slots.filter((slot) => slot.partSlot.startsWith('LISTENING_')),
  };
  assert.equal(compileAttemptManifest({ blueprint: listeningBlueprint, candidates: listening, seed: 'timing' }).payload.totalTimeLimitSeconds, 3_600);
  const readingBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    slots: blueprint.slots.filter((slot) => slot.partSlot.startsWith('READING_')),
  };
  assert.equal(compileAttemptManifest({ blueprint: readingBlueprint, candidates: reading, seed: 'reading-timing' }).payload.totalTimeLimitSeconds, 3_600);
  assert.equal(compileAttemptManifest({
    blueprint: { ...blueprint, id: uuid() },
    candidates: [...listening, ...reading],
    seed: 'listening-reading-timing',
  }).payload.totalTimeLimitSeconds, 7_200);
  const writingCandidate: AssemblyPart = {
    ...listening[0],
    id: uuid(),
    testVersionId: uuid(),
    testVersionContentHash: 'writing-timing-version',
    testVariant: 'ACADEMIC',
    skill: 'WRITING',
    sectionId: uuid(),
    slot: 'WRITING_TASK_1',
    groups: [{
      id: uuid(), displayOrder: 1, reviewStatus: 'VERIFIED', scoringStrategy: 'RUBRIC',
      maxMarks: 0, independent: false, shuffleQuestions: false, shuffleOptions: false,
      options: null, answerKey: null,
      questions: [{ id: uuid(), stableKey: 'writing-timing-q1', displayOrder: 1, maxMarks: 0 }],
    }],
  };
  const lrwBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    slots: [...blueprint.slots, {
      id: uuid(), partSlot: 'WRITING_TASK_1', displayOrder: 8,
      requiredCount: 1, selectionMode: 'WHOLE_PART', targetMarks: 0,
    }],
  };
  assert.equal(compileAttemptManifest({
    blueprint: lrwBlueprint,
    candidates: [...listening, ...reading, writingCandidate],
    seed: 'lrw-timing',
  }).payload.totalTimeLimitSeconds, 10_800);
  assert.throws(() => compileAttemptManifest({
    blueprint: listeningBlueprint,
    candidates: listening.map((part, index) => index === 3 ? { ...part, sectionTimeLimitSeconds: 1_800 } : part),
    seed: 'timing-mismatch',
  }), /INCONSISTENT_SKILL_TIME_LIMIT/u);
});

test('assembly excludes an otherwise verified part when a required asset is unverified', () => {
  const source = candidates.find((candidate) => candidate.slot === 'READING_SECTION_1')!;
  const singleSlotBlueprint: AssemblyBlueprint = {
    ...blueprint,
    id: uuid(),
    slots: [blueprint.slots.find((slot) => slot.partSlot === 'READING_SECTION_1')!],
  };
  assert.throws(() => compileAttemptManifest({
    blueprint: singleSlotBlueprint,
    candidates: [{ ...source, assetsReady: false }],
    seed: 'unverified-required-asset',
  }), /INSUFFICIENT_ELIGIBLE_PARTS/u);
});
