import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAnswerInstruction } from '../../src/lib/content/answer-instructions';

test('parses canonical IELTS word/number limits', () => {
  const cases = [
    ['ONE WORD ONLY', 1, false],
    ['NO MORE THAN ONE WORD', 1, false],
    ['NO MORE THAN TWO WORDS', 2, false],
    ['NO MORE THAN THREE WORDS', 3, false],
    ['ONE WORD AND/OR A NUMBER', 1, true],
    ['NO MORE THAN ONE WORD AND/OR A NUMBER', 1, true],
    ['NO MORE THAN TWO WORDS AND/OR A NUMBER', 2, true],
    ['NO MORE THAN THREE WORDS AND/OR A NUMBER', 3, true],
    ['WRITE ONE WORD AND/OR A NUMBER FOR EACH ANSWER', 1, true],
    ['WRITE NO MORE THAN TWO WORDS AND/OR A NUMBER FOR EACH ANSWER', 2, true],
  ] as const;
  for (const [instruction, maximumWords, allowNumber] of cases) {
    assert.deepEqual(parseAnswerInstruction(instruction), { maximumWords, allowNumber });
  }
});

test('fails closed on ambiguous or unsupported instructions', () => {
  assert.throws(() => parseAnswerInstruction('Write a short answer.'), /UNSUPPORTED/);
  assert.throws(() => parseAnswerInstruction('Write TWO WORDS.'), /AMBIGUOUS/);
});
