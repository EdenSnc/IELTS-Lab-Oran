import type { DeliveryTest } from './delivery-types';

export function buildPublicReadingSample(test: DeliveryTest): DeliveryTest {
  const reading = test.sections.find((section) => section.skill === 'READING');
  const part = reading?.parts.find((candidate) => candidate.questionGroups.some((group) => group.questions.length > 0));
  const group = part?.questionGroups.find((candidate) => candidate.questions.length > 0);
  if (!reading || !part || !group) throw new Error('PUBLIC_READING_SAMPLE_UNAVAILABLE');
  const questions = group.questions.slice(0, 5);
  const sampleGroup = {
    ...group,
    questions,
    sourceNumberStart: questions[0]?.sourceNumber ?? null,
    sourceNumberEnd: questions.at(-1)?.sourceNumber ?? null,
    maxMarks: questions.reduce((total, question) => total + question.maxMarks, 0),
  };
  return {
    ...test,
    title: `${test.title} — Free Reading Sample`,
    sections: [{
      ...reading,
      timeLimitSeconds: 600,
      parts: [{ ...part, recommendedTimeSeconds: 600, questionGroups: [sampleGroup] }],
    }],
  };
}
