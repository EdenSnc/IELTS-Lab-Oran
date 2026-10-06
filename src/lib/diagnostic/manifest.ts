import { z } from 'zod';
import { parseFrozenManifestPayload, type FrozenManifestPayload } from '@/lib/attempts/manifest-core';
import {
  DIAGNOSTIC_PROFILE, diagnosticOptionsSchema, diagnosticSnapshotSchema, rejectDiagnosticContent as reject,
  type DiagnosticSnapshot,
} from './policy';

export type DiagnosticManifestPayload = FrozenManifestPayload & { diagnostic: DiagnosticSnapshot };

/** Validate frozen relationships, never present-day review freshness. */
export function parseDiagnosticManifestPayload(value: unknown): DiagnosticManifestPayload {
  const { diagnostic, ...body } = z.object({ diagnostic: diagnosticSnapshotSchema }).passthrough().parse(value);
  const payload = { ...parseFrozenManifestPayload(body), diagnostic };
  assertDiagnosticStructure(payload);
  return payload;
}

export function assertDiagnosticStructure(payload: DiagnosticManifestPayload): void {
  if (payload.variant !== 'ACADEMIC') reject('DIAGNOSTIC_VARIANT_INVALID');
  if (payload.totalTimeLimitSeconds !== DIAGNOSTIC_PROFILE.writtenSeconds
    || payload.parts.length !== 4
    || payload.parts.some((part) => part.sectionTimeLimitSeconds !== DIAGNOSTIC_PROFILE.listeningSeconds)
  ) reject('DIAGNOSTIC_TIMING_INVALID');

  const slots = ['LISTENING_PART_3', 'LISTENING_PART_4', null, 'WRITING_TASK_2'];
  const skills = ['LISTENING', 'LISTENING', 'READING', 'WRITING'];
  const suitability = ['HARDER_LISTENING', 'HARDER_LISTENING', 'REPRESENTATIVE_READING', 'TASK_2_DIAGNOSTIC'];
  const partIds = new Set<string>();
  const groupIds = new Set<string>();
  const audioIds = new Set<string>();
  const questionIds = new Set<string>();
  const numbers = new Map<string, number>();
  let cursor = 0;
  let audioDuration = 0;

  for (const [index, part] of payload.parts.entries()) {
    if (part.displayOrder !== index + 1 || part.skill !== skills[index]
      || (slots[index] === null ? !/^READING_SECTION_[123]$/u.test(part.slot) : part.slot !== slots[index])
    ) reject('DIAGNOSTIC_PART_INVALID');
    if (partIds.has(part.partId)) reject('DIAGNOSTIC_DUPLICATE_PART');
    partIds.add(part.partId);
    const review = payload.diagnostic.reviews[index];
    if (!review || review.partId !== part.partId || review.contentHash !== part.testVersionContentHash
      || review.suitability !== suitability[index]
    ) reject('DIAGNOSTIC_REVIEW_MISMATCH');
    if (part.skill === 'LISTENING') {
      if (!review.audio) reject('DIAGNOSTIC_AUDIO_MISSING');
      if (audioIds.has(review.audio.assetId)) reject('DIAGNOSTIC_DUPLICATE_AUDIO');
      audioIds.add(review.audio.assetId);
      audioDuration += review.audio.durationSeconds;
    } else if (review.audio) reject('DIAGNOSTIC_AUDIO_SKILL_INVALID');

    const partStart = cursor;
    for (const [groupIndex, groupId] of part.groupIds.entries()) {
      if (groupIds.has(groupId)) reject('DIAGNOSTIC_DUPLICATE_GROUP');
      groupIds.add(groupId);
      let questionOrder = 0;
      const options = payload.questions[cursor]?.presentedOptions;
      diagnosticOptionsSchema.parse(options);
      while (cursor < payload.questions.length) {
        const question = payload.questions[cursor];
        if (question.partOrder !== part.displayOrder || question.groupOrder !== groupIndex + 1) break;
        const number = (numbers.get(part.skill) ?? 0) + 1;
        questionOrder += 1;
        if (question.skill !== part.skill || question.questionOrder !== questionOrder
          || question.questionNumber !== number || question.maxMarks !== (part.skill === 'WRITING' ? 0 : 1)
          || JSON.stringify(question.presentedOptions) !== JSON.stringify(options)
        ) reject('DIAGNOSTIC_QUESTION_MAPPING_INVALID');
        if (questionIds.has(question.questionId)) reject('DIAGNOSTIC_DUPLICATE_QUESTION');
        questionIds.add(question.questionId);
        numbers.set(part.skill, number);
        cursor += 1;
      }
      if (questionOrder === 0) reject('DIAGNOSTIC_EMPTY_GROUP');
    }
    const count = cursor - partStart;
    if (part.skill === 'LISTENING' ? count !== 10
      : part.skill === 'READING' ? count < 13 || count > 14 : count !== 1
    ) reject('DIAGNOSTIC_QUESTION_COUNTS_INVALID');
  }
  if (cursor !== payload.questions.length) reject('DIAGNOSTIC_QUESTION_MAPPING_INVALID');
  if (audioDuration + DIAGNOSTIC_PROFILE.audioAllowanceSeconds > DIAGNOSTIC_PROFILE.listeningSeconds) {
    reject('DIAGNOSTIC_AUDIO_TOO_LONG');
  }
}
