import type { DeliveryQuestionGroup } from '../content/delivery-types';

export type DiagnosticControlKind = 'single' | 'multi' | 'select' | 'short' | 'essay' | 'unsupported';

export function diagnosticControlKind(group: DeliveryQuestionGroup): DiagnosticControlKind {
  if (!group.questions.length || group.questions.some((q) => !q.id)
    || new Set(group.questions.map((q) => q.id)).size !== group.questions.length) return 'unsupported';
  if (['AUDIO_RECORDING', 'NONE'].includes(group.responseKind)) return 'unsupported';
  if (group.responseKind === 'LONG_TEXT') {
    return group.questionType === 'WRITING_TASK_2_ESSAY' && group.questions.length === 1 ? 'essay' : 'unsupported';
  }
  const choice = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DRAG_DROP'].includes(group.responseKind);
  if (choice && (!group.options.length || group.options.some((o) => !o.label.trim() || !o.text.trim())
    || new Set(group.options.map((o) => o.label)).size !== group.options.length)) return 'unsupported';
  if (group.scoringStrategy === 'UNORDERED_EXACT_SET') {
    return choice && group.options.length >= group.questions.length ? 'multi' : 'unsupported';
  }
  if (group.responseKind === 'SINGLE_CHOICE') return 'single';
  if (group.responseKind === 'DRAG_DROP') return 'select';
  if (group.responseKind === 'SHORT_TEXT') return 'short';
  return 'unsupported';
}

/** A set is represented by one label per scoring question, including cleared slots. */
export function mapDiagnosticSelection(group: DeliveryQuestionGroup, labels: string[]): Record<string, string> {
  if (diagnosticControlKind(group) !== 'multi' || new Set(labels).size !== labels.length
    || labels.length > group.questions.length || labels.some((label) => !group.options.some((o) => o.label === label))) {
    throw new Error('Invalid diagnostic selection');
  }
  const ordered = group.options.filter((o) => labels.includes(o.label)).map((o) => o.label);
  return Object.fromEntries(group.questions.map((q, index) => [q.id, ordered[index] ?? '']));
}

export function toggleDiagnosticSelection(group: DeliveryQuestionGroup, answers: Record<string, string>, label: string): Record<string, string> {
  const selected = group.options.filter((o) => group.questions.some((q) => answers[q.id] === o.label)).map((o) => o.label);
  const next = selected.includes(label) ? selected.filter((value) => value !== label)
    : selected.length < group.questions.length ? [...selected, label] : selected;
  return mapDiagnosticSelection(group, next);
}

export function countDiagnosticWords(text: string): number {
  return text.match(/\p{N}+(?:[.,٫٬]\p{N}+)+|[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu)?.length ?? 0;
}

export function boundDiagnosticEssay(text: string): string {
  const bounded = text.slice(0, 20_000);
  return /[\uD800-\uDBFF]$/u.test(bounded) ? bounded.slice(0, -1) : bounded;
}
