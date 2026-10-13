import type { DiagnosticResponseDto } from './protocol';

export type SaveState = 'saved' | 'saving' | 'offline' | 'conflict';
type Draft = { answer: string; markedForReview: boolean; serial: number; state: SaveState };
export type DiagnosticSaveInput = {
  questionId: string; expectedVersion: number; answer: string; markedForReview: boolean;
};

/** One serialized diagnostic queue. A local edit is never a server acknowledgement. */
export class DiagnosticAutosave {
  private acknowledged = new Map<string, DiagnosticResponseDto>();
  private pending = new Map<string, Draft>();
  private serial = 0;
  private flushing: Promise<void> | null = null;
  constructor(responses: DiagnosticResponseDto[], private changed: () => void = () => {}) {
    for (const response of responses) this.acknowledged.set(response.questionId, response);
  }
  get hasPending() { return this.pending.size > 0; }
  edit(id: string, patch: { answer?: string; markedForReview?: boolean }) {
    const prior = this.pending.get(id) ?? this.acknowledged.get(id);
    if (!prior || this.pending.get(id)?.state === 'conflict') return;
    this.pending.set(id, { answer: patch.answer ?? prior.answer,
      markedForReview: patch.markedForReview ?? prior.markedForReview,
      serial: ++this.serial, state: 'saving' });
    this.changed();
  }
  view() {
    const saveStates: Record<string, SaveState> = {};
    const responses = [...this.acknowledged.values()].map(response => {
      const draft = this.pending.get(response.questionId);
      if (draft || response.savedAt) saveStates[response.questionId] = draft?.state ?? 'saved';
      return draft ? { ...response, answer: draft.answer, markedForReview: draft.markedForReview, savedAt: null } : response;
    });
    return { responses, saveStates };
  }
  reconcile(responses: DiagnosticResponseDto[]) {
    for (const response of responses) {
      const prior = this.acknowledged.get(response.questionId);
      const draft = this.pending.get(response.questionId);
      if (prior && response.version < prior.version) continue;
      if (draft && prior && response.version > prior.version) {
        if (draft.answer === response.answer && draft.markedForReview === response.markedForReview) this.pending.delete(response.questionId);
        else draft.state = 'conflict';
      }
      this.acknowledged.set(response.questionId, response);
    }
    this.changed();
  }
  /** New readiness caller only: preserve expired drafts, never pretend they were saved. */
  preserveClosedDrafts(activeQuestionIds: ReadonlySet<string>): DiagnosticResponseDto[] {
    const copies: DiagnosticResponseDto[]=[];
    for(const [id,draft] of this.pending){
      if(activeQuestionIds.has(id))continue;
      copies.push({...this.acknowledged.get(id)!,answer:draft.answer,markedForReview:draft.markedForReview,savedAt:null});
      this.pending.delete(id);
    }
    if(copies.length)this.changed();
    return copies;
  }
  flush(save: (input: DiagnosticSaveInput) => Promise<DiagnosticResponseDto>): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = this.drain(save).finally(() => { this.flushing = null; });
    return this.flushing;
  }
  private async drain(save: (input: DiagnosticSaveInput) => Promise<DiagnosticResponseDto>) {
    while (this.pending.size) {
      const next = [...this.pending.entries()].find(([, draft]) => draft.state !== 'conflict');
      if (!next) return;
      const [questionId, draft] = next;
      const acknowledged = this.acknowledged.get(questionId)!;
      draft.state = 'saving'; this.changed();
      try {
        const response = await save({ questionId, expectedVersion: acknowledged.version,
          answer: draft.answer, markedForReview: draft.markedForReview });
        if (response.questionId !== questionId || !Number.isSafeInteger(response.version) || response.version < acknowledged.version
          || response.answer !== draft.answer || response.markedForReview !== draft.markedForReview || !response.savedAt) throw new Error('INVALID_ACKNOWLEDGEMENT');
        this.acknowledged.set(questionId, response);
        if (this.pending.get(questionId)?.serial === draft.serial) this.pending.delete(questionId);
        this.changed();
      } catch (error) {
        const current = this.pending.get(questionId);
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        if (current) current.state = /CONFLICT|SECTION|EXPIRED|SUBMITTED/u.test(code) ? 'conflict' : 'offline';
        this.changed();
        throw error;
      }
    }
  }
}
