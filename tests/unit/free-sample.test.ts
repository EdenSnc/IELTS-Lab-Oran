import assert from 'node:assert/strict';
import test from 'node:test';
import type { DeliveryTest } from '../../src/lib/content/delivery-types';
import { buildPublicReadingSample } from '../../src/lib/content/public-sample';

const source: DeliveryTest = {
  id: 'version-id',
  title: 'Public demo',
  variant: 'ACADEMIC',
  version: 1,
  sections: [{
    id: 'reading', skill: 'READING', displayOrder: 1, timeLimitSeconds: 3600,
    parts: [{
      id: 'part', slot: 'READING_SECTION_1', title: 'Reading sample', instructionsHtml: null,
      recommendedTimeSeconds: 1200, stimuli: [],
      questionGroups: [{
        id: 'group', displayOrder: 1, questionType: 'MULTIPLE_CHOICE', responseKind: 'SINGLE_CHOICE', scoringStrategy: 'PER_QUESTION',
        sourceNumberStart: 1, sourceNumberEnd: 8, instructionsHtml: null, promptHtml: null, options: [], maxMarks: 8,
        minWordCount: null, maxWords: null, allowNumbers: null, rawAnswerInstruction: null,
        questions: Array.from({ length: 8 }, (_, index) => ({
          id: `q-${index + 1}`, stableKey: `q-${index + 1}`, sourceNumber: index + 1,
          displayOrder: index + 1, promptHtml: null, maxMarks: 1,
        })),
      }],
    }],
  }],
};

test('public sample contains one Reading part and at most five questions', () => {
  const sample = buildPublicReadingSample(source);
  assert.equal(sample.sections.length, 1);
  assert.equal(sample.sections[0].skill, 'READING');
  assert.equal(sample.sections[0].parts.length, 1);
  assert.equal(sample.sections[0].parts[0].questionGroups[0].questions.length, 5);
  assert.equal(sample.sections[0].timeLimitSeconds, 600);
});
