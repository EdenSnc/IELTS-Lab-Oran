import { createHash } from 'node:crypto';

export type FrozenWritingResponse = {
  attemptQuestionId: string;
  questionId: string;
  taskNumber: 1 | 2;
  answer: string;
};

export function writingRunInputHash(attemptId: string, responses: FrozenWritingResponse[]) {
  const ordered = [...responses].sort((left, right) => left.taskNumber - right.taskNumber);
  return createHash('sha256').update(JSON.stringify({
    version: 1,
    attemptId,
    responses: ordered,
  })).digest('hex');
}

export function roundOverallBand(skillBands: number[]) {
  if (skillBands.length !== 4 || skillBands.some((band) => !Number.isFinite(band))) {
    throw new Error('FOUR_FINAL_SKILL_BANDS_REQUIRED');
  }
  return Math.round((skillBands.reduce((sum, band) => sum + band, 0) / 4) * 2) / 2;
}
