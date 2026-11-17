import { DIAGNOSTIC_PROFILE } from './policy';

export type DiagnosticWrittenSkill = 'LISTENING' | 'READING' | 'WRITING';
export type DiagnosticStage = DiagnosticWrittenSkill | 'SUBMITTED';

export type DiagnosticTimingErrorCode =
  | 'INVALID_STARTED_AT'
  | 'INVALID_NOW'
  | 'NOW_BEFORE_START'
  | 'INVALID_DEADLINE'
  | 'INVALID_SKILL'
  | 'SECTION_NOT_ACTIVE'
  | 'SESSION_EXPIRED'
  | 'INVALID_REMAINING_SECONDS';

export class DiagnosticTimingError extends Error {
  constructor(public readonly code: DiagnosticTimingErrorCode) {
    super(code);
    this.name = 'DiagnosticTimingError';
  }
}

export type DiagnosticTimeInput = { startedAt: Date; now: Date };
export type DiagnosticWindow = {
  stage: DiagnosticStage;
  sectionDeadline: Date | null;
  absoluteDeadline: Date;
  remainingSeconds: number;
};

function timestamp(value: Date, code: 'INVALID_STARTED_AT' | 'INVALID_NOW'): number {
  if (!(value instanceof Date)) throw new DiagnosticTimingError(code);
  const result = Date.prototype.getTime.call(value);
  if (!Number.isFinite(result)) throw new DiagnosticTimingError(code);
  return result;
}

/** Callers supply server receipt time; no client stage, timer or transition is authoritative. */
export function deriveDiagnosticWindow({ startedAt, now }: DiagnosticTimeInput): DiagnosticWindow {
  const start = timestamp(startedAt, 'INVALID_STARTED_AT');
  const current = timestamp(now, 'INVALID_NOW');
  if (current < start) throw new DiagnosticTimingError('NOW_BEFORE_START');

  const listeningEnd = start + DIAGNOSTIC_PROFILE.listeningSeconds * 1000;
  const readingEnd = listeningEnd + DIAGNOSTIC_PROFILE.readingSeconds * 1000;
  const writingEnd = readingEnd + DIAGNOSTIC_PROFILE.writingSeconds * 1000;
  const absoluteDeadline = new Date(writingEnd);
  if (!Number.isFinite(absoluteDeadline.getTime())) throw new DiagnosticTimingError('INVALID_DEADLINE');

  if (current >= writingEnd) {
    return { stage: 'SUBMITTED', sectionDeadline: null, absoluteDeadline, remainingSeconds: 0 };
  }

  const stage: DiagnosticWrittenSkill = current < listeningEnd ? 'LISTENING'
    : current < readingEnd ? 'READING' : 'WRITING';
  const deadline = stage === 'LISTENING' ? listeningEnd : stage === 'READING' ? readingEnd : writingEnd;
  return {
    stage,
    sectionDeadline: new Date(deadline),
    absoluteDeadline,
    remainingSeconds: Math.ceil((deadline - current) / 1000),
  };
}

export function assertDiagnosticResponseWritable(input: DiagnosticTimeInput & { skill: unknown }): void {
  const window = deriveDiagnosticWindow(input);
  if (input.skill !== 'LISTENING' && input.skill !== 'READING' && input.skill !== 'WRITING') {
    throw new DiagnosticTimingError('INVALID_SKILL');
  }
  if (window.stage === 'SUBMITTED') throw new DiagnosticTimingError('SESSION_EXPIRED');
  if (input.skill !== window.stage) throw new DiagnosticTimingError('SECTION_NOT_ACTIVE');
}

/** ASCII minutes only: localize the surrounding UI label, never this clock token. */
export function formatDiagnosticRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > Number.MAX_SAFE_INTEGER) {
    throw new DiagnosticTimingError('INVALID_REMAINING_SECONDS');
  }
  return seconds === 0 ? '0' : String(Math.max(1, Math.ceil(seconds / 60)));
}
