import type { StagedTestPackage } from './staging-schema';

export type CertificationIssue = { code: string; location: string };

const REQUIRED_SLOTS = {
  LISTENING: ['LISTENING_PART_1', 'LISTENING_PART_2', 'LISTENING_PART_3', 'LISTENING_PART_4'],
  READING: ['READING_SECTION_1', 'READING_SECTION_2', 'READING_SECTION_3'],
  WRITING: ['WRITING_TASK_1', 'WRITING_TASK_2'],
  SPEAKING: ['SPEAKING_PART_1', 'SPEAKING_PART_2', 'SPEAKING_PART_3'],
} as const;

function sameSet(actual: readonly string[], expected: readonly string[]) {
  const sortedExpected = [...expected].sort();
  return actual.length === expected.length
    && [...actual].sort().every((value, index) => value === sortedExpected[index]);
}

export function certifyCompleteMockPackage(staged: StagedTestPackage) {
  const issues: CertificationIssue[] = [];
  const bySkill = new Map(staged.test.sections.map((section) => [section.skill, section]));
  const artifacts = new Map(staged.source.artifacts.map((artifact) => [artifact.checksum, artifact]));

  if (staged.test.variant === 'UNIVERSAL') {
    issues.push({ code: 'FULL_MOCK_VARIANT_UNIVERSAL', location: 'test.variant' });
  }

  for (const skill of Object.keys(REQUIRED_SLOTS) as Array<keyof typeof REQUIRED_SLOTS>) {
    const section = bySkill.get(skill);
    if (!section) {
      issues.push({ code: 'SECTION_MISSING', location: skill });
      continue;
    }
    if (!sameSet(section.parts.map((part) => part.slot), REQUIRED_SLOTS[skill])) {
      issues.push({ code: `${skill}_SLOTS_INVALID`, location: skill });
    }

    const objective = skill === 'LISTENING' || skill === 'READING';
    const questions = section.parts.flatMap((part) => part.questionGroups.flatMap((group) => group.questions));
    if (objective) {
      const numbers = questions.map((question) => question.sourceNumber);
      const exactNumbers = numbers.length === 40
        && numbers.every((number) => Number.isInteger(number) && (number as number) > 0)
        && sameSet(numbers.map(String), Array.from({ length: 40 }, (_, index) => String(index + 1)));
      if (!exactNumbers) issues.push({ code: 'OBJECTIVE_QUESTION_NUMBERS_NOT_1_TO_40', location: skill });
      if (
        questions.some((question) => question.maxMarks !== 1)
        || questions.reduce((sum, question) => sum + question.maxMarks, 0) !== 40
      ) issues.push({ code: 'OBJECTIVE_SECTION_NOT_40_MARKS', location: skill });
    }

    for (const part of section.parts) {
      if (part.reviewStatus !== 'VERIFIED') {
        issues.push({ code: 'PART_UNVERIFIED', location: `${skill}/${part.sourceKey}` });
      }
      const requiredType = skill === 'LISTENING' ? 'AUDIO_TRACK'
        : skill === 'READING' ? 'READING_PASSAGE'
          : skill === 'WRITING' ? 'WRITING_PROMPT' : 'SPEAKING_PROMPT';
      if (!part.stimuli.some((stimulus) => stimulus.type === requiredType)) {
        issues.push({ code: 'REQUIRED_STIMULUS_MISSING', location: `${skill}/${part.sourceKey}` });
      }
      for (const stimulus of part.stimuli) {
        const location = `${skill}/${part.sourceKey}/${stimulus.sourceKey}`;
        if (stimulus.reviewStatus !== 'VERIFIED') issues.push({ code: 'STIMULUS_UNVERIFIED', location });
        if (stimulus.type === 'AUDIO_TRACK' && !stimulus.assetChecksum) {
          issues.push({ code: 'LISTENING_AUDIO_MISSING', location });
        }
        if (stimulus.assetChecksum) {
          const artifact = artifacts.get(stimulus.assetChecksum);
          if (!artifact) issues.push({ code: 'ASSET_MISSING', location });
          else if (artifact.reviewStatus !== 'VERIFIED') issues.push({ code: 'ASSET_UNVERIFIED', location });
        }
      }
      for (const group of part.questionGroups) {
        const location = `${skill}/${part.sourceKey}/${group.sourceKey}`;
        if (group.reviewStatus !== 'VERIFIED') issues.push({ code: 'GROUP_UNVERIFIED', location });
        if (group.maxMarks !== group.questions.reduce((sum, question) => sum + question.maxMarks, 0)) {
          issues.push({ code: 'GROUP_MARKS_INVALID', location });
        }
        if (objective) {
          if (group.answerKey?.reviewStatus !== 'VERIFIED') {
            issues.push({ code: 'ANSWER_KEY_UNVERIFIED', location });
          } else if (group.answerKey.formatVersion !== 1) {
            issues.push({ code: 'UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION', location });
          }
        }
        for (const link of group.assetLinks) {
          const artifact = artifacts.get(link.assetChecksum);
          const assetLocation = `${location}/${link.role}`;
          if (!artifact) issues.push({ code: 'ASSET_MISSING', location: assetLocation });
          else if (artifact.reviewStatus !== 'VERIFIED') {
            issues.push({ code: 'ASSET_UNVERIFIED', location: assetLocation });
          }
        }
      }
    }
  }

  if (issues.length) throw new Error(`CONTENT_CERTIFICATION_FAILED:${JSON.stringify(issues)}`);
  return { certified: true as const, questionCount: 80 };
}
