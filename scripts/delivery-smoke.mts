import assert from 'node:assert/strict';
import 'dotenv/config';
import { loadDeliveryTest } from '../src/lib/content/load-delivery-test-core.ts';
import type {
  DeliveryPart,
  DeliveryQuestion,
  DeliveryQuestionGroup,
  DeliverySection,
} from '../src/lib/content/delivery-types.ts';

async function main() {
  const test = await loadDeliveryTest('test-1');
  assert(test, 'Latest imported delivery test was not found');
  assert.equal(test.version, 5);

  for (const [skill, expectedMarks] of [['LISTENING', 40], ['READING', 40]] as const) {
    const section: DeliverySection | undefined = test.sections.find(
      (candidate: DeliverySection) => candidate.skill === skill,
    );
    assert(section, `${skill} section is missing`);
    const numbers: number[] = section.parts.flatMap((part: DeliveryPart) => (
      part.questionGroups.flatMap((group: DeliveryQuestionGroup) => (
        group.questions.flatMap((question: DeliveryQuestion) => (
          question.sourceNumber === null ? [] : [question.sourceNumber]
        ))
      ))
    ));
    assert.deepEqual(
      numbers,
      Array.from({ length: expectedMarks }, (_, index) => index + 1),
      `${skill} question numbers must be consecutive`,
    );
  }

  const writing = test.sections.find((section) => section.skill === 'WRITING');
  assert.equal(writing?.parts.length, 2, 'Writing must contain two tasks');

  const reading = test.sections.find((section) => section.skill === 'READING');
  const matchingHeadingsPart = reading?.parts.find((part) => (
    part.questionGroups.some((group) => group.questionType === 'MATCHING_HEADINGS')
  ));
  const matchingHeadingsPassage = matchingHeadingsPart?.stimuli.find(
    (stimulus) => stimulus.type === 'READING_PASSAGE',
  );
  assert(
    matchingHeadingsPassage?.bodyHtml?.includes('data-answer-position="Q14"'),
    'Reading Q14 matching-heading target is missing from the passage',
  );
  assert(
    matchingHeadingsPassage?.bodyHtml?.includes('data-answer-position="Q17"'),
    'Reading Q17 matching-heading target is missing from the passage',
  );
  assert(
    !matchingHeadingsPassage?.bodyHtml?.includes('Heading position'),
    'Extraction placeholder labels leaked into the reading passage',
  );

  const dragDropGroups = test.sections.flatMap((section) => (
    section.parts.flatMap((part) => (
      part.questionGroups.filter((group) => group.responseKind === 'DRAG_DROP')
    ))
  ));
  assert(
    dragDropGroups.some((group) => (
      group.promptHtml?.includes('data-ielts-dnd-layout="right"')
    )),
    'Drag-and-drop token placement metadata is missing',
  );
  assert(
    dragDropGroups.some((group) => (
      group.promptHtml?.includes('data-ielts-canvas="true"')
      && group.promptHtml.includes('data-ielts-overlay="true"')
    )),
    'Map drag-and-drop overlay metadata is missing',
  );

  for (const section of test.sections) {
    for (const part of section.parts) {
      for (const group of part.questionGroups) {
        if (group.responseKind !== 'SHORT_TEXT' && group.responseKind !== 'DRAG_DROP') {
          continue;
        }
        const placeholders = [...(group.promptHtml ?? '').matchAll(
          /data-answer-position="Q(\d+)"/g,
        )].map((match) => Number(match[1]));
        const expected = group.questions.flatMap((question) => (
          question.sourceNumber === null ? [] : [question.sourceNumber]
        ));
        assert.deepEqual(
          placeholders,
          expected,
          `${section.skill} ${part.slot} group ${group.id} has missing answer controls`,
        );
      }
    }
  }

  const serialized = JSON.stringify(test);
  for (const forbidden of [
    'encryptedPayload',
    'answerKey',
    'sourceLocator',
    'originalPath',
    'content-asset://',
  ]) {
    assert(!serialized.includes(forbidden), `Learner payload leaked ${forbidden}`);
  }

  console.log(JSON.stringify({
    id: test.id,
    version: test.version,
    sections: test.sections.map((section) => ({
      skill: section.skill,
      parts: section.parts.length,
      questions: section.parts.reduce(
        (total, part) => total + part.questionGroups.reduce(
          (partTotal, group) => partTotal + group.questions.length,
          0,
        ),
        0,
      ),
    })),
    status: 'DELIVERY_SMOKE_VALID',
  }, null, 2));
}

await main();
process.exit(0);
