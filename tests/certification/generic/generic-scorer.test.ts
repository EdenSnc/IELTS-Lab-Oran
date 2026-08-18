import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreLoadedObjectiveContent,
} from '../../../src/lib/grading/objective-grading.ts';
import type { LoadedObjectiveSection } from '../../../src/lib/grading/objective-grading.ts';

test('Generic Scorer Certification: Variable Lengths, Single Skills, and N-Item Unordered Sets', () => {
  // ---------------------------------------------------------------------------
  // 1. Single Skill Only (Reading with 5 questions)
  // ---------------------------------------------------------------------------
  const singleSkillSection: LoadedObjectiveSection = {
    skill: 'READING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 5,
            questions: [
              { stableKey: 'q1', sourceNumber: 1, maxMarks: 1 },
              { stableKey: 'q2', sourceNumber: 2, maxMarks: 1 },
              { stableKey: 'q3', sourceNumber: 3, maxMarks: 1 },
              { stableKey: 'q4', sourceNumber: 4, maxMarks: 1 },
              { stableKey: 'q5', sourceNumber: 5, maxMarks: 1 },
            ],
            answerKey: {
              payload: {
                strategy: 'PER_ITEM_EXACT',
                answersByStableKey: {
                  q1: ['TRUE'],
                  q2: ['FALSE'],
                  q3: ['NOT GIVEN'],
                  q4: ['YES'],
                  q5: ['NO'],
                },
              },
            },
          },
        ],
      },
    ],
  };

  const resSingle = scoreLoadedObjectiveContent({
    sections: [singleSkillSection],
    submittedAnswers: {
      reading: {
        '1': 'true',
        '2': 'false',
        '3': 'not given',
        '4': 'wrong',
        '5': 'no',
      },
    },
  });

  assert.equal(resSingle.length, 1);
  assert.equal(resSingle[0].skill, 'READING');
  assert.equal(resSingle[0].rawScore, 4);
  assert.equal(resSingle[0].maximumRawScore, 5);
  assert.equal(resSingle[0].answered, 5);

  // ---------------------------------------------------------------------------
  // 2. Unordered Exact Set with N=3 Questions
  // ---------------------------------------------------------------------------
  const unordered3Group: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'UNORDERED_EXACT_SET',
            maxMarks: 3,
            questions: [
              { stableKey: 'u1', sourceNumber: 11, maxMarks: 1 },
              { stableKey: 'u2', sourceNumber: 12, maxMarks: 1 },
              { stableKey: 'u3', sourceNumber: 13, maxMarks: 1 },
            ],
            answerKey: {
              payload: {
                strategy: 'UNORDERED_EXACT_SET',
                acceptedSets: [['A', 'C', 'E']],
              },
            },
          },
        ],
      },
    ],
  };

  // 2a. All 6 Permutations of A, C, E must earn 3 marks
  const permutations = [
    ['A', 'C', 'E'],
    ['A', 'E', 'C'],
    ['C', 'A', 'E'],
    ['C', 'E', 'A'],
    ['E', 'A', 'C'],
    ['E', 'C', 'A'],
  ];

  for (const [p1, p2, p3] of permutations) {
    const resPerm = scoreLoadedObjectiveContent({
      sections: [unordered3Group],
      submittedAnswers: {
        listening: { '11': p1, '12': p2, '13': p3 },
      },
    });
    assert.equal(resPerm[0].rawScore, 3, `Permutation [${p1}, ${p2}, ${p3}] must earn 3 marks`);
  }

  // 2b. Duplicates in N=3 set: [A, A, C] must earn 2 marks (not 3)
  const resDup2 = scoreLoadedObjectiveContent({
    sections: [unordered3Group],
    submittedAnswers: {
      listening: { '11': 'A', '12': 'A', '13': 'C' },
    },
  });
  assert.equal(resDup2[0].rawScore, 2, 'Duplicate submission [A, A, C] must earn exactly 2 marks');

  // 2c. Triplicate in N=3 set: [A, A, A] must earn 1 mark (not 3)
  const resDup3 = scoreLoadedObjectiveContent({
    sections: [unordered3Group],
    submittedAnswers: {
      listening: { '11': 'A', '12': 'A', '13': 'A' },
    },
  });
  assert.equal(resDup3[0].rawScore, 1, 'Triplicate submission [A, A, A] must earn exactly 1 mark');

  // 2d. Partial correct [A, B, D] must earn 1 mark
  const resPart = scoreLoadedObjectiveContent({
    sections: [unordered3Group],
    submittedAnswers: {
      listening: { '11': 'A', '12': 'B', '13': 'D' },
    },
  });
  assert.equal(resPart[0].rawScore, 1, 'Partial match [A, B, D] must earn exactly 1 mark');

  // ---------------------------------------------------------------------------
  // 3. Unknown Question Numbers & Malformed Response Security
  // ---------------------------------------------------------------------------
  const resUnknown = scoreLoadedObjectiveContent({
    sections: [singleSkillSection],
    submittedAnswers: {
      reading: {
        '99': 'TRUE',
        '-1': 'TRUE',
        'abc': 'TRUE',
      },
    },
  });
  assert.equal(resUnknown[0].rawScore, 0, 'Unknown submitted keys must not award any marks');
  assert.equal(resUnknown[0].answered, 0);

  // ---------------------------------------------------------------------------
  // 4. Runtime Defenses: Malformed Section Inputs Fail Closed
  // ---------------------------------------------------------------------------
  // 4a. Scored question with null sourceNumber fails closed
  const brokenNullSourceSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 1,
            questions: [{ stableKey: 'b1', sourceNumber: null, maxMarks: 1 }],
            answerKey: {
              payload: { strategy: 'PER_ITEM_EXACT', answersByStableKey: { b1: ['valid'] } },
            },
          },
        ],
      },
    ],
  };
  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [brokenNullSourceSection],
      submittedAnswers: { listening: { '1': 'valid' } },
    });
  }, /INVALID_QUESTION_SOURCE_NUMBER/);

  // 4b. Strategy mismatch fails closed
  const brokenStrategySection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 1,
            questions: [{ stableKey: 'b2', sourceNumber: 1, maxMarks: 1 }],
            answerKey: {
              payload: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['A']] },
            },
          },
        ],
      },
    ],
  };
  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [brokenStrategySection],
      submittedAnswers: { listening: { '1': 'A' } },
    });
  }, /SCORING_STRATEGY_MISMATCH/);

  // 4c. Group maxMarks mismatch fails closed
  const brokenMaxMarksSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 5, // declares 5, but only 1 mark in questions
            questions: [{ stableKey: 'b3', sourceNumber: 1, maxMarks: 1 }],
            answerKey: {
              payload: { strategy: 'PER_ITEM_EXACT', answersByStableKey: { b3: ['valid'] } },
            },
          },
        ],
      },
    ],
  };
  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [brokenMaxMarksSection],
      submittedAnswers: { listening: { '1': 'valid' } },
    });
  }, /GROUP_MAX_MARKS_MISMATCH/);

  // 4d. Unordered accepted set length mismatch fails closed
  const brokenSetLengthSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'UNORDERED_EXACT_SET',
            maxMarks: 2,
            questions: [
              { stableKey: 'u1', sourceNumber: 1, maxMarks: 1 },
              { stableKey: 'u2', sourceNumber: 2, maxMarks: 1 },
            ],
            answerKey: {
              payload: {
                strategy: 'UNORDERED_EXACT_SET',
                acceptedSets: [['A', 'B', 'C']], // 3 elements for 2 questions
              },
            },
          },
        ],
      },
    ],
  };
  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [brokenSetLengthSection],
      submittedAnswers: { listening: { '1': 'A', '2': 'B' } },
    });
  }, /INVALID_UNORDERED_SET_LENGTH/);

  // 4e. Unordered accepted set duplicate items (exact and case-insensitive) fail closed
  const brokenDuplicateSetSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'UNORDERED_EXACT_SET',
            maxMarks: 2,
            questions: [
              { stableKey: 'u1', sourceNumber: 1, maxMarks: 1 },
              { stableKey: 'u2', sourceNumber: 2, maxMarks: 1 },
            ],
            answerKey: {
              normalization: { caseSensitive: false },
              payload: {
                strategy: 'UNORDERED_EXACT_SET',
                acceptedSets: [['A', 'a']], // duplicate after normalization
              },
            },
          },
        ],
      },
    ],
  };
  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [brokenDuplicateSetSection],
      submittedAnswers: { listening: { '1': 'A', '2': 'a' } },
    });
  }, /DUPLICATE_ACCEPTED_SET_ELEMENT/);
});
