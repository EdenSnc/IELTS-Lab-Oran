import assert from 'node:assert/strict';
import test from 'node:test';
import { certifyCompleteMockPackage } from '../../src/lib/content/content-certification';
import type { StagedTestPackage } from '../../src/lib/content/staging-schema';

function part(skill: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING', index: number, count: number) {
  return {
    sourceKey: `${skill}-${index}`,
    reviewStatus: 'VERIFIED',
    stimuli: [{ sourceKey: `${skill}-stimulus-${index}`, reviewStatus: 'VERIFIED' }],
    questionGroups: [{
      sourceKey: `${skill}-group-${index}`,
      reviewStatus: 'VERIFIED',
      answerKey: skill === 'LISTENING' || skill === 'READING'
        ? { reviewStatus: 'VERIFIED' }
        : undefined,
      questions: Array.from({ length: count }, () => ({ maxMarks: 1 })),
    }],
  };
}

function completePackage() {
  return {
    test: {
      sections: [
        { skill: 'LISTENING', parts: Array.from({ length: 4 }, (_, index) => part('LISTENING', index, 10)) },
        { skill: 'READING', parts: [part('READING', 0, 13), part('READING', 1, 13), part('READING', 2, 14)] },
        { skill: 'WRITING', parts: [part('WRITING', 0, 1), part('WRITING', 1, 1)] },
        { skill: 'SPEAKING', parts: [part('SPEAKING', 0, 1), part('SPEAKING', 1, 1), part('SPEAKING', 2, 1)] },
      ],
    },
  } as unknown as StagedTestPackage;
}

test('complete mock certification requires exact LR marks and verified provenance', () => {
  assert.deepEqual(certifyCompleteMockPackage(completePackage()), {
    certified: true,
    questionCount: 80,
  });
  const invalid = completePackage();
  invalid.test.sections[0].parts[0].questionGroups[0].questions.pop();
  assert.throws(() => certifyCompleteMockPackage(invalid), /OBJECTIVE_SECTION_NOT_40_MARKS/u);
  const unverified = completePackage();
  unverified.test.sections[1].parts[0].reviewStatus = 'PENDING_REVIEW';
  assert.throws(() => certifyCompleteMockPackage(unverified), /PART_UNVERIFIED/u);
});
