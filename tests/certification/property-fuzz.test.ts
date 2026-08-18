import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreLoadedObjectiveContent,
} from '../../src/lib/grading/objective-grading.ts';
import type { LoadedObjectiveSection } from '../../src/lib/grading/objective-grading.ts';

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
  randString(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars[this.randInt(0, chars.length - 1)];
    }
    return res;
  }
}

test('Phase X: 10,000 Deterministic Generative Scoring Cases (Seed: 20260818)', () => {
  const prng = new DeterministicPRNG(20260818);
  const vocabulary = [
    'library', 'center', 'energy', 'solar', 'station', 'part-time', 'full-time',
    'water', 'filter', 'assessment', 'bridge', 'castle', 'tower', 'garden',
    'TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO', 'A', 'B', 'C', 'D', 'E', 'F',
  ];

  let totalCasesEvaluated = 0;

  for (let iter = 0; iter < 10_000; iter++) {
    const numGroups = prng.randInt(1, 3);
    const groups = [];
    const submittedAnswers: Record<string, string> = {};
    let globalQNum = 1;
    let expectedMaxMarks = 0;

    for (let g = 0; g < numGroups; g++) {
      const isUnordered = prng.next() > 0.6;
      const groupSize = isUnordered ? prng.randInt(2, 3) : prng.randInt(1, 4);
      const groupQuestions = [];
      const qNums: number[] = [];

      for (let q = 0; q < groupSize; q++) {
        const qNum = globalQNum++;
        qNums.push(qNum);
        groupQuestions.push({
          stableKey: `key_${g}_${q}`,
          sourceNumber: qNum,
          maxMarks: 1,
        });
      }

      expectedMaxMarks += groupSize;

      if (!isUnordered) {
        // PER_ITEM_EXACT
        const answersByStableKey: Record<string, string[]> = {};
        for (const q of groupQuestions) {
          const numVariants = prng.randInt(1, 3);
          const variants = Array.from({ length: numVariants }, () => prng.choice(vocabulary));
          answersByStableKey[q.stableKey] = variants;

          // Decide submission: correct variant, mutated variant, wrong, or blank
          const subType = prng.randInt(0, 3);
          if (subType === 0) {
            // Correct
            submittedAnswers[String(q.sourceNumber)] = prng.choice(variants);
          } else if (subType === 1) {
            // Cased / spaced variant
            const v = prng.choice(variants);
            submittedAnswers[String(q.sourceNumber)] = `  ${v.toUpperCase()}  `;
          } else if (subType === 2) {
            // Wrong word
            submittedAnswers[String(q.sourceNumber)] = `wrong_${prng.randString(4)}`;
          }
          // subType === 3: left blank (no answer)
        }

        groups.push({
          scoringStrategy: 'PER_ITEM_EXACT' as const,
          maxMarks: groupSize,
          questions: groupQuestions,
          answerKey: {
            payload: {
              strategy: 'PER_ITEM_EXACT' as const,
              answersByStableKey,
            },
          },
        });
      } else {
        // UNORDERED_EXACT_SET
        const acceptedSet = Array.from({ length: groupSize }, () => prng.choice(vocabulary));
        groups.push({
          scoringStrategy: 'UNORDERED_EXACT_SET' as const,
          maxMarks: groupSize,
          questions: groupQuestions,
          answerKey: {
            payload: {
              strategy: 'UNORDERED_EXACT_SET' as const,
              acceptedSets: [acceptedSet],
            },
          },
        });

        // Generate submissions for unordered set
        for (const qNum of qNums) {
          const subType = prng.randInt(0, 3);
          if (subType === 0) {
            submittedAnswers[String(qNum)] = prng.choice(acceptedSet);
          } else if (subType === 1) {
            // Duplicate of first accepted element
            submittedAnswers[String(qNum)] = acceptedSet[0];
          } else if (subType === 2) {
            submittedAnswers[String(qNum)] = `wrong_${prng.randString(4)}`;
          }
        }
      }
    }

    // Add random unknown keys to submittedAnswers to test boundary defense
    if (prng.next() > 0.5) {
      submittedAnswers[String(globalQNum + 5)] = 'random_junk';
      submittedAnswers['-99'] = 'random_junk';
    }

    const section: LoadedObjectiveSection = {
      skill: 'LISTENING',
      parts: [{ questionGroups: groups }],
    };

    const res = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: submittedAnswers },
    });

    const scored = res[0];

    // INVARIANT 1: 0 <= rawScore <= maximumRawScore
    assert.ok(
      scored.rawScore >= 0 && scored.rawScore <= scored.maximumRawScore,
      `Iteration ${iter}: rawScore ${scored.rawScore} out of bounds [0, ${scored.maximumRawScore}]`,
    );

    // INVARIANT 2: maximumRawScore equals sum of question maxMarks
    assert.equal(
      scored.maximumRawScore,
      expectedMaxMarks,
      `Iteration ${iter}: maximumRawScore mismatch`,
    );

    // INVARIANT 3: Pure Determinism - Scoring same input twice gives identical result
    const res2 = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: submittedAnswers },
    });
    assert.equal(
      res2[0].rawScore,
      scored.rawScore,
      `Iteration ${iter}: non-deterministic scoring detected`,
    );

    // INVARIANT 4: Unknown response fields cannot increase score
    const cleanAnswers = { ...submittedAnswers };
    delete cleanAnswers[String(globalQNum + 5)];
    delete cleanAnswers['-99'];
    const resClean = scoreLoadedObjectiveContent({
      sections: [section],
      submittedAnswers: { listening: cleanAnswers },
    });
    assert.equal(
      resClean[0].rawScore,
      scored.rawScore,
      `Iteration ${iter}: unknown fields altered score`,
    );

    totalCasesEvaluated++;
  }

  assert.equal(totalCasesEvaluated, 10_000, 'Must have evaluated exactly 10,000 distinct scoring cases');
});
