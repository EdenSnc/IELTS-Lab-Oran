import { createHash } from 'node:crypto';
import { z } from 'zod';

export type AssemblyQuestion = {
  id: string;
  stableKey: string;
  displayOrder: number;
  maxMarks: number;
};

export type AssemblyQuestionGroup = {
  id: string;
  displayOrder: number;
  reviewStatus: string;
  scoringStrategy: string;
  maxMarks: number;
  independent: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  options: unknown;
  answerKey: { reviewStatus: string; formatVersion: number } | null;
  questions: AssemblyQuestion[];
};

export type AssemblyPart = {
  id: string;
  testVersionId: string;
  testVersionContentHash: string | null;
  testVariant: string;
  sourceYear: number | null;
  skill: string;
  sectionId: string;
  sectionTimeLimitSeconds: number | null;
  slot: string;
  reviewStatus: string;
  stimuliReady: boolean;
  shuffleQuestionGroups: boolean;
  groups: AssemblyQuestionGroup[];
};

export type AssemblySlot = {
  id: string;
  partSlot: string;
  displayOrder: number;
  requiredCount: number;
  selectionMode: 'WHOLE_PART' | 'INDEPENDENT_QUESTION_GROUPS';
  targetMarks: number | null;
};

export type AssemblyBlueprint = {
  id: string;
  version: number;
  variant: string;
  status: string;
  fixedTestVersionId: string | null;
  defaultMinimumSourceYear: number | null;
  allowArchiveByDefault: boolean;
  slots: AssemblySlot[];
};

export type FrozenManifestQuestion = {
  questionId: string;
  skill: string;
  partOrder: number;
  groupOrder: number;
  questionOrder: number;
  questionNumber: number;
  maxMarks: number;
  presentedOptions: unknown[] | null;
};

export type FrozenManifestPart = {
  partId: string;
  testVersionId: string;
  testVersionContentHash: string | null;
  slot: string;
  skill: string;
  displayOrder: number;
  sectionTimeLimitSeconds: number | null;
  groupIds: string[];
};

export type FrozenManifestPayload = {
  schemaVersion: 1;
  blueprintId: string;
  blueprintVersion: number;
  variant: string;
  seed: string;
  totalTimeLimitSeconds: number | null;
  parts: FrozenManifestPart[];
  questions: FrozenManifestQuestion[];
};

export type CompiledManifest = {
  contentHash: string;
  payload: FrozenManifestPayload;
};

export class ManifestCompilationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const frozenQuestionSchema = z.object({
  questionId: z.string().uuid(),
  skill: z.enum(['LISTENING', 'READING', 'WRITING', 'SPEAKING']),
  partOrder: z.number().int().positive(),
  groupOrder: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
  questionNumber: z.number().int().positive(),
  maxMarks: z.number().int().positive(),
  presentedOptions: z.array(z.unknown()).nullable(),
}).strict();

const frozenPartSchema = z.object({
  partId: z.string().uuid(),
  testVersionId: z.string().uuid(),
  testVersionContentHash: z.string().nullable(),
  slot: z.string().min(1),
  skill: z.enum(['LISTENING', 'READING', 'WRITING', 'SPEAKING']),
  displayOrder: z.number().int().positive(),
  sectionTimeLimitSeconds: z.number().int().positive().nullable(),
  groupIds: z.array(z.string().uuid()).min(1),
}).strict();

const frozenManifestSchema = z.object({
  schemaVersion: z.literal(1),
  blueprintId: z.string().uuid(),
  blueprintVersion: z.number().int().positive(),
  variant: z.enum(['ACADEMIC', 'GENERAL_TRAINING', 'UNIVERSAL']),
  seed: z.string().min(1),
  totalTimeLimitSeconds: z.number().int().positive().nullable(),
  parts: z.array(frozenPartSchema).min(1),
  questions: z.array(frozenQuestionSchema).min(1),
}).strict();

export function parseFrozenManifestPayload(value: unknown): FrozenManifestPayload {
  return frozenManifestSchema.parse(value) as FrozenManifestPayload;
}

export function hashFrozenManifestPayload(payload: FrozenManifestPayload) {
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

function randomWord(seed: string, scope: string, index: number) {
  const digest = createHash('sha256').update(`${seed}\u0000${scope}\u0000${index}`).digest();
  return digest.readUInt32BE(0) / 0x1_0000_0000;
}

export function deterministicShuffle<T>(values: readonly T[], seed: string, scope: string): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(randomWord(seed, scope, index) * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function supportedObjectiveGroup(group: AssemblyQuestionGroup) {
  const objective = group.scoringStrategy === 'PER_ITEM_EXACT'
    || group.scoringStrategy === 'UNORDERED_EXACT_SET';
  if (group.reviewStatus !== 'VERIFIED') return false;
  if (objective && (
    group.answerKey?.reviewStatus !== 'VERIFIED'
    || ![1, 2].includes(group.answerKey.formatVersion)
  )) return false;
  if (!objective && !['RUBRIC', 'NOT_SCORED'].includes(group.scoringStrategy)) return false;
  if (group.questions.length === 0) return false;
  const keys = new Set(group.questions.map((question) => question.stableKey));
  if (keys.size !== group.questions.length) return false;
  return group.questions.every((question) => question.maxMarks > 0)
    && group.questions.reduce((sum, question) => sum + question.maxMarks, 0) === group.maxMarks;
}

function supportedPart(part: AssemblyPart) {
  return part.reviewStatus === 'VERIFIED'
    && part.stimuliReady
    && part.groups.length > 0
    && part.groups.every(supportedObjectiveGroup);
}

function variantCompatible(blueprintVariant: string, partVariant: string) {
  return partVariant === blueprintVariant || partVariant === 'UNIVERSAL';
}

function findGroupCombination(
  groups: AssemblyQuestionGroup[],
  count: number,
  targetMarks: number | null,
): AssemblyQuestionGroup[] | null {
  function visit(index: number, chosen: AssemblyQuestionGroup[]): AssemblyQuestionGroup[] | null {
    if (chosen.length === count) {
      const marks = chosen.reduce((sum, group) => sum + group.maxMarks, 0);
      return targetMarks === null || marks === targetMarks ? chosen : null;
    }
    for (let cursor = index; cursor <= groups.length - (count - chosen.length); cursor += 1) {
      const result = visit(cursor + 1, [...chosen, groups[cursor]]);
      if (result) return result;
    }
    return null;
  }
  return visit(0, []);
}

function optionArray(value: unknown) {
  return Array.isArray(value) ? value.map((option) => structuredClone(option)) : null;
}

export function compileAttemptManifest(input: {
  blueprint: AssemblyBlueprint;
  candidates: AssemblyPart[];
  seed: string;
  minimumSourceYear?: number;
  archiveIncluded?: boolean;
}): CompiledManifest {
  const { blueprint, seed } = input;
  if (blueprint.status !== 'PUBLISHED') throw new ManifestCompilationError('BLUEPRINT_NOT_PUBLISHED');
  if (!seed) throw new ManifestCompilationError('RANDOM_SEED_REQUIRED');

  const minimumSourceYear = input.minimumSourceYear ?? blueprint.defaultMinimumSourceYear;
  const archiveIncluded = input.archiveIncluded ?? blueprint.allowArchiveByDefault;
  const eligible = input.candidates.filter((part) => (
    supportedPart(part)
    && variantCompatible(blueprint.variant, part.testVariant)
    && (!blueprint.fixedTestVersionId || part.testVersionId === blueprint.fixedTestVersionId)
    && (archiveIncluded || minimumSourceYear === null || part.sourceYear === null || part.sourceYear >= minimumSourceYear)
  ));

  const chosenParts: Array<{ part: AssemblyPart; groups: AssemblyQuestionGroup[]; displayOrder: number }> = [];
  for (const slot of [...blueprint.slots].sort((left, right) => left.displayOrder - right.displayOrder)) {
    if (slot.requiredCount < 1) throw new ManifestCompilationError('INVALID_SLOT_REQUIRED_COUNT');
    const slotParts = eligible
      .filter((part) => part.slot === slot.partSlot)
      .sort((left, right) => left.id.localeCompare(right.id));

    if (slot.selectionMode === 'WHOLE_PART') {
      const selected = deterministicShuffle(slotParts, seed, `slot:${slot.id}:parts`).slice(0, slot.requiredCount);
      if (selected.length !== slot.requiredCount) throw new ManifestCompilationError('INSUFFICIENT_ELIGIBLE_PARTS');
      selected.forEach((part, selectedIndex) => {
        const groups = part.shuffleQuestionGroups
          ? deterministicShuffle(part.groups, seed, `part:${part.id}:groups`)
          : [...part.groups].sort((left, right) => left.displayOrder - right.displayOrder);
        if (part.shuffleQuestionGroups && groups.some((group) => !group.independent)) {
          throw new ManifestCompilationError('DEPENDENT_GROUP_SHUFFLE_FORBIDDEN');
        }
        const marks = groups.reduce((sum, group) => sum + group.maxMarks, 0);
        if (slot.targetMarks !== null && marks !== slot.targetMarks) {
          throw new ManifestCompilationError('SLOT_TARGET_MARKS_MISMATCH');
        }
        chosenParts.push({ part, groups, displayOrder: slot.displayOrder * 100 + selectedIndex });
      });
      continue;
    }

    const shuffledParts = deterministicShuffle(slotParts, seed, `slot:${slot.id}:group-parts`);
    let selected: { part: AssemblyPart; groups: AssemblyQuestionGroup[] } | null = null;
    for (const part of shuffledParts) {
      const groups = deterministicShuffle(
        part.groups.filter((group) => group.independent),
        seed,
        `slot:${slot.id}:groups:${part.id}`,
      );
      const combination = findGroupCombination(groups, slot.requiredCount, slot.targetMarks);
      if (combination) {
        selected = { part, groups: combination };
        break;
      }
    }
    if (!selected) throw new ManifestCompilationError('INSUFFICIENT_INDEPENDENT_GROUPS');
    chosenParts.push({ ...selected, displayOrder: slot.displayOrder * 100 });
  }

  const questionNumbers = new Map<string, number>();
  const questions: FrozenManifestQuestion[] = [];
  const parts: FrozenManifestPart[] = [];
  const seenQuestions = new Set<string>();
  const sectionDurations = new Map<string, number>();

  chosenParts.sort((left, right) => left.displayOrder - right.displayOrder).forEach((selection, partIndex) => {
    const { part, groups } = selection;
    if (part.sectionTimeLimitSeconds !== null) {
      sectionDurations.set(part.sectionId, part.sectionTimeLimitSeconds);
    }
    parts.push({
      partId: part.id,
      testVersionId: part.testVersionId,
      testVersionContentHash: part.testVersionContentHash,
      slot: part.slot,
      skill: part.skill,
      displayOrder: partIndex + 1,
      sectionTimeLimitSeconds: part.sectionTimeLimitSeconds,
      groupIds: groups.map((group) => group.id),
    });

    groups.forEach((group, groupIndex) => {
      const orderedQuestions = group.shuffleQuestions
        ? deterministicShuffle(group.questions, seed, `group:${group.id}:questions`)
        : [...group.questions].sort((left, right) => left.displayOrder - right.displayOrder);
      const presentedOptions = optionArray(group.options);
      const shuffledOptions = group.shuffleOptions && presentedOptions
        ? deterministicShuffle(presentedOptions, seed, `group:${group.id}:options`)
        : presentedOptions;

      orderedQuestions.forEach((question, questionIndex) => {
        if (seenQuestions.has(question.id)) throw new ManifestCompilationError('DUPLICATE_QUESTION');
        seenQuestions.add(question.id);
        const questionNumber = (questionNumbers.get(part.skill) ?? 0) + 1;
        questionNumbers.set(part.skill, questionNumber);
        questions.push({
          questionId: question.id,
          skill: part.skill,
          partOrder: partIndex + 1,
          groupOrder: groupIndex + 1,
          questionOrder: questionIndex + 1,
          questionNumber,
          maxMarks: question.maxMarks,
          presentedOptions: shuffledOptions,
        });
      });
    });
  });

  if (questions.length === 0) throw new ManifestCompilationError('EMPTY_MANIFEST');
  const payload: FrozenManifestPayload = {
    schemaVersion: 1,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    variant: blueprint.variant,
    seed,
    totalTimeLimitSeconds: sectionDurations.size > 0
      ? [...sectionDurations.values()].reduce((sum, value) => sum + value, 0)
      : null,
    parts,
    questions,
  };
  const contentHash = hashFrozenManifestPayload(payload);
  return { contentHash, payload };
}
