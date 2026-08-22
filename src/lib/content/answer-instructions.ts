export type ParsedAnswerInstruction = {
  maximumWords: number;
  allowNumber: boolean;
};

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
};

export function parseAnswerInstruction(raw: string): ParsedAnswerInstruction {
  const text = raw
    .normalize('NFKC')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toUpperCase();

  const wordMatch = text.match(/\b(ONE|TWO|THREE|FOUR|[1-4])\s+WORDS?\b/u);
  if (!wordMatch) throw new Error('UNSUPPORTED_ANSWER_INSTRUCTION');
  const maximumWords = NUMBER_WORDS[wordMatch[1]] ?? Number(wordMatch[1]);
  const allowNumber = /\b(?:A\s+)?NUMBERS?\b/u.test(text);

  const canonicalOneWordAndNumber = maximumWords === 1
    && /\bONE\s+WORD\s+AND\s*\/\s*OR\s+A\s+NUMBER\b/u.test(text);
  if (!canonicalOneWordAndNumber && !/\b(?:ONLY|NO MORE THAN|UP TO|MAXIMUM)\b/u.test(text)) {
    throw new Error('AMBIGUOUS_ANSWER_INSTRUCTION');
  }
  return { maximumWords, allowNumber };
}
