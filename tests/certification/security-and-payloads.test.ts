import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.ts';
import { gradeVerifiedObjectiveAnswers } from '../../src/lib/grading/objective-grading.ts';

test('Phase V & W: Security, Malicious Payloads, and Unicode Adversarial Invariance', async () => {
  const version = await prisma.testVersion.findFirst({
    where: { test: { variant: 'ACADEMIC' } },
  });
  assert.ok(version, 'TestVersion must exist');

  // 1. Unknown & Out-of-bounds question numbers
  const outOfBoundsAnswers = {
    listening: {
      '-1': 'option',
      '0': 'option',
      '41': 'option',
      '999': 'option',
    },
    reading: {},
  };
  const res1 = await gradeVerifiedObjectiveAnswers({
    testVersionId: version.id,
    answers: outOfBoundsAnswers,
  });
  const lRes1 = res1.skills.find((s) => s.skill === 'LISTENING')!;
  assert.equal(lRes1.rawScore, 0, 'Out-of-bounds question numbers must not award any marks');

  // 2. Adversarial Injection Strings (SQL, HTML, Script, JSON)
  const maliciousStrings = [
    "<script>alert('xss')</script>",
    "'; DROP TABLE app_private.\"User\"; --",
    '{"strategy": "PER_ITEM_EXACT", "maxMarks": 40}',
    '../../etc/passwd',
    '${process.env.ENCRYPTION_KEY}',
    'undefined',
    'null',
    'NaN',
    '[object Object]',
  ];

  for (const attack of maliciousStrings) {
    const attackPayload = {
      listening: { '1': attack },
      reading: { '1': attack },
    };
    const res = await gradeVerifiedObjectiveAnswers({
      testVersionId: version.id,
      answers: attackPayload,
    });
    const lRes = res.skills.find((s) => s.skill === 'LISTENING')!;
    assert.equal(lRes.rawScore, 0, `Malicious payload '${attack}' must not award any marks`);
  }

  // 3. Huge string flood (10,000 characters per answer)
  const hugeString = 'a'.repeat(10_000);
  const resHuge = await gradeVerifiedObjectiveAnswers({
    testVersionId: version.id,
    answers: { listening: { '1': hugeString }, reading: {} },
  });
  const lResHuge = resHuge.skills.find((s) => s.skill === 'LISTENING')!;
  assert.equal(lResHuge.rawScore, 0, 'Massive payload must safely fail matching with 0 marks');

  // 4. Unicode confusables / Homoglyphs
  // Cyrillic small 'а' (U+0430) vs Latin small 'a' (U+0061)
  const cyrillicA = '\u0430';
  const latinA = 'a';
  assert.notEqual(cyrillicA, latinA);

  const resConfusable = await gradeVerifiedObjectiveAnswers({
    testVersionId: version.id,
    answers: { listening: { '1': cyrillicA }, reading: {} },
  });
  const lResConfusable = resConfusable.skills.find((s) => s.skill === 'LISTENING')!;
  assert.equal(lResConfusable.rawScore, 0, 'Cyrillic homoglyph must not match Latin character');

  // 5. Zero-width spaces & control characters
  const zeroWidth = 'c\u200Bentral';
  const resZeroWidth = await gradeVerifiedObjectiveAnswers({
    testVersionId: version.id,
    answers: { listening: { '7': zeroWidth }, reading: {} },
  });
  const lResZeroWidth = resZeroWidth.skills.find((s) => s.skill === 'LISTENING')!;
  assert.equal(lResZeroWidth.rawScore, 0, 'String with zero-width characters must not falsely match clean text');
});
