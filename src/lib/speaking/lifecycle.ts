export type SessionState =
  | 'READY' | 'LIVE_PART_1' | 'LIVE_PART_2' | 'LIVE_PART_3' | 'ENDED'
  | 'RECORDING_PROCESSING' | 'AWAITING_HUMAN_SCORE' | 'AI_PROCESSING'
  | 'READY_FOR_REVIEW' | 'FINALIZED' | 'FAILED';

const transitions: Record<SessionState, readonly SessionState[]> = {
  READY: ['LIVE_PART_1', 'FAILED'],
  LIVE_PART_1: ['LIVE_PART_2', 'ENDED', 'FAILED'],
  LIVE_PART_2: ['LIVE_PART_3', 'ENDED', 'FAILED'],
  LIVE_PART_3: ['ENDED', 'FAILED'],
  ENDED: ['RECORDING_PROCESSING', 'AWAITING_HUMAN_SCORE', 'FAILED'],
  RECORDING_PROCESSING: ['AWAITING_HUMAN_SCORE', 'FAILED'],
  AWAITING_HUMAN_SCORE: ['AI_PROCESSING', 'READY_FOR_REVIEW', 'FINALIZED'],
  AI_PROCESSING: ['READY_FOR_REVIEW', 'AWAITING_HUMAN_SCORE'],
  READY_FOR_REVIEW: ['FINALIZED', 'AI_PROCESSING'],
  FINALIZED: [],
  FAILED: ['READY', 'AWAITING_HUMAN_SCORE'],
};

export function assertSessionTransition(from: SessionState, to: SessionState) {
  if (!transitions[from].includes(to)) throw new Error(`INVALID_SESSION_TRANSITION:${from}:${to}`);
}

export function partForState(state: SessionState) {
  if (state === 'LIVE_PART_1') return 'PART_1' as const;
  if (state === 'LIVE_PART_2') return 'PART_2' as const;
  if (state === 'LIVE_PART_3') return 'PART_3' as const;
  return null;
}

export function roundSpeakingBand(value: number) {
  return Math.round(value * 2) / 2;
}

export function deriveSpeakingBand(scores: readonly number[]) {
  if (scores.length !== 4 || scores.some((score) => score < 0 || score > 9 || score * 2 % 1 !== 0)) {
    throw new Error('INVALID_SPEAKING_BANDS');
  }
  return roundSpeakingBand(scores.reduce((sum, score) => sum + score, 0) / 4);
}

export function fullMockOverall(scores: ReadonlyArray<{ skill: string; band: number }>) {
  const required = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
  if (!required.every((skill) => scores.some((score) => score.skill === skill))) return null;
  return roundSpeakingBand(required.reduce((sum, skill) => sum + (scores.find((score) => score.skill === skill)?.band ?? 0), 0) / 4);
}
