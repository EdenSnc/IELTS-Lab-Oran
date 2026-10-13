import {
  compileAttemptManifest,
  hashFrozenManifestPayload,
  type AssemblyBlueprint,
  type AssemblyPart,
} from '@/lib/attempts/manifest-core';
import { DIAGNOSTIC_PROFILE, diagnosticOptionsSchema, diagnosticReviewSchema, rejectDiagnosticContent as reject, type DiagnosticReview } from './policy';
import { parseDiagnosticManifestPayload, type DiagnosticManifestPayload } from './manifest';

export { DiagnosticContentError } from './policy';

/** Only server-selected, published content enters this compiler. Reviews bind to
 * immutable source hashes. Timing overrides are frozen copies, never source edits. */
export function compileDiagnosticManifest(input: {
  blueprint: AssemblyBlueprint;
  candidates: AssemblyPart[];
  reviews: DiagnosticReview[];
  seed: string;
  now: Date;
}): { payload: DiagnosticManifestPayload; contentHash: string } {
  if (!Number.isFinite(input.now.getTime())) reject('DIAGNOSTIC_CLOCK_INVALID');
  if (input.blueprint.variant !== 'ACADEMIC') reject('DIAGNOSTIC_VARIANT_INVALID');
  const slots = [...input.blueprint.slots].sort((a, b) => a.displayOrder - b.displayOrder);
  if (slots.length !== 4
    || slots[0].partSlot !== 'LISTENING_PART_3'
    || slots[1].partSlot !== 'LISTENING_PART_4'
    || !/^READING_SECTION_[123]$/u.test(slots[2].partSlot)
    || slots[3].partSlot !== 'WRITING_TASK_2'
    || slots.some((slot) => slot.requiredCount !== 1 || slot.selectionMode !== 'WHOLE_PART')
    || new Set(slots.map((slot) => slot.displayOrder)).size !== 4
  ) reject('DIAGNOSTIC_BLUEPRINT_INVALID');

  // Ambiguous identities must not become order-dependent selection, even when
  // a duplicate would later be filtered out as ineligible.
  const candidateIds = new Set<string>();
  const groupIds = new Set<string>();
  const questionIds = new Set<string>();
  for (const part of input.candidates) {
    if (candidateIds.has(part.id)) reject('DIAGNOSTIC_DUPLICATE_PART');
    candidateIds.add(part.id);
    const groupOrders = new Set<number>();
    for (const group of part.groups) {
      if (groupIds.has(group.id)) reject('DIAGNOSTIC_DUPLICATE_GROUP');
      groupIds.add(group.id);
      diagnosticOptionsSchema.parse(group.options);
      if (!Number.isInteger(group.displayOrder) || group.displayOrder < 0 || groupOrders.has(group.displayOrder)) {
        reject('DIAGNOSTIC_SOURCE_ORDER_INVALID');
      }
      groupOrders.add(group.displayOrder);
      const questionOrders = new Set<number>();
      for (const question of group.questions) {
        if (questionIds.has(question.id)) reject('DIAGNOSTIC_DUPLICATE_QUESTION');
        questionIds.add(question.id);
        if (!Number.isInteger(question.displayOrder) || question.displayOrder < 0 || questionOrders.has(question.displayOrder)) {
          reject('DIAGNOSTIC_SOURCE_ORDER_INVALID');
        }
        questionOrders.add(question.displayOrder);
      }
    }
  }

  const reviews = input.reviews.map((review) => diagnosticReviewSchema.parse(review));
  const byPart = new Map(reviews.map((review) => [review.partId, review]));
  if (byPart.size !== reviews.length) reject('DIAGNOSTIC_DUPLICATE_REVIEW');
  const candidates = input.candidates.filter((part) => {
    const review = byPart.get(part.id);
    if (!review || review.contentHash !== part.testVersionContentHash) return false;
    const reviewed = Date.parse(review.reviewedAt);
    const due = Date.parse(review.reviewDueAt);
    if (reviewed > input.now.getTime() || due <= input.now.getTime() || reviewed >= due) return false;
    if (part.shuffleQuestionGroups || part.groups.some((group) => group.shuffleQuestions || group.shuffleOptions)) return false;
    if (part.skill === 'LISTENING') return review.suitability === 'HARDER_LISTENING' && !!review.audio;
    if (part.skill === 'READING') return review.suitability === 'REPRESENTATIVE_READING' && !review.audio;
    if (part.skill === 'WRITING') return review.suitability === 'TASK_2_DIAGNOSTIC' && !review.audio;
    return false;
  }).map((part) => ({ ...part, sectionTimeLimitSeconds: 1_200 }));

  const compiled = compileAttemptManifest({ blueprint: input.blueprint, candidates, seed: input.seed });
  const selectedReviews = compiled.payload.parts.map((part) => byPart.get(part.partId)!);
  const durationMs = selectedReviews.reduce((sum, review) => sum + Math.round((review.audio?.durationSeconds ?? 0)*1000), 0);
  if (durationMs + DIAGNOSTIC_PROFILE.audioAllowanceSeconds*1000 > DIAGNOSTIC_PROFILE.listeningSeconds*1000) {
    reject('DIAGNOSTIC_AUDIO_TOO_LONG');
  }
  const payload = parseDiagnosticManifestPayload({
    ...compiled.payload,
    diagnostic: {
      code: DIAGNOSTIC_PROFILE.code, version: DIAGNOSTIC_PROFILE.version,
      scoreMeaning: 'DIAGNOSTIC_ONLY', listeningSeconds: 1_200,
      readingSeconds: 1_200, writingSeconds: 1_200,
      speakingDelivery: 'IN_PERSON_SEPARATE', reviews: selectedReviews,
    },
  });
  return { payload, contentHash: hashFrozenManifestPayload(payload) };
}
