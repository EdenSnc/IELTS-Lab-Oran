import { scoreObjectiveGroups, objectiveAnswerKeySchema, normalizationSchema,
  type ObjectiveAnswerKey, type NormalizationRules, type ObjectiveGroup } from '@/lib/grading/objective-scoring-core';
import type { DiagnosticManifestPayload } from './manifest';

export type DiagnosticObjectiveGroup = {
  id: string; maxMarks: number; scoringStrategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET';
  questions: Array<{ id: string; stableKey: string; maxMarks: number }>;
  answerKey: ObjectiveAnswerKey; normalization: NormalizationRules;
};
export type DiagnosticRawScore = { skill: 'LISTENING' | 'READING'; rawScore: number; maximumRawScore: number; answered: number };

/** Authoritative callers supply an authenticated frozen manifest and decrypted verified keys. */
export function gradeDiagnosticRaw(input: {
  manifest: Pick<DiagnosticManifestPayload, 'parts' | 'questions'>;
  groups: DiagnosticObjectiveGroup[]; responses: Array<{ questionId: string; answer: string }>;
}): DiagnosticRawScore[] {
  const { manifest, groups, responses } = input;
  const responseIds = responses.map(response => response.questionId);
  if (new Set(responseIds).size !== responseIds.length || responses.length !== manifest.questions.length
    || responses.some(response => !manifest.questions.some(question => question.questionId === response.questionId)
      || typeof response.answer !== 'string' || response.answer.length > 20000)) throw new Error('DIAGNOSTIC_RESPONSE_INTEGRITY');
  const selectedGroups = manifest.parts.filter(part => ['LISTENING', 'READING'].includes(part.skill)).flatMap(part => part.groupIds);
  if (groups.length !== selectedGroups.length || new Set(groups.map(group => group.id)).size !== groups.length
    || groups.some(group => !selectedGroups.includes(group.id))) throw new Error('DIAGNOSTIC_KEY_INTEGRITY');
  const answerById = new Map(responses.map(response => [response.questionId, response.answer]));
  return (['LISTENING', 'READING'] as const).map(skill => {
    const frozen = manifest.questions.filter(question => question.skill === skill);
    const sourceGroups = manifest.parts.filter(part => part.skill === skill).flatMap(part => part.groupIds.map(id => ({ part, id })));
    const answers: Record<string, string> = {};
    const scoringGroups: ObjectiveGroup[] = sourceGroups.map(({ part, id }) => {
      const source = groups.find(group => group.id === id)!;
      const selected = frozen.filter(question => question.partOrder === part.displayOrder && part.groupIds[question.groupOrder - 1] === id);
      if (selected.length !== source.questions.length || new Set(source.questions.map(question => question.id)).size !== source.questions.length
        || source.questions.some(question => !selected.some(slot => slot.questionId === question.id && slot.maxMarks === question.maxMarks))) throw new Error('DIAGNOSTIC_SLOT_INTEGRITY');
      const key = objectiveAnswerKeySchema.parse(source.answerKey);
      if (key.strategy === 'PER_ITEM_EXACT') {
        const keys = Object.keys(key.answersByStableKey);
        if (keys.length !== source.questions.length || keys.some(stable => !source.questions.some(question => question.stableKey === stable))) throw new Error('DIAGNOSTIC_KEY_INTEGRITY');
      }
      const namespace = (stable: string) => `${id}:${stable}`;
      const answerKey: ObjectiveAnswerKey = key.strategy === 'PER_ITEM_EXACT' ? { ...key,
        answersByStableKey: Object.fromEntries(Object.entries(key.answersByStableKey).map(([stable, alternatives]) => [namespace(stable), alternatives])) } : key;
      return { scoringStrategy: source.scoringStrategy, maxMarks: source.maxMarks,
        normalization: normalizationSchema.parse(source.normalization), answerKey,
        questions: source.questions.map(question => {
          const slot = selected.find(item => item.questionId === question.id)!;
          answers[String(slot.questionNumber)] = answerById.get(question.id)!;
          return { stableKey: namespace(question.stableKey), sourceNumber: slot.questionNumber, maxMarks: question.maxMarks };
        }) };
    });
    const result = scoreObjectiveGroups({ groups: scoringGroups, answers });
    if (result.maximumRawScore !== (skill === 'LISTENING' ? 20 : frozen.length)
      || (skill === 'READING' && ![13, 14].includes(result.maximumRawScore))) throw new Error('DIAGNOSTIC_MARKS_INTEGRITY');
    return { skill, ...result };
  });
}
