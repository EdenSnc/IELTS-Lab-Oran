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
        answerKey: { reviewStatus: 'VERIFIED', formatVersion: 2 },
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
