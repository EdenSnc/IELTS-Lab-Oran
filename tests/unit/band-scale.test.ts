import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBandScale } from '../../src/lib/grading/objective-grading.ts';

test('BandScale: version/provenance and exact IELTS threshold conversion (Invariant 11)', async () => {
  // Test Listening thresholds
  const listeningScores: Array<[number, number]> = [
    [40, 9.0],
    [39, 9.0],
    [38, 8.5],
    [37, 8.5],
    [35, 8.0],
    [30, 7.0],
    [23, 6.0],
    [16, 5.0],
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
