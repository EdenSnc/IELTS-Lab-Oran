import type { StagedTestPackage } from './staging-schema';

export type CertificationIssue = {
  code: string;
  location: string;
};

export function certifyCompleteMockPackage(staged: StagedTestPackage) {
  const issues: CertificationIssue[] = [];
  const bySkill = new Map(staged.test.sections.map((section) => [section.skill, section]));

  for (const skill of ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const) {
    if (!bySkill.has(skill)) issues.push({ code: 'SECTION_MISSING', location: skill });
  }

  const listening = bySkill.get('LISTENING');
  const reading = bySkill.get('READING');
  const writing = bySkill.get('WRITING');
  const speaking = bySkill.get('SPEAKING');
  if (listening?.parts.length !== 4) {
    issues.push({ code: 'LISTENING_PART_COUNT', location: 'LISTENING' });
  }
  if (reading?.parts.length !== 3) {
    issues.push({ code: 'READING_PART_COUNT', location: 'READING' });
  }
  if (writing?.parts.length !== 2) {
    issues.push({ code: 'WRITING_TASK_COUNT', location: 'WRITING' });
  }
  if (speaking?.parts.length !== 3) {
    issues.push({ code: 'SPEAKING_PART_COUNT', location: 'SPEAKING' });
  }

  for (const section of staged.test.sections) {
    const questions = section.parts.flatMap((part) => (
      part.questionGroups.flatMap((group) => group.questions)
    ));
    if (
      (section.skill === 'LISTENING' || section.skill === 'READING')
      && (
        questions.length !== 40
        || questions.some((question) => question.maxMarks !== 1)
        || questions.reduce((sum, question) => sum + question.maxMarks, 0) !== 40
      )
    ) {
      issues.push({ code: 'OBJECTIVE_SECTION_NOT_40_MARKS', location: section.skill });
    }

    for (const part of section.parts) {
      if (part.reviewStatus !== 'VERIFIED') {
        issues.push({ code: 'PART_UNVERIFIED', location: `${section.skill}/${part.sourceKey}` });
      }
      for (const stimulus of part.stimuli) {
        if (stimulus.reviewStatus !== 'VERIFIED') {
          issues.push({ code: 'STIMULUS_UNVERIFIED', location: `${section.skill}/${stimulus.sourceKey}` });
        }
      }
      for (const group of part.questionGroups) {
        const location = `${section.skill}/${part.sourceKey}/${group.sourceKey}`;
        if (group.reviewStatus !== 'VERIFIED') {
          issues.push({ code: 'GROUP_UNVERIFIED', location });
        }
        if (
          (section.skill === 'LISTENING' || section.skill === 'READING')
          && group.answerKey?.reviewStatus !== 'VERIFIED'
        ) {
          issues.push({ code: 'ANSWER_KEY_UNVERIFIED', location });
        }
      }
    }
  }

  if (issues.length) {
    throw new Error(`CONTENT_CERTIFICATION_FAILED:${JSON.stringify(issues)}`);
  }
  return { certified: true as const, questionCount: 80 };
}
