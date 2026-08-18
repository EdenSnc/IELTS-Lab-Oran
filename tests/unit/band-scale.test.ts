import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBandScale,
  validateBandScaleThresholds,
} from '../../src/lib/grading/objective-grading.ts';

test('BandScale: version/provenance and estimated IELTS-style conversion (Invariant 11)', async () => {
  // Test Listening thresholds
  const listeningScores: Array<[number, number]> = [
    [40, 9.0],
    [39, 9.0],
    [38, 8.5],
    [37, 8.5],
    [35, 8.0],
    [30, 7.0],
    [23, 6.0],
    [15, 4.5],
    [10, 3.5],
    [0, 0.0],
  ];

  for (const [rawScore, expectedBand] of listeningScores) {
    const result = await resolveBandScale({
      skill: 'LISTENING',
      variant: 'ACADEMIC',
      rawScore,
      maximumRawScore: 40,
    });
    assert.equal(result.band, expectedBand, `Listening raw ${rawScore} should produce band ${expectedBand}`);
  }

  // Test Academic Reading thresholds
  const readingScores: Array<[number, number]> = [
    [40, 9.0],
    [39, 9.0],
    [37, 8.5],
    [35, 8.0],
    [30, 7.0],
    [23, 6.0],
    [15, 5.0],
    [0, 0.0],
  ];

  for (const [rawScore, expectedBand] of readingScores) {
    const result = await resolveBandScale({
      skill: 'READING',
      variant: 'ACADEMIC',
      rawScore,
      maximumRawScore: 40,
    });
    assert.equal(result.band, expectedBand, `Academic Reading raw ${rawScore} should produce band ${expectedBand}`);
  }

  // Non-40 maximum (e.g. practice module) returns band: null (does not fake band conversion)
  const practiceResult = await resolveBandScale({
    skill: 'READING',
    variant: 'ACADEMIC',
    rawScore: 12,
    maximumRawScore: 13,
  });
  assert.equal(practiceResult.band, null);
});

test('BandScale: validateBandScaleThresholds enforces strict schema and bounds', () => {
  // Valid threshold table
  const validThresholds: Array<[number, number]> = [
    [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0],
    [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [0, 0.0],
  ];
  assert.equal(validateBandScaleThresholds(validThresholds), true);

  // Invalid: not an array
  assert.equal(validateBandScaleThresholds(null), false);
  assert.equal(validateBandScaleThresholds({}), false);

  // Invalid: out-of-bounds raw score (> 40 or < 0)
  assert.equal(validateBandScaleThresholds([[45, 9.0]]), false);
  assert.equal(validateBandScaleThresholds([[-1, 0.0]]), false);

  // Invalid: out-of-bounds band (> 9.0 or < 0.0)
  assert.equal(validateBandScaleThresholds([[40, 10.0]]), false);

  // Invalid: band not on 0.5 increment
  assert.equal(validateBandScaleThresholds([[30, 6.3]]), false);

  // Invalid: duplicate minimum raw score
  assert.equal(validateBandScaleThresholds([[30, 7.0], [30, 6.5]]), false);
});
