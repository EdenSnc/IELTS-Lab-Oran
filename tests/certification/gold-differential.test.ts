import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreLoadedObjectiveContent,
} from '../../src/lib/grading/objective-grading.ts';
import type { LoadedObjectiveSection } from '../../src/lib/grading/objective-grading.ts';
import {
  oracleGradeSection,
} from './scoring-oracle.ts';
import type { OracleSection } from './scoring-oracle.ts';
import {
  scoreHistoricalContent,
} from './historical-reference.ts';
import type { HistoricalSection } from './historical-reference.ts';

test('Gold Differential Certification: Oracle vs Current Production Scorer vs Historical Reference', () => {
  // Construct a comprehensive multi-group section with explicit caseSensitive: false normalization
  const loadedSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 3,
            questions: [
              { stableKey: 'q1', sourceNumber: 1, maxMarks: 1 },
              { stableKey: 'q2', sourceNumber: 2, maxMarks: 1 },
              { stableKey: 'q3', sourceNumber: 3, maxMarks: 1 },
            ],
            answerKey: {
              normalization: { caseSensitive: false },
              payload: {
                strategy: 'PER_ITEM_EXACT',
                answersByStableKey: {
                  q1: ['central library'],
                  q2: ['12 years'],
                  q3: ['50 percent'],
                },
              },
            },
          },
          {
            scoringStrategy: 'UNORDERED_EXACT_SET',
            maxMarks: 2,
            questions: [
              { stableKey: 'q4', sourceNumber: 4, maxMarks: 1 },
              { stableKey: 'q5', sourceNumber: 5, maxMarks: 1 },
            ],
            answerKey: {
              normalization: { caseSensitive: false },
              payload: {
                strategy: 'UNORDERED_EXACT_SET',
                acceptedSets: [['A', 'C']],
              },
            },
          },
        ],
      },
    ],
  };

  const oracleSection: OracleSection = {
    skill: 'LISTENING',
    variant: 'ACADEMIC',
    groups: [
      {
        questionType: 'NOTE_COMPLETION',
        scoringStrategy: 'PER_ITEM_EXACT',
        maxMarks: 3,
        questions: [
          { stableKey: 'q1', sourceNumber: 1, maxMarks: 1 },
          { stableKey: 'q2', sourceNumber: 2, maxMarks: 1 },
          { stableKey: 'q3', sourceNumber: 3, maxMarks: 1 },
        ],
        normalization: { caseSensitive: false },
        answerKeyPayload: {
          strategy: 'PER_ITEM_EXACT',
          answersByStableKey: {
            q1: ['central library'],
            q2: ['12 years'],
            q3: ['50 percent'],
          },
        },
      },
      {
        questionType: 'MULTIPLE_CHOICE',
        scoringStrategy: 'UNORDERED_EXACT_SET',
        maxMarks: 2,
        questions: [
          { stableKey: 'q4', sourceNumber: 4, maxMarks: 1 },
          { stableKey: 'q5', sourceNumber: 5, maxMarks: 1 },
        ],
        normalization: { caseSensitive: false },
        answerKeyPayload: {
          strategy: 'UNORDERED_EXACT_SET',
          acceptedSets: [['A', 'C']],
        },
      },
    ],
  };

  const historicalSection: HistoricalSection = {
    skill: 'LISTENING',
    groups: [
      {
        scoringStrategy: 'PER_ITEM_EXACT',
        maxMarks: 3,
        questions: [
          { stableKey: 'q1', sourceNumber: 1, maxMarks: 1 },
          { stableKey: 'q2', sourceNumber: 2, maxMarks: 1 },
          { stableKey: 'q3', sourceNumber: 3, maxMarks: 1 },
        ],
        normalization: { caseSensitive: false },
        answerKey: {
          strategy: 'PER_ITEM_EXACT',
          answersByStableKey: {
            q1: ['central library'],
            q2: ['12 years'],
            q3: ['50 percent'],
          },
        },
      },
      {
        scoringStrategy: 'UNORDERED_EXACT_SET',
        maxMarks: 2,
        questions: [
          { stableKey: 'q4', sourceNumber: 4, maxMarks: 1 },
          { stableKey: 'q5', sourceNumber: 5, maxMarks: 1 },
        ],
        normalization: { caseSensitive: false },
        answerKey: {
          strategy: 'UNORDERED_EXACT_SET',
          acceptedSets: [['A', 'C']],
        },
      },
    ],
  };

  // Test Matrix: standard learner responses when caseSensitive: false is explicitly configured
  const testSubmissions = [
    // 1. All correct: (5/5)
    {
      label: 'All Correct (HISTORICAL_BEHAVIOR_PRESERVED)',
      answers: { '1': 'central library', '2': '12 years', '3': '50 percent', '4': 'A', '5': 'C' },
      expectedScore: 5,
    },
    // 2. All wrong: (0/5)
    {
      label: 'All Wrong (HISTORICAL_BEHAVIOR_PRESERVED)',
      answers: { '1': 'wrong', '2': 'wrong', '3': 'wrong', '4': 'X', '5': 'Y' },
      expectedScore: 0,
    },
    // 3. Reversed unordered set: (5/5)
    {
      label: 'Reversed Unordered (HISTORICAL_BEHAVIOR_PRESERVED)',
      answers: { '1': 'central library', '2': '12 years', '3': '50 percent', '4': 'C', '5': 'A' },
      expectedScore: 5,
    },
    // 4. Duplicate unordered response: [A, A] -> 1 mark (total 4/5)
    {
      label: 'Duplicate Unordered (HISTORICAL_BEHAVIOR_PRESERVED)',
      answers: { '1': 'central library', '2': '12 years', '3': '50 percent', '4': 'A', '5': 'A' },
      expectedScore: 4,
    },
    // 5. Casing and whitespace tolerance with caseSensitive: false: (5/5)
    {
      label: 'Casing/Whitespace (HISTORICAL_BEHAVIOR_PRESERVED)',
      answers: { '1': '  CENTRAL   LIBRARY  ', '2': '12 YEARS', '3': '50 Percent', '4': 'a', '5': 'c' },
      expectedScore: 5,
    },
  ];

  for (const sub of testSubmissions) {
    const currentRes = scoreLoadedObjectiveContent({
      sections: [loadedSection],
      submittedAnswers: { listening: sub.answers },
    });
    const oracleRes = oracleGradeSection(oracleSection, sub.answers);
    const historicalRes = scoreHistoricalContent(historicalSection, sub.answers);

    // 1. Current Scorer matches expected
    assert.equal(
      currentRes[0].rawScore,
      sub.expectedScore,
      `Current Scorer mismatch on ${sub.label}`,
    );

    // 2. Oracle matches Current Scorer
    assert.equal(
      oracleRes.rawScore,
      currentRes[0].rawScore,
      `Oracle mismatch with Current Scorer on ${sub.label}`,
    );

    // 3. Historical Scorer matches Current Scorer (HISTORICAL_BEHAVIOR_PRESERVED)
    assert.equal(
      historicalRes.rawScore,
      currentRes[0].rawScore,
      `Historical Reference mismatch with Current Scorer on ${sub.label}`,
    );
  }

  // ---------------------------------------------------------------------------
  // REGRESSION: OMITTED NORMALIZATION ({}) DIFFERENTIAL
  // Demonstrating exact historical case-sensitive behavior vs current engine default
  // (SCHEMA_DEFAULT_EVOLUTION_DOCUMENTED)
  // ---------------------------------------------------------------------------
  const unconfiguredLoadedSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 1,
            questions: [{ stableKey: 'q_case', sourceNumber: 1, maxMarks: 1 }],
            answerKey: {
              normalization: {}, // unconfigured
              payload: { strategy: 'PER_ITEM_EXACT', answersByStableKey: { q_case: ['central library'] } },
            },
          },
        ],
      },
    ],
  };

  const unconfiguredHistoricalSection: HistoricalSection = {
    skill: 'LISTENING',
    groups: [
      {
        scoringStrategy: 'PER_ITEM_EXACT',
        maxMarks: 1,
        questions: [{ stableKey: 'q_case', sourceNumber: 1, maxMarks: 1 }],
        normalization: {}, // unconfigured
        answerKey: { strategy: 'PER_ITEM_EXACT', answersByStableKey: { q_case: ['central library'] } },
      },
    ],
  };

  // Current engine defaults to case-insensitive (matches "CENTRAL LIBRARY")
  const currentUnconfiguredRes = scoreLoadedObjectiveContent({
    sections: [unconfiguredLoadedSection],
    submittedAnswers: { listening: { '1': 'CENTRAL LIBRARY' } },
  });
  assert.equal(currentUnconfiguredRes[0].rawScore, 1, 'Current engine defaults to case-insensitive');

  // Historical reference (commit 72d17015...) with unconfigured rules was strictly case-sensitive
  const historicalUnconfiguredRes = scoreHistoricalContent(
    unconfiguredHistoricalSection,
    { '1': 'CENTRAL LIBRARY' },
  );
  assert.equal(
    historicalUnconfiguredRes.rawScore,
    0,
    'Historical scorer with omitted caseSensitive remained case-sensitive (SCHEMA_DEFAULT_EVOLUTION_DOCUMENTED)',
  );

  // ---------------------------------------------------------------------------
  // INTENTIONAL CORRECTIONS & DEFENSE COMPARISON
  // ---------------------------------------------------------------------------
  // Runtime Defense: Current production scorer throws INVALID_QUESTION_SOURCE_NUMBER
  // when a scored question has a null sourceNumber.
  const nullSourceNumberSection: LoadedObjectiveSection = {
    skill: 'LISTENING',
    parts: [
      {
        questionGroups: [
          {
            scoringStrategy: 'PER_ITEM_EXACT',
            maxMarks: 1,
            questions: [{ stableKey: 'q_null', sourceNumber: null, maxMarks: 1 }],
            answerKey: {
              payload: { strategy: 'PER_ITEM_EXACT', answersByStableKey: { q_null: ['ans'] } },
            },
          },
        ],
      },
    ],
  };

  assert.throws(() => {
    scoreLoadedObjectiveContent({
      sections: [nullSourceNumberSection],
      submittedAnswers: { listening: { '1': 'ans' } },
    });
  }, /INVALID_QUESTION_SOURCE_NUMBER/);
});
