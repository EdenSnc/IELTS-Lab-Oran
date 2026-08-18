import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreLoadedObjectiveContent,
} from '../../src/lib/grading/objective-grading.ts';
import type { LoadedObjectiveSection } from '../../src/lib/grading/objective-grading.ts';
import {
  oracleGradeSection,
} from './scoring-oracle.ts';
import type { OracleSection, OracleQuestionGroup } from './scoring-oracle.ts';

// Deterministic Linear Congruential Generator (LCG) PRNG
class DeterministicPRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  randInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T {
    return arr[this.randInt(0, arr.length - 1)];
  }
  choiceDistinct<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
      const idx = this.randInt(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
  randString(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars[this.randInt(0, chars.length - 1)];
    }
    return res;
  }
}

test('Phase X: 10,000 Deterministic Generative Scoring & Differential Cases (Seed: 20260818)', () => {
  const prng = new DeterministicPRNG(20260818);
  const vocabulary = [
    'library', 'center', 'energy', 'solar', 'station', 'part-time', 'full-time',
    'water', 'filter', 'assessment', 'bridge', 'castle', 'tower', 'garden',
    'TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO', 'A', 'B', 'C', 'D', 'E', 'F',
  ];

  let totalCasesEvaluated = 0;

  for (let iter = 0; iter < 10_000; iter++) {
    const numGroups = prng.randInt(1, 3);
    const loadedGroups = [];
    const oracleGroups: OracleQuestionGroup[] = [];
    const submittedAnswers: Record<string, string> = {};
    let globalQNum = prng.randInt(1, 10);
    let expectedMaxMarks = 0;

    for (let g = 0; g < numGroups; g++) {
      const isUnordered = prng.next() > 0.6;
      const groupSize = isUnordered ? prng.randInt(2, 3) : prng.randInt(1, 4);
      const groupQuestions = [];
      const oracleQuestions = [];
      const qNums: number[] = [];

      for (let q = 0; q < groupSize; q++) {
        const qNum = globalQNum++;
        const sKey = `key_g${g}_q${q}_${prng.randString(3)}`;
        qNums.push(qNum);
        groupQuestions.push({
          stableKey: sKey,
          sourceNumber: qNum,
          maxMarks: 1,
        });
        oracleQuestions.push({
          stableKey: sKey,
          sourceNumber: qNum,
          maxMarks: 1,
        });
      }

      expectedMaxMarks += groupSize;

      const caseSensitive = prng.next() > 0.8;
      const punctuationSensitive = prng.next() > 0.8;
      const normConfig = { caseSensitive, punctuationSensitive };

      if (!isUnordered) {
        // PER_ITEM_EXACT
        const answersByStableKey: Record<string, string[]> = {};
        for (const q of groupQuestions) {
          const numVariants = prng.randInt(1, 3);
          const variants = prng.choiceDistinct(vocabulary, numVariants);
          answersByStableKey[q.stableKey] = variants;

          // Decide submission: correct variant, cased/spaced variant, wrong, or blank
          const subType = prng.randInt(0, 3);
          if (subType === 0) {
            submittedAnswers[String(q.sourceNumber)] = prng.choice(variants);
          } else if (subType === 1) {
            const v = prng.choice(variants);
            submittedAnswers[String(q.sourceNumber)] = `  ${v.toUpperCase()}  `;
          } else if (subType === 2) {
            submittedAnswers[String(q.sourceNumber)] = `wrong_${prng.randString(4)}`;
          }
          // subType === 3: omitted
        }

        loadedGroups.push({
          scoringStrategy: 'PER_ITEM_EXACT' as const,
          maxMarks: groupSize,
          questions: groupQuestions,
          answerKey: {
            normalization: normConfig,
            payload: {
              strategy: 'PER_ITEM_EXACT' as const,
              answersByStableKey,
            },
          },
        });

        oracleGroups.push({
          questionType: 'NOTE_COMPLETION',
          scoringStrategy: 'PER_ITEM_EXACT' as const,
          maxMarks: groupSize,
          questions: oracleQuestions,
          normalization: normConfig,
          answerKeyPayload: {
            strategy: 'PER_ITEM_EXACT' as const,
            answersByStableKey,
          },
        });
      } else {
        // UNORDERED_EXACT_SET with strictly distinct options
        const acceptedSet = prng.choiceDistinct(vocabulary, groupSize);
        loadedGroups.push({
          scoringStrategy: 'UNORDERED_EXACT_SET' as const,
          maxMarks: groupSize,
          questions: groupQuestions,
          answerKey: {
            normalization: normConfig,
            payload: {
              strategy: 'UNORDERED_EXACT_SET' as const,
              acceptedSets: [acceptedSet],
            },
          },
        });

        oracleGroups.push({
          questionType: 'MULTIPLE_CHOICE',
          scoringStrategy: 'UNORDERED_EXACT_SET' as const,
          maxMarks: groupSize,
          questions: oracleQuestions,
          normalization: normConfig,
          answerKeyPayload: {
            strategy: 'UNORDERED_EXACT_SET' as const,
            acceptedSets: [acceptedSet],
          },
        });

        // Generate submissions for unordered set
        for (const qNum of qNums) {
          const subType = prng.randInt(0, 3);
          if (subType === 0) {
            submittedAnswers[String(qNum)] = prng.choice(acceptedSet);
          } else if (subType === 1) {
            // Duplicate submission of first accepted item
            submittedAnswers[String(qNum)] = acceptedSet[0];
          } else if (subType === 2) {
            submittedAnswers[String(qNum)] = `wrong_${prng.randString(4)}`;
          }
        }
      }
    }

    const section: LoadedObjectiveSection = {
      skill: 'LISTENING',
      parts: [{ questionGroups: loadedGroups }],
    };

    const oracleSection: OracleSection = {
      skill: 'LISTENING',
      variant: 'ACADEMIC',
      groups: oracleGroups,
    };

    // Calculate score using production pure scoring boundary
    const res = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: submittedAnswers },
    });
    const scored = res[0];

    // Calculate score using independent Oracle
    const oracleScored = oracleGradeSection(oracleSection, submittedAnswers);

    // DIFFERENTIAL INVARIANT: Production pure scorer exactly matches independent Oracle
    assert.equal(
      scored.rawScore,
      oracleScored.rawScore,
      `Iteration ${iter}: rawScore mismatch (prod=${scored.rawScore}, oracle=${oracleScored.rawScore})`,
    );
    assert.equal(
      scored.maximumRawScore,
      oracleScored.maximumRawScore,
      `Iteration ${iter}: maximumRawScore mismatch (prod=${scored.maximumRawScore}, oracle=${oracleScored.maximumRawScore})`,
    );
    assert.equal(
      scored.answered,
      oracleScored.answered,
      `Iteration ${iter}: answered mismatch (prod=${scored.answered}, oracle=${oracleScored.answered})`,
    );

    // ALGEBRAIC INVARIANT 1: 0 <= rawScore <= maximumRawScore
    assert.ok(
      scored.rawScore >= 0 && scored.rawScore <= scored.maximumRawScore,
      `Iteration ${iter}: rawScore ${scored.rawScore} out of bounds [0, ${scored.maximumRawScore}]`,
    );

    // ALGEBRAIC INVARIANT 2: maximumRawScore equals expected sum
    assert.equal(
      scored.maximumRawScore,
      expectedMaxMarks,
      `Iteration ${iter}: maximumRawScore mismatch`,
    );

    // ALGEBRAIC INVARIANT 3: Determinism - scoring same input gives identical result
    const res2 = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: submittedAnswers },
    });
    assert.equal(
      res2[0].rawScore,
      scored.rawScore,
      `Iteration ${iter}: non-deterministic scoring detected`,
    );

    // ALGEBRAIC INVARIANT 4: Unknown response fields cannot increase score
    const poisonedAnswers = {
      ...submittedAnswers,
      '9999': 'malicious_input',
      '-1': 'malicious_input',
    };
    const resPoisoned = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: poisonedAnswers },
    });
    assert.equal(
      resPoisoned[0].rawScore,
      scored.rawScore,
      `Iteration ${iter}: unknown fields altered score`,
    );

    totalCasesEvaluated++;
  }

  assert.equal(totalCasesEvaluated, 10_000, 'Must have evaluated exactly 10,000 distinct scoring cases');
});
