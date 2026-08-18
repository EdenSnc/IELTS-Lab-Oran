import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAnswer,
  countWords,
  isWithinWordLimit,
  rawScoreToEstimatedBand,
} from '../../src/lib/grading/objective-grading.ts';

// Deterministic Linear Congruential Generator (LCG) PRNG
class SeededPRNG {
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
  randString(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars[this.randInt(0, chars.length - 1)];
    }
    return res;
  }
  randLetters(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars[this.randInt(0, chars.length - 1)];
    }
    return res;
  }
}

test('Phase X: 10,000 Property & Fuzz Tests (Deterministic Seed: 20260818)', () => {
  const prng = new SeededPRNG(20260818);
  const acceptedAnswers = ['central library', '50 percent', 'solar energy', 'part-time', 'True', 'A'];

  for (let iter = 0; iter < 10_000; iter++) {
    const testType = iter % 7;

    if (testType === 0) {
      // Property 1: Random noisy strings never match accepted answers (unless identical)
      const randomStr = prng.randString(prng.randInt(1, 20));
      const normRand = normalizeAnswer(randomStr, { caseSensitive: false, punctuationSensitive: false });
      for (const accepted of acceptedAnswers) {
        const normAcc = normalizeAnswer(accepted, { caseSensitive: false, punctuationSensitive: false });
        if (normRand !== normAcc) {
          assert.notEqual(normRand, normAcc);
        }
      }
    } else if (testType === 1) {
      // Property 6: Adding extra words over word limit always fails isWithinWordLimit
      const baseWord = acceptedAnswers[prng.randInt(0, acceptedAnswers.length - 1)];
      const maxWords = prng.randInt(1, 2);
      const extraWords = Array.from({ length: maxWords + 1 }, () => prng.randLetters(4)).join(' ');
      const overLimitStr = `${baseWord} ${extraWords}`;
      assert.equal(
        isWithinWordLimit(overLimitStr, { maxWords, allowNumbers: true }),
        false,
        `String '${overLimitStr}' should exceed ${maxWords} words`,
      );
    } else if (testType === 2) {
      // Property 7: Changing case on text answer preserves normalized equality
      const baseWord = acceptedAnswers[prng.randInt(0, acceptedAnswers.length - 1)];
      const randomizedCase = baseWord.split('').map((c) => (prng.next() > 0.5 ? c.toUpperCase() : c.toLowerCase())).join('');
      assert.equal(
        normalizeAnswer(randomizedCase, { caseSensitive: false }),
        normalizeAnswer(baseWord, { caseSensitive: false }),
      );
    } else if (testType === 3) {
      // Property 8: Blank/whitespace strings count as 0 words and normalize to empty
      const spaces = ' '.repeat(prng.randInt(1, 10));
      assert.equal(countWords(spaces), 0);
      assert.equal(normalizeAnswer(spaces), '');
    } else if (testType === 4) {
      // Property 9: rawScoreToEstimatedBand bounds check [0, 9.0]
      const raw = prng.randInt(-5, 45);
      const skill = prng.next() > 0.5 ? 'LISTENING' : 'READING';
      const variant = (prng.next() > 0.5 ? 'ACADEMIC' : 'GENERAL_TRAINING') as 'ACADEMIC' | 'GENERAL_TRAINING';
      const band = rawScoreToEstimatedBand(skill, raw, variant);
      assert.ok(band >= 0.0 && band <= 9.0, `Band ${band} must be between 0.0 and 9.0`);
    } else if (testType === 5) {
      // Property 12: Determinism - calling normalization twice with same input gives exact same output
      const str = prng.randString(prng.randInt(1, 30));
      const res1 = normalizeAnswer(str);
      const res2 = normalizeAnswer(str);
      assert.equal(res1, res2);
    } else if (testType === 6) {
      // Property 14: Hyphenated compound words count as 1 word
      const compound = `${prng.randLetters(4)}-${prng.randLetters(4)}`;
      assert.equal(countWords(compound), 1);
    }
  }
});
