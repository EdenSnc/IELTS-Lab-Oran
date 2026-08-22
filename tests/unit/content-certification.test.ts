import assert from 'node:assert/strict';
import test from 'node:test';
import { certifyCompleteMockPackage } from '../../src/lib/content/content-certification';
import { parseStagedTestPackage, type StagedTestPackage } from '../../src/lib/content/staging-schema';

const checksum = (index: number) => index.toString(16).padStart(64, '0');

function objectiveGroup(skill: 'LISTENING' | 'READING', part: number, start: number, count: number) {
  const questions = Array.from({ length: count }, (_, offset) => ({
    stableKey: `${skill}-${start + offset}`,
    sourceNumber: start + offset,
    displayOrder: offset,
    maxMarks: 1,
  }));
  return {
    sourceKey: `${skill}-group-${part}`,
    displayOrder: 0,
    questionType: 'MULTIPLE_CHOICE' as const,
    responseKind: 'SINGLE_CHOICE' as const,
    scoringStrategy: 'PER_ITEM_EXACT' as const,
    options: [{ label: 'A', text: 'A' }, { label: 'B', text: 'B' }],
    maxMarks: count,
    reviewStatus: 'VERIFIED' as const,
    questions,
    answerKey: {
      formatVersion: 1 as const,
      sourceType: 'HUMAN_VERIFIED' as const,
      reviewStatus: 'VERIFIED' as const,
      normalization: {},
      payload: {
        strategy: 'PER_ITEM_EXACT' as const,
        answersByStableKey: Object.fromEntries(questions.map((question) => [question.stableKey, ['A']])),
      },
    },
  };
}

function productiveGroup(skill: 'WRITING' | 'SPEAKING', part: number, variant: 'ACADEMIC' | 'GENERAL_TRAINING') {
  const writing = skill === 'WRITING';
  const questionType = writing
    ? part === 1 ? (variant === 'ACADEMIC' ? 'WRITING_TASK_1_ACADEMIC' : 'WRITING_TASK_1_GENERAL') : 'WRITING_TASK_2_ESSAY'
    : part === 1 ? 'SPEAKING_PART_1_INTERVIEW' : part === 2 ? 'SPEAKING_PART_2_LONG_TURN' : 'SPEAKING_PART_3_DISCUSSION';
  return {
    sourceKey: `${skill}-group-${part}`,
    displayOrder: 0,
    questionType,
    responseKind: writing ? 'LONG_TEXT' as const : 'AUDIO_RECORDING' as const,
    scoringStrategy: 'RUBRIC' as const,
    maxMarks: 0,
    ...(writing ? { minWordCount: part === 1 ? 150 : 250 } : {}),
    reviewStatus: 'VERIFIED' as const,
    questions: [{ stableKey: `${skill}-${part}`, displayOrder: 0, maxMarks: 0 }],
  };
}

function completePackage(variant: 'ACADEMIC' | 'GENERAL_TRAINING' = 'ACADEMIC') {
  let nextListening = 1;
  let nextReading = 1;
  const listeningParts = [1, 2, 3, 4].map((part) => {
    const group = objectiveGroup('LISTENING', part, nextListening, 10);
    nextListening += 10;
    return {
      sourceKey: `listening-${part}`,
      slot: `LISTENING_PART_${part}` as const,
      reviewStatus: 'VERIFIED' as const,
      stimuli: [{
        sourceKey: `audio-${part}`, type: 'AUDIO_TRACK' as const, displayOrder: 0,
        assetChecksum: checksum(part), reviewStatus: 'VERIFIED' as const,
      }],
      questionGroups: [group],
    };
  });
  const readingParts = [13, 13, 14].map((count, index) => {
    const part = index + 1;
    const group = objectiveGroup('READING', part, nextReading, count);
    nextReading += count;
    return {
      sourceKey: `reading-${part}`,
      slot: `READING_SECTION_${part}` as const,
      reviewStatus: 'VERIFIED' as const,
      stimuli: [{ sourceKey: `passage-${part}`, type: 'READING_PASSAGE' as const, displayOrder: 0, plainText: 'Verified passage.', reviewStatus: 'VERIFIED' as const }],
      questionGroups: [group],
    };
  });
  const writingParts = [1, 2].map((part) => ({
    sourceKey: `writing-${part}`,
    slot: `WRITING_TASK_${part}` as const,
    reviewStatus: 'VERIFIED' as const,
    stimuli: [{ sourceKey: `writing-prompt-${part}`, type: 'WRITING_PROMPT' as const, displayOrder: 0, plainText: 'Write.', reviewStatus: 'VERIFIED' as const }],
    questionGroups: [productiveGroup('WRITING', part, variant)],
  }));
  const speakingParts = [1, 2, 3].map((part) => ({
    sourceKey: `speaking-${part}`,
    slot: `SPEAKING_PART_${part}` as const,
    selectionGroupKey: part >= 2 ? 'topic-a' : undefined,
    ...(part === 2 ? { preparationTimeSeconds: 60, responseTimeSeconds: 120 } : {}),
    reviewStatus: 'VERIFIED' as const,
    stimuli: [{ sourceKey: `speaking-prompt-${part}`, type: 'SPEAKING_PROMPT' as const, displayOrder: 0, plainText: 'Speak.', reviewStatus: 'VERIFIED' as const }],
    questionGroups: [productiveGroup('SPEAKING', part, variant)],
  }));
  return parseStagedTestPackage({
    schemaVersion: 2,
    source: {
      provider: 'IELTS_LAB', name: 'Certification fixture',
      artifacts: [1, 2, 3, 4].map((index) => ({
        kind: 'AUDIO', filename: `audio-${index}.mp3`, checksum: checksum(index), reviewStatus: 'VERIFIED',
      })),
    },
    test: {
      title: 'Complete fixture', variant, version: 1,
      sections: [
        { skill: 'LISTENING', displayOrder: 0, timeLimitSeconds: 1800, parts: listeningParts },
        { skill: 'READING', displayOrder: 1, timeLimitSeconds: 3600, parts: readingParts },
        { skill: 'WRITING', displayOrder: 2, timeLimitSeconds: 3600, parts: writingParts },
        { skill: 'SPEAKING', displayOrder: 3, parts: speakingParts },
      ],
    },
  });
}

test('generic validation accepts reusable and partial content without certifying it as a full mock', () => {
  const full = completePackage();
  const listeningOnly = parseStagedTestPackage({ ...full, test: { ...full.test, variant: 'UNIVERSAL', sections: [full.test.sections[0]] } });
  const readingOnly = parseStagedTestPackage({ ...full, test: { ...full.test, sections: [full.test.sections[1]] } });
  const practice = parseStagedTestPackage({ ...full, test: { ...full.test, sections: [{ ...full.test.sections[1], parts: [full.test.sections[1].parts[0]] }] } });
  for (const partial of [listeningOnly, readingOnly, practice]) {
    assert.ok(partial.test.sections.length >= 1);
    assert.throws(() => certifyCompleteMockPackage(partial), /CONTENT_CERTIFICATION_FAILED/u);
  }
});

test('full Academic and GT certification enforces exact Q1..Q40 and verified provenance', () => {
  for (const variant of ['ACADEMIC', 'GENERAL_TRAINING'] as const) {
    assert.deepEqual(certifyCompleteMockPackage(completePackage(variant)), { certified: true, questionCount: 80 });
  }
  const invalid = structuredClone(completePackage()) as StagedTestPackage;
  invalid.test.sections[0].parts[0].questionGroups[0].questions[0].sourceNumber = 41;
  assert.throws(() => certifyCompleteMockPackage(invalid), /OBJECTIVE_QUESTION_NUMBERS_NOT_1_TO_40/u);
  const unverified = structuredClone(completePackage()) as StagedTestPackage;
  unverified.source.artifacts[0].reviewStatus = 'PENDING_REVIEW';
  assert.throws(() => certifyCompleteMockPackage(unverified), /ASSET_UNVERIFIED/u);
});
