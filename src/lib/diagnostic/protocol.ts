import type { DiagnosticStage } from './session-core';

export const DIAGNOSTIC_WRITER_HEADER = 'x-diagnostic-writer';

export type DiagnosticErrorCode = 'NOT_FOUND' | 'STAFF_REQUIRED' | 'ACCOUNT_UNAVAILABLE'
  | 'INVITATION_UNAVAILABLE' | 'INVITATION_CONSUMED' | 'CONTENT_NOT_READY'
  | 'CONTENT_INTEGRITY' | 'WRITER_CONFLICT' | 'WRITER_REQUIRED' | 'INVALID_RESPONSE'
  | 'RESPONSE_CONFLICT' | 'SECTION_NOT_ACTIVE' | 'SESSION_EXPIRED' | 'SESSION_SUBMITTED' | 'WRITTEN_NOT_SUBMITTED';

/** Safe public error codes; never attach source secrets or database exception details. */
export class DiagnosticError extends Error {
  constructor(public readonly code: DiagnosticErrorCode, public readonly status: number) {
    super(code);
    this.name = 'DiagnosticError';
  }
}

export type DiagnosticInvitationDto = {
  id: string; blueprintId: string; createdAt: string; expiresAt: string;
  revokedAt: string | null; sessionId: string | null;
  status: 'AVAILABLE' | 'EXPIRED' | 'REVOKED' | 'STARTED';
};
export type DiagnosticResponseDto = {
  questionId: string; answer: string; markedForReview: boolean; version: number;
  savedAt: string | null; finalizedAt: string | null;
};
export type DiagnosticSessionDto = {
  id: string; invitationId: string; blueprintId: string; state: 'ACTIVE' | 'SUBMITTED';
  startedAt: string; deadline: string; submittedAt: string | null; version: number;
  serverNow: string;
  window: {
    stage: DiagnosticStage; sectionDeadline: string | null;
    absoluteDeadline: string; remainingSeconds: number;
  };
  responses: DiagnosticResponseDto[];
};
export type DiagnosticWriterDto = {
  writerToken: string; expiresAt: string; session: DiagnosticSessionDto;
};
