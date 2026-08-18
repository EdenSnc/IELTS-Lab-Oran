import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rawScoreToEstimatedBand,
} from '../../src/lib/grading/objective-grading.ts';
import { oracleRoundOverall } from './scoring-oracle.ts';

test('Phase Y: Exhaustive Raw-to-Band Mapping (0 to 40) & Official Anchor Alignment', () => {
  // Official IELTS published anchor points:
  // Listening: 16 -> 5.0, 23 -> 6.0, 30 -> 7.0, 35 -> 8.0
  assert.equal(rawScoreToEstimatedBand('LISTENING', 16), 5.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 23), 6.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 30), 7.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 35), 8.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 39), 9.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 40), 9.0);
  assert.equal(rawScoreToEstimatedBand('LISTENING', 0), 0.0);

  // Academic Reading: 15 -> 5.0, 23 -> 6.0, 30 -> 7.0, 35 -> 8.0
  assert.equal(rawScoreToEstimatedBand('READING', 15, 'ACADEMIC'), 5.0);
  assert.equal(rawScoreToEstimatedBand('READING', 23, 'ACADEMIC'), 6.0);
  assert.equal(rawScoreToEstimatedBand('READING', 30, 'ACADEMIC'), 7.0);
  assert.equal(rawScoreToEstimatedBand('READING', 35, 'ACADEMIC'), 8.0);
  assert.equal(rawScoreToEstimatedBand('READING', 39, 'ACADEMIC'), 9.0);
  assert.equal(rawScoreToEstimatedBand('READING', 40, 'ACADEMIC'), 9.0);
  assert.equal(rawScoreToEstimatedBand('READING', 0, 'ACADEMIC'), 0.0);

  // General Training Reading: 15 -> 4.0, 23 -> 5.0, 30 -> 6.0, 35 -> 7.0
  assert.equal(rawScoreToEstimatedBand('READING', 15, 'GENERAL_TRAINING'), 4.0);
  assert.equal(rawScoreToEstimatedBand('READING', 23, 'GENERAL_TRAINING'), 5.0);
  assert.equal(rawScoreToEstimatedBand('READING', 30, 'GENERAL_TRAINING'), 6.0);
  assert.equal(rawScoreToEstimatedBand('READING', 35, 'GENERAL_TRAINING'), 7.0);
  assert.equal(rawScoreToEstimatedBand('READING', 40, 'GENERAL_TRAINING'), 9.0);
  assert.equal(rawScoreToEstimatedBand('READING', 0, 'GENERAL_TRAINING'), 0.0);

  // Verify monotonicity for all 0-40 values
  for (let raw = 0; raw < 40; raw++) {
    assert.ok(
      rawScoreToEstimatedBand('LISTENING', raw) <= rawScoreToEstimatedBand('LISTENING', raw + 1),
      `Listening band at raw ${raw} must be <= raw ${raw + 1}`,
    );
    assert.ok(
      rawScoreToEstimatedBand('READING', raw, 'ACADEMIC') <= rawScoreToEstimatedBand('READING', raw + 1, 'ACADEMIC'),
      `Academic reading band at raw ${raw} must be <= raw ${raw + 1}`,
    );
    assert.ok(
      rawScoreToEstimatedBand('READING', raw, 'GENERAL_TRAINING') <= rawScoreToEstimatedBand('READING', raw + 1, 'GENERAL_TRAINING'),
      `General reading band at raw ${raw} must be <= raw ${raw + 1}`,
    );
  }
});

test('Writing, Speaking, and Overall IELTS Band Calculation Formulas', () => {
  // Writing aggregation formula: Task 2 is weighted 2x Task 1
  const calculateWritingBand = (task1: number, task2: number) => {
    return oracleRoundOverall((task1 + 2 * task2) / 3);
  };

  assert.equal(calculateWritingBand(6.0, 7.0), 6.5); // (6 + 14)/3 = 6.666 -> 6.5
  assert.equal(calculateWritingBand(7.0, 6.0), 6.5); // (7 + 12)/3 = 6.333 -> 6.5
  assert.equal(calculateWritingBand(6.5, 7.0), 7.0); // (6.5 + 14)/3 = 6.833 -> 7.0

  // Speaking aggregation formula: 4 criteria carry equal weight
  const calculateSpeakingBand = (fc: number, lr: number, gra: number, pr: number) => {
    return oracleRoundOverall((fc + lr + gra + pr) / 4);
  };
  assert.equal(calculateSpeakingBand(6.0, 6.5, 7.0, 6.5), 6.5); // 26/4 = 6.5
  assert.equal(calculateSpeakingBand(6.0, 6.0, 6.5, 6.5), 6.5); // 25/4 = 6.25 -> 6.5

  // Overall 4-Skill Band official rounding rules
  assert.equal(oracleRoundOverall(6.25), 6.5);
  assert.equal(oracleRoundOverall(6.75), 7.0);
  assert.equal(oracleRoundOverall(6.125), 6.0);
  assert.equal(oracleRoundOverall(6.375), 6.5);
  assert.equal(oracleRoundOverall(6.625), 6.5);
  assert.equal(oracleRoundOverall(6.875), 7.0);

  // Exhaustive validation across all possible component half-bands (0.0 to 9.0 in 0.5 increments = 19 values per skill)
  const halfBands = Array.from({ length: 19 }, (_, i) => i * 0.5);
  let totalCombinationsTested = 0;

  for (const l of halfBands) {
    for (const r of halfBands) {
      for (const w of halfBands) {
        for (const s of halfBands) {
          const avg = (l + r + w + s) / 4;
          const overall = oracleRoundOverall(avg);

          // Verify overall is always a valid half-band in [0.0, 9.0]
          assert.ok(
            overall >= 0.0 && overall <= 9.0,
            `Overall band ${overall} out of range for L=${l}, R=${r}, W=${w}, S=${s}`,
          );
          assert.equal(
            overall % 0.5,
            0,
            `Overall band ${overall} must be a multiple of 0.5`,
          );
          totalCombinationsTested++;
        }
      }
    }
  }

  assert.equal(totalCombinationsTested, 130_321, 'Exhaustively tested all 130,321 4-skill combinations');
});
