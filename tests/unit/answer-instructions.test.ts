import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAnswerInstruction } from '../../src/lib/content/answer-instructions';

test('parses canonical IELTS word/number limits', () => {
  assert.deepEqual(parseAnswerInstruction('Write ONE WORD ONLY for each answer.'), {
    maximumWords: 1,
    allowNumber: false,
  });
  assert.deepEqual(parseAnswerInstruction('NO MORE THAN TWO WORDS AND/OR A NUMBER'), {
    maximumWords: 2,
    allowNumber: true,
  });
});

test('fails closed on ambiguous or unsupported instructions', () => {
  assert.throws(() => parseAnswerInstruction('Write a short answer.'), /UNSUPPORTED/);
  assert.throws(() => parseAnswerInstruction('Write TWO WORDS.'), /AMBIGUOUS/);
});
