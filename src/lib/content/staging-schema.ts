import { z } from 'zod';

export const SourceProviderSchema = z.enum([
  'OTHER',
]);

export const ArtifactKindSchema = z.enum([
  'HTML',
  'CSS',
  'JAVASCRIPT',
  'JSON',
  'PDF',
  'AUDIO',
  'IMAGE',
  'VIDEO',
  'OTHER',
]);

export const TestVariantSchema = z.enum([
  'ACADEMIC',
  'GENERAL_TRAINING',
  'UNIVERSAL',
]);

export const SkillSchema = z.enum([
  'LISTENING',
  'READING',
  'WRITING',
  'SPEAKING',
]);

export const ReviewStatusSchema = z.enum([
  'AUTO_EXTRACTED',
  'PENDING_REVIEW',
  'VERIFIED',
]);

export const PartSlotSchema = z.enum([
  'LISTENING_PART_1',
  'LISTENING_PART_2',
  'LISTENING_PART_3',
  'LISTENING_PART_4',
  'READING_SECTION_1',
  'READING_SECTION_2',
  'READING_SECTION_3',
  'WRITING_TASK_1',
  'WRITING_TASK_2',
  'SPEAKING_PART_1',
  'SPEAKING_PART_2',
  'SPEAKING_PART_3',
]);

export const StimulusTypeSchema = z.enum([
  'READING_PASSAGE',
  'AUDIO_TRACK',
  'WRITING_PROMPT',
  'SPEAKING_PROMPT',
  'SHARED_CONTEXT',
  'INSTRUCTION',
]);

export const QuestionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'MATCHING',
  'MATCHING_INFORMATION',
  'MATCHING_HEADINGS',
  'MATCHING_FEATURES',
  'MATCHING_SENTENCE_ENDINGS',
  'IDENTIFYING_INFORMATION',
  'IDENTIFYING_WRITER_VIEWS',
  'SENTENCE_COMPLETION',
  'SUMMARY_COMPLETION',
  'NOTE_COMPLETION',
  'TABLE_COMPLETION',
  'FLOWCHART_COMPLETION',
  'DIAGRAM_LABEL_COMPLETION',
  'PLAN_MAP_DIAGRAM_LABELING',
  'FORM_COMPLETION',
  'SHORT_ANSWER',
  'UNCLASSIFIED_GAP_FILL',
  'WRITING_TASK_1_ACADEMIC',
  'WRITING_TASK_1_GENERAL',
  'WRITING_TASK_2_ESSAY',
  'SPEAKING_PART_1_INTERVIEW',
  'SPEAKING_PART_2_LONG_TURN',
  'SPEAKING_PART_3_DISCUSSION',
]);

export const ResponseKindSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'SHORT_TEXT',
  'LONG_TEXT',
  'DRAG_DROP',
  'AUDIO_RECORDING',
  'NONE',
]);

export const ScoringStrategySchema = z.enum([
  'PER_ITEM_EXACT',
  'UNORDERED_EXACT_SET',
  'RUBRIC',
  'NOT_SCORED',
]);

export const AnswerKeySourceSchema = z.enum([
  'OFFICIAL_KEY',
  'SOURCE_RESPONSE_DECLARATION',
  'HUMAN_VERIFIED',
  'INFERRED',
]);

const SourceArtifactSchema = z.object({
  kind: ArtifactKindSchema,
  filename: z.string().min(1),
  originalPath: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  byteSize: z.number().int().nonnegative().optional(),
  checksum: z.string().min(16),
  capturedAt: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ContentSourceSchema = z.object({
  provider: SourceProviderSchema,
  externalId: z.string().min(1).optional(),
  name: z.string().min(1),
  sourceUrl: z.url().optional(),
  sourceYear: z.number().int().min(1989).max(2100).optional(),
  rightsReference: z.string().min(1).optional(),
  notes: z.string().optional(),
  artifacts: z.array(SourceArtifactSchema).min(1),
}).superRefine((source, context) => {
  const checksums = source.artifacts.map((artifact) => artifact.checksum);
  if (new Set(checksums).size !== checksums.length) {
    context.addIssue({
      code: 'custom',
      message: 'Artifact checksums must be unique within a source',
      path: ['artifacts'],
    });
  }
});

const StimulusSchema = z.object({
  sourceKey: z.string().min(1),
  type: StimulusTypeSchema,
  displayOrder: z.number().int().nonnegative(),
  title: z.string().optional(),
  bodyHtml: z.string().optional(),
  plainText: z.string().optional(),
  transcript: z.string().optional(),
  assetChecksum: z.string().min(16).optional(),
  audioStartMs: z.number().int().nonnegative().optional(),
  audioEndMs: z.number().int().positive().optional(),
  isVisibleToLearner: z.boolean().default(true),
  reviewStatus: ReviewStatusSchema,
}).superRefine((stimulus, context) => {
  if (
    stimulus.audioStartMs !== undefined
    && stimulus.audioEndMs !== undefined
    && stimulus.audioEndMs <= stimulus.audioStartMs
  ) {
    context.addIssue({
      code: 'custom',
      message: 'audioEndMs must be greater than audioStartMs',
      path: ['audioEndMs'],
    });
  }

  if (
    stimulus.type === 'READING_PASSAGE'
    && !stimulus.bodyHtml
    && !stimulus.plainText
  ) {
    context.addIssue({
      code: 'custom',
      message: 'A reading passage requires bodyHtml or plainText',
      path: ['bodyHtml'],
    });
  }

  if (stimulus.type === 'AUDIO_TRACK' && !stimulus.assetChecksum) {
    context.addIssue({
      code: 'custom',
      message: 'An audio track requires an asset checksum',
      path: ['assetChecksum'],
    });
  }
});

const ChoiceOptionSchema = z.object({
  label: z.string().min(1),
  text: z.string(),
});

const QuestionSchema = z.object({
  stableKey: z.string().min(1),
  sourceNumber: z.number().int().positive().optional(),
  displayOrder: z.number().int().nonnegative(),
  promptHtml: z.string().optional(),
  responseKindOverride: ResponseKindSchema.optional(),
  maxMarks: z.number().int().nonnegative().default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const NormalizationSchema = z.object({
  trimOuterWhitespace: z.boolean().default(true),
  // Note: For objective IELTS L/R scoring, internal whitespace collapsing is an engine invariant.
  // This field is retained for schema compatibility with existing content JSON.
  collapseInternalWhitespace: z.boolean().optional(),
  caseSensitive: z.boolean().default(false),
  unicodeForm: z.enum(['NFC', 'NFD', 'NFKC', 'NFKD']).default('NFC'),
  punctuationSensitive: z.boolean().default(true),
}).strict();

const PerItemKeyPayloadSchema = z.object({
  strategy: z.literal('PER_ITEM_EXACT'),
  answersByStableKey: z.record(
    z.string(),
    z.array(z.string()).min(1),
  ),
});

const UnorderedSetKeyPayloadSchema = z.object({
  strategy: z.literal('UNORDERED_EXACT_SET'),
  acceptedSets: z.array(z.array(z.string()).min(1)).min(1),
});

const AnswerKeySchema = z.object({
  sourceType: AnswerKeySourceSchema,
  sourceArtifactChecksum: z.string().min(16).optional(),
  sourceLocator: z.string().optional(),
  reviewStatus: ReviewStatusSchema,
  normalization: NormalizationSchema,
  payload: z.discriminatedUnion('strategy', [
    PerItemKeyPayloadSchema,
    UnorderedSetKeyPayloadSchema,
  ]),
});

const completionTypes = new Set<z.infer<typeof QuestionTypeSchema>>([
  'SENTENCE_COMPLETION',
  'SUMMARY_COMPLETION',
  'NOTE_COMPLETION',
  'TABLE_COMPLETION',
  'FLOWCHART_COMPLETION',
  'DIAGRAM_LABEL_COMPLETION',
  'FORM_COMPLETION',
  'SHORT_ANSWER',
]);

const writingTypes = new Set<z.infer<typeof QuestionTypeSchema>>([
  'WRITING_TASK_1_ACADEMIC',
  'WRITING_TASK_1_GENERAL',
  'WRITING_TASK_2_ESSAY',
]);

const speakingTypes = new Set<z.infer<typeof QuestionTypeSchema>>([
  'SPEAKING_PART_1_INTERVIEW',
  'SPEAKING_PART_2_LONG_TURN',
  'SPEAKING_PART_3_DISCUSSION',
]);

// =============================================================================
// CONTENT-SIDE WORD/NUMBER INSTRUCTION CONTRACT VALIDATION
// Used for import/review/publishing validation of content packages.
// =============================================================================

export type InstructionContractResult =
  | { valid: true; maxWords: number; allowNumbers: boolean }
  | { valid: false; reason: 'UNRECOGNIZED_INSTRUCTION_FORM' | 'INSTRUCTION_METADATA_MISMATCH' };

export function parseAnswerInstructionSemantics(
  rawInstruction: string,
): { maxWords: number; allowNumbers: boolean } | null {
  const norm = rawInstruction.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!norm) return null;

  if (/(?:WRITE\s+)?(?:NO\s+MORE\s+THAN\s+)?ONE\s+WORD\s+ONLY/i.test(norm)) {
    return { maxWords: 1, allowNumbers: false };
  }

  // AND/OR A NUMBER variants
  if (/(?:WRITE\s+)?(?:NO\s+MORE\s+THAN\s+)?ONE\s+WORD\s+(?:AND\s*\/\s*OR|AND\s+OR)\s+A\s+NUMBER/i.test(norm)) {
    return { maxWords: 1, allowNumbers: true };
  }
  if (/(?:WRITE\s+)?NO\s+MORE\s+THAN\s+TWO\s+WORDS\s+(?:AND\s*\/\s*OR|AND\s+OR)\s+A\s+NUMBER/i.test(norm)) {
    return { maxWords: 2, allowNumbers: true };
  }
  if (/(?:WRITE\s+)?NO\s+MORE\s+THAN\s+THREE\s+WORDS\s+(?:AND\s*\/\s*OR|AND\s+OR)\s+A\s+NUMBER/i.test(norm)) {
    return { maxWords: 3, allowNumbers: true };
  }

  // Word-only limits without numbers
  if (/(?:WRITE\s+)?NO\s+MORE\s+THAN\s+ONE\s+WORD(?!\s+(?:AND|OR))/i.test(norm)) {
    return { maxWords: 1, allowNumbers: false };
  }
  if (/(?:WRITE\s+)?NO\s+MORE\s+THAN\s+TWO\s+WORDS(?!\s+(?:AND|OR))/i.test(norm)) {
    return { maxWords: 2, allowNumbers: false };
  }
  if (/(?:WRITE\s+)?NO\s+MORE\s+THAN\s+THREE\s+WORDS(?!\s+(?:AND|OR))/i.test(norm)) {
    return { maxWords: 3, allowNumbers: false };
  }

  return null;
}

export function validateAnswerInstructionContract(input: {
  rawInstruction?: string | null;
  maxWords?: number | null;
  allowNumbers?: boolean | null;
}): InstructionContractResult {
  if (!input.rawInstruction || !input.rawInstruction.trim()) {
    return { valid: true, maxWords: input.maxWords ?? 0, allowNumbers: input.allowNumbers ?? false };
  }

  const parsed = parseAnswerInstructionSemantics(input.rawInstruction);
  if (!parsed) {
    return { valid: false, reason: 'UNRECOGNIZED_INSTRUCTION_FORM' };
  }

  if (
    input.maxWords !== undefined
    && input.maxWords !== null
    && input.maxWords !== parsed.maxWords
  ) {
    return { valid: false, reason: 'INSTRUCTION_METADATA_MISMATCH' };
  }

  if (
    input.allowNumbers !== undefined
    && input.allowNumbers !== null
    && input.allowNumbers !== parsed.allowNumbers
  ) {
    return { valid: false, reason: 'INSTRUCTION_METADATA_MISMATCH' };
  }

  return { valid: true, maxWords: parsed.maxWords, allowNumbers: parsed.allowNumbers };
}

export const QuestionGroupSchema = z.object({
  sourceKey: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
  questionType: QuestionTypeSchema,
  responseKind: ResponseKindSchema,
  scoringStrategy: ScoringStrategySchema,
  sourceNumberStart: z.number().int().positive().optional(),
  sourceNumberEnd: z.number().int().positive().optional(),
  instructionsHtml: z.string().optional(),
  promptHtml: z.string().optional(),
  options: z.array(ChoiceOptionSchema).optional(),
  maxMarks: z.number().int().nonnegative(),
  minWordCount: z.number().int().nonnegative().optional(),
  maxWords: z.number().int().nonnegative().optional(),
  allowNumbers: z.boolean().optional(),
  rawAnswerInstruction: z.string().optional(),
  independent: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  dependencyKey: z.string().min(1).optional(),
  reviewStatus: ReviewStatusSchema,
  questions: z.array(QuestionSchema).min(1),
  answerKey: AnswerKeySchema.optional(),
}).superRefine((group, context) => {
  const keys = group.questions.map((question) => question.stableKey);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: 'custom',
      message: 'Question stable keys must be unique within a question group',
      path: ['questions'],
    });
  }

  const orders = group.questions.map((question) => question.displayOrder);
  if (new Set(orders).size !== orders.length) {
    context.addIssue({
      code: 'custom',
      message: 'Question display orders must be unique within a question group',
      path: ['questions'],
    });
  }

  const itemMarks = group.questions.reduce((sum, question) => sum + question.maxMarks, 0);
  if (group.scoringStrategy !== 'RUBRIC' && itemMarks !== group.maxMarks) {
    context.addIssue({
      code: 'custom',
      message: 'maxMarks must equal the sum of question marks',
      path: ['maxMarks'],
    });
  }

  if (group.scoringStrategy !== 'RUBRIC' && group.scoringStrategy !== 'NOT_SCORED' && group.maxMarks > 0) {
    for (let i = 0; i < group.questions.length; i++) {
      const q = group.questions[i];
      if (q.maxMarks > 0 && (q.sourceNumber === undefined || q.sourceNumber === null)) {
        context.addIssue({
          code: 'custom',
          message: `Objective question '${q.stableKey}' participating in scoring must have a valid sourceNumber`,
          path: ['questions', i, 'sourceNumber'],
        });
      }
    }
  }

  if (group.scoringStrategy === 'RUBRIC' && (group.maxMarks !== 0 || itemMarks !== 0)) {
    context.addIssue({
      code: 'custom',
      message: 'Rubric-scored groups use bands, so raw maxMarks must be zero',
      path: ['maxMarks'],
    });
  }

  if (
    group.reviewStatus === 'VERIFIED'
    && completionTypes.has(group.questionType)
    && group.rawAnswerInstruction
  ) {
    const contract = validateAnswerInstructionContract({
      rawInstruction: group.rawAnswerInstruction,
      maxWords: group.maxWords,
      allowNumbers: group.allowNumbers,
    });
    if (!contract.valid) {
      context.addIssue({
        code: 'custom',
        message: `Instruction contract failure (${contract.reason}): raw '${group.rawAnswerInstruction}' does not match maxWords=${group.maxWords}, allowNumbers=${group.allowNumbers}`,
        path: ['rawAnswerInstruction'],
      });
    }
  }

  const optionLabels = group.options?.map((option) => option.label) ?? [];
  if (new Set(optionLabels).size !== optionLabels.length) {
    context.addIssue({
      code: 'custom',
      message: 'Option labels must be unique within a question group',
      path: ['options'],
    });
  }

  if (
    ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(group.responseKind)
    && optionLabels.length < 2
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Choice questions require at least two options',
      path: ['options'],
    });
  }

  if (group.shuffleOptions && optionLabels.length < 2) {
    context.addIssue({
      code: 'custom',
      message: 'Options cannot be shuffled when fewer than two exist',
      path: ['shuffleOptions'],
    });
  }

  if (
    group.sourceNumberEnd !== undefined
    && (
      group.sourceNumberStart === undefined
      || group.sourceNumberEnd < group.sourceNumberStart
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'sourceNumberEnd requires a start and cannot precede it',
      path: ['sourceNumberEnd'],
    });
  }

  if (
    group.sourceNumberStart !== undefined
    && group.sourceNumberEnd !== undefined
    && group.sourceNumberEnd - group.sourceNumberStart + 1 !== group.questions.length
  ) {
    context.addIssue({
      code: 'custom',
      message: 'The source-number range must contain exactly one number per question',
      path: ['sourceNumberEnd'],
    });
  }

  if (
    group.reviewStatus === 'VERIFIED'
    && group.questionType === 'UNCLASSIFIED_GAP_FILL'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'An unclassified gap-fill group cannot be VERIFIED',
      path: ['questionType'],
    });
  }

  if (
    completionTypes.has(group.questionType)
    && group.responseKind === 'SHORT_TEXT'
    && group.reviewStatus === 'VERIFIED'
    && (group.maxWords === undefined || !group.rawAnswerInstruction)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Verified completion work requires parsed and raw word-limit instructions',
      path: ['maxWords'],
    });
  }

  if (writingTypes.has(group.questionType) && group.minWordCount === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Writing tasks require a minimum word count',
      path: ['minWordCount'],
    });
  }

  const requiredWritingMinimum = group.questionType === 'WRITING_TASK_2_ESSAY' ? 250 : 150;
  if (
    writingTypes.has(group.questionType)
    && group.minWordCount !== requiredWritingMinimum
  ) {
    context.addIssue({
      code: 'custom',
      message: `${group.questionType} requires a ${requiredWritingMinimum}-word minimum`,
      path: ['minWordCount'],
    });
  }

  const isProductive = writingTypes.has(group.questionType) || speakingTypes.has(group.questionType);
  if (isProductive && group.scoringStrategy !== 'RUBRIC') {
    context.addIssue({
      code: 'custom',
      message: 'Writing and Speaking activities must use rubric scoring',
      path: ['scoringStrategy'],
    });
  }

  if (group.scoringStrategy === 'RUBRIC' && group.answerKey) {
    context.addIssue({
      code: 'custom',
      message: 'Rubric-scored work must not contain an objective answer key',
      path: ['answerKey'],
    });
  }

  if (
    group.scoringStrategy === 'PER_ITEM_EXACT'
    && group.answerKey?.payload.strategy !== 'PER_ITEM_EXACT'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'PER_ITEM_EXACT requires a matching per-item key payload',
      path: ['answerKey'],
    });
  }

  if (
    group.scoringStrategy === 'UNORDERED_EXACT_SET'
    && group.answerKey?.payload.strategy !== 'UNORDERED_EXACT_SET'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'UNORDERED_EXACT_SET requires a matching unordered-set key payload',
      path: ['answerKey'],
    });
  }

  if (
    group.answerKey?.reviewStatus === 'VERIFIED'
    && group.answerKey.sourceType === 'INFERRED'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'An inferred answer key cannot be VERIFIED without changing its source type',
      path: ['answerKey', 'sourceType'],
    });
  }

  if (group.answerKey?.payload.strategy === 'PER_ITEM_EXACT') {
    const answerKeys = Object.keys(group.answerKey.payload.answersByStableKey);
    const expected = [...keys].sort();
    const actual = [...answerKeys].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      context.addIssue({
        code: 'custom',
        message: 'A per-item answer key must contain exactly one entry for every question stable key',
        path: ['answerKey', 'payload', 'answersByStableKey'],
      });
    }
  }

  if (
    group.answerKey?.payload.strategy === 'UNORDERED_EXACT_SET'
    && group.answerKey.payload.acceptedSets.some((set) => set.length !== group.questions.length)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Every accepted unordered set must contain one answer per question',
      path: ['answerKey', 'payload', 'acceptedSets'],
    });
  }
});

const slotSkill: Record<z.infer<typeof PartSlotSchema>, z.infer<typeof SkillSchema>> = {
  LISTENING_PART_1: 'LISTENING',
  LISTENING_PART_2: 'LISTENING',
  LISTENING_PART_3: 'LISTENING',
  LISTENING_PART_4: 'LISTENING',
  READING_SECTION_1: 'READING',
  READING_SECTION_2: 'READING',
  READING_SECTION_3: 'READING',
  WRITING_TASK_1: 'WRITING',
  WRITING_TASK_2: 'WRITING',
  SPEAKING_PART_1: 'SPEAKING',
  SPEAKING_PART_2: 'SPEAKING',
  SPEAKING_PART_3: 'SPEAKING',
};

const TestPartSchema = z.object({
  sourceKey: z.string().min(1),
  slot: PartSlotSchema,
  selectionGroupKey: z.string().min(1).optional(),
  title: z.string().optional(),
  instructionsHtml: z.string().optional(),
  recommendedTimeSeconds: z.number().int().positive().optional(),
  preparationTimeSeconds: z.number().int().positive().optional(),
  responseTimeSeconds: z.number().int().positive().optional(),
  difficultyBand: z.number().min(0).max(9).multipleOf(0.5).optional(),
  sourceLocator: z.string().optional(),
  extractionMetadata: z.record(z.string(), z.unknown()).optional(),
  reviewStatus: ReviewStatusSchema,
  shuffleQuestionGroups: z.boolean().default(false),
  stimuli: z.array(StimulusSchema),
  questionGroups: z.array(QuestionGroupSchema).min(1),
}).superRefine((part, context) => {
  const stimulusKeys = part.stimuli.map((stimulus) => stimulus.sourceKey);
  const stimulusOrders = part.stimuli.map((stimulus) => stimulus.displayOrder);
  if (new Set(stimulusKeys).size !== stimulusKeys.length) {
    context.addIssue({
      code: 'custom',
      message: 'Stimulus source keys must be unique within a test part',
      path: ['stimuli'],
    });
  }
  if (new Set(stimulusOrders).size !== stimulusOrders.length) {
    context.addIssue({
      code: 'custom',
      message: 'Stimulus display orders must be unique within a test part',
      path: ['stimuli'],
    });
  }

  const groupKeys = part.questionGroups.map((group) => group.sourceKey);
  const groupOrders = part.questionGroups.map((group) => group.displayOrder);
  if (new Set(groupKeys).size !== groupKeys.length) {
    context.addIssue({
      code: 'custom',
      message: 'Question-group source keys must be unique within a test part',
      path: ['questionGroups'],
    });
  }
  if (new Set(groupOrders).size !== groupOrders.length) {
    context.addIssue({
      code: 'custom',
      message: 'Question-group display orders must be unique within a test part',
      path: ['questionGroups'],
    });
  }

  const requiredStimulus = part.slot.startsWith('LISTENING_')
    ? 'AUDIO_TRACK'
    : part.slot.startsWith('READING_')
      ? 'READING_PASSAGE'
      : part.slot.startsWith('WRITING_')
        ? 'WRITING_PROMPT'
        : 'SPEAKING_PROMPT';
  if (
    part.reviewStatus === 'VERIFIED'
    && !part.stimuli.some((stimulus) => stimulus.type === requiredStimulus)
  ) {
    context.addIssue({
      code: 'custom',
      message: `A verified ${part.slot} requires a ${requiredStimulus} stimulus`,
      path: ['stimuli'],
    });
  }

  if (
    part.slot === 'SPEAKING_PART_2'
    && part.reviewStatus === 'VERIFIED'
    && (
      part.preparationTimeSeconds !== 60
      || part.responseTimeSeconds !== 120
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Verified Speaking Part 2 requires 60 seconds preparation and a 120-second response limit',
      path: ['preparationTimeSeconds'],
    });
  }

  if (
    part.slot === 'WRITING_TASK_1'
    && part.questionGroups.some((group) => (
      group.questionType !== 'WRITING_TASK_1_ACADEMIC'
      && group.questionType !== 'WRITING_TASK_1_GENERAL'
    ))
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Writing Task 1 requires an Academic or General Training Task 1 question type',
      path: ['questionGroups'],
    });
  }

  if (
    part.slot === 'WRITING_TASK_2'
    && part.questionGroups.some((group) => group.questionType !== 'WRITING_TASK_2_ESSAY')
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Writing Task 2 must use WRITING_TASK_2_ESSAY',
      path: ['questionGroups'],
    });
  }
});

const TestSectionSchema = z.object({
  skill: SkillSchema,
  displayOrder: z.number().int().nonnegative(),
  timeLimitSeconds: z.number().int().positive().optional(),
  parts: z.array(TestPartSchema).min(1),
}).superRefine((section, context) => {
  const partKeys = section.parts.map((part) => part.sourceKey);
  if (new Set(partKeys).size !== partKeys.length) {
    context.addIssue({
      code: 'custom',
      message: 'Part source keys must be unique within a test section',
      path: ['parts'],
    });
  }

  const slots = section.parts.map((part) => part.slot);
  if (new Set(slots).size !== slots.length) {
    context.addIssue({
      code: 'custom',
      message: 'Part slots must be unique within a test section',
      path: ['parts'],
    });
  }

  section.parts.forEach((part, index) => {
    if (slotSkill[part.slot] !== section.skill) {
      context.addIssue({
        code: 'custom',
        message: `${part.slot} is not compatible with ${section.skill}`,
        path: ['parts', index, 'slot'],
      });
    }
  });

  const numberedQuestions = section.parts.flatMap((part) => (
    part.questionGroups.flatMap((group) => (
      group.questions
        .filter((question) => question.sourceNumber !== undefined)
        .map((question) => question.sourceNumber)
    ))
  ));
  if (new Set(numberedQuestions).size !== numberedQuestions.length) {
    context.addIssue({
      code: 'custom',
      message: 'Question numbers must be unique within an IELTS test section',
      path: ['parts'],
    });
  }

  const speakingPart2 = section.parts.find((part) => part.slot === 'SPEAKING_PART_2');
  const speakingPart3 = section.parts.find((part) => part.slot === 'SPEAKING_PART_3');
  if (
    speakingPart2
    && speakingPart3
    && (
      !speakingPart2.selectionGroupKey
      || speakingPart2.selectionGroupKey !== speakingPart3.selectionGroupKey
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Speaking Parts 2 and 3 must share one selectionGroupKey',
      path: ['parts'],
    });
  }
});

export const StagedTestPackageSchema = z.object({
  schemaVersion: z.literal(2),
  source: ContentSourceSchema,
  test: z.object({
    externalId: z.string().min(1).optional(),
    title: z.string().min(1),
    variant: TestVariantSchema,
    sourceYear: z.number().int().min(1989).max(2100).optional(),
    version: z.number().int().positive(),
    notes: z.string().optional(),
    sections: z.array(TestSectionSchema).min(1),
  }),
}).superRefine((data, context) => {
  if (data.test.variant === 'UNIVERSAL') {
    context.addIssue({
      code: 'custom',
      message: 'A complete IELTS test must be Academic or General Training, not UNIVERSAL',
      path: ['test', 'variant'],
    });
  }

  const skills = data.test.sections.map((section) => section.skill);
  if (new Set(skills).size !== skills.length) {
    context.addIssue({
      code: 'custom',
      message: 'A test version can contain only one section per skill',
      path: ['test', 'sections'],
    });
  }

  const sectionOrders = data.test.sections.map((section) => section.displayOrder);
  if (new Set(sectionOrders).size !== sectionOrders.length) {
    context.addIssue({
      code: 'custom',
      message: 'Section display orders must be unique',
      path: ['test', 'sections'],
    });
  }

  const writing = data.test.sections.find((section) => section.skill === 'WRITING');
  const task1 = writing?.parts.find((part) => part.slot === 'WRITING_TASK_1');
  const expectedTask1Type = data.test.variant === 'ACADEMIC'
    ? 'WRITING_TASK_1_ACADEMIC'
    : 'WRITING_TASK_1_GENERAL';
  if (
    task1
    && task1.questionGroups.some((group) => group.questionType !== expectedTask1Type)
  ) {
    context.addIssue({
      code: 'custom',
      message: `${data.test.variant} Writing Task 1 requires ${expectedTask1Type}`,
      path: ['test', 'sections'],
    });
  }
});

export type StagedTestPackage = z.infer<typeof StagedTestPackageSchema>;

export function parseStagedTestPackage(input: unknown): StagedTestPackage {
  return StagedTestPackageSchema.parse(input);
}

// =============================================================================
// FULL IELTS MOCK CERTIFICATION VALIDATOR
// Helper function to validate that a section represents a complete 40-question mock.
// (To be wired into the publication workflow gate in Batch 2).
// =============================================================================

export type FullMockValidationResult = {
  valid: boolean;
  errors: string[];
  totalQuestions: number;
  maxMarks: number;
};

export function validateFullIeltsMockSection(section: {
  skill: 'LISTENING' | 'READING';
  parts: Array<{
    slot: string;
    stimuli?: Array<{ type: string; reviewStatus?: string }>;
    questionGroups: Array<{
      scoringStrategy?: string;
      maxMarks: number;
      reviewStatus: string;
      answerKey?: { reviewStatus: string; formatVersion: number } | null;
      questions: Array<{ sourceNumber: number | null | undefined; maxMarks: number }>;
    }>;
  }>;
}): FullMockValidationResult {
  const errors: string[] = [];
  const expectedSlots = section.skill === 'LISTENING'
    ? ['LISTENING_PART_1', 'LISTENING_PART_2', 'LISTENING_PART_3', 'LISTENING_PART_4']
    : ['READING_SECTION_1', 'READING_SECTION_2', 'READING_SECTION_3'];

  const slots = section.parts.map((p) => p.slot);

  // Exact slot match: no missing, no duplicate, no extra
  for (const expected of expectedSlots) {
    const count = slots.filter((s) => s === expected).length;
    if (count === 0) {
      errors.push(`Missing expected part/section slot: ${expected}`);
    } else if (count > 1) {
      errors.push(`Duplicate part/section slot: ${expected}`);
    }
  }
  for (const actual of slots) {
    if (!expectedSlots.includes(actual)) {
      errors.push(`Unexpected part/section slot for ${section.skill}: ${actual}`);
    }
  }

  let totalQuestions = 0;
  let totalMaxMarks = 0;
  const sourceNumbers: number[] = [];

  for (const part of section.parts) {
    // Stimulus presence verification if stimulus array provided
    if (part.stimuli && part.stimuli.length > 0) {
      const expectedStimulusType = section.skill === 'LISTENING' ? 'AUDIO_TRACK' : 'READING_PASSAGE';
      const hasExpectedStimulus = part.stimuli.some((s) => s.type === expectedStimulusType);
      if (!hasExpectedStimulus) {
        errors.push(`Slot ${part.slot} missing required ${expectedStimulusType} stimulus`);
      }
    }

    for (const group of part.questionGroups) {
      if (group.scoringStrategy && !['PER_ITEM_EXACT', 'UNORDERED_EXACT_SET'].includes(group.scoringStrategy)) {
        errors.push(`QuestionGroup in slot ${part.slot} has unsupported scoring strategy: ${group.scoringStrategy}`);
      }

      if (group.reviewStatus !== 'VERIFIED') {
        errors.push(`QuestionGroup in slot ${part.slot} is not VERIFIED`);
      }
      if (!group.answerKey || group.answerKey.reviewStatus !== 'VERIFIED') {
        errors.push(`AnswerKey in slot ${part.slot} is missing or not VERIFIED`);
      }
      if (group.answerKey && group.answerKey.formatVersion !== 1) {
        errors.push(`AnswerKey in slot ${part.slot} has unsupported formatVersion: ${group.answerKey.formatVersion}`);
      }

      const groupItemSum = group.questions.reduce((sum, q) => sum + q.maxMarks, 0);
      if (group.maxMarks !== groupItemSum) {
        errors.push(`QuestionGroup in slot ${part.slot} maxMarks (${group.maxMarks}) does not equal question sum (${groupItemSum})`);
      }

      for (const q of group.questions) {
        totalQuestions += 1;
        totalMaxMarks += q.maxMarks;
        if (q.sourceNumber === null || q.sourceNumber === undefined) {
          errors.push(`Question in slot ${part.slot} has null sourceNumber`);
        } else {
          sourceNumbers.push(q.sourceNumber);
        }
        if (q.maxMarks !== 1) {
          errors.push(`Question ${q.sourceNumber ?? 'unknown'} has maxMarks ${q.maxMarks} (expected 1 for standard IELTS item)`);
        }
      }
    }
  }

  if (totalQuestions !== 40) {
    errors.push(`Expected exactly 40 questions, got ${totalQuestions}`);
  }
  if (totalMaxMarks !== 40) {
    errors.push(`Expected total maximum marks 40, got ${totalMaxMarks}`);
  }

  const uniqueNumbers = new Set(sourceNumbers);
  if (uniqueNumbers.size !== 40) {
    errors.push(`Expected 40 unique question numbers, got ${uniqueNumbers.size}`);
  }
  for (let i = 1; i <= 40; i++) {
    if (!uniqueNumbers.has(i)) {
      errors.push(`Missing question number Q${i}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalQuestions,
    maxMarks: totalMaxMarks,
  };
}
