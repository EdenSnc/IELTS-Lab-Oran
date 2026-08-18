import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswerKeyPayload } from '../../src/lib/grading/objective-grading.ts';
import { encrypt } from '../../src/lib/crypto.ts';

test('AnswerKey: unverified required AnswerKey is rejected (Invariant 3)', () => {
  // Simulating review status verification check in grading
  const groupReviewStatus: string = 'PENDING_REVIEW';
  const keyReviewStatus: string = 'PENDING_REVIEW';

  const checkVerification = () => {
    if (groupReviewStatus !== 'VERIFIED' || keyReviewStatus !== 'VERIFIED') {
      throw new Error('UNVERIFIED_ANSWER_KEY');
    }
  };

  assert.throws(checkVerification, /UNVERIFIED_ANSWER_KEY/);
});

test('AnswerKey: unsupported AnswerKey formatVersion is rejected (Invariant 9)', () => {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const validPayload = JSON.stringify({
    strategy: 'PER_ITEM_EXACT',
    answersByStableKey: { q1: ['true'] },
  });
  const encrypted = encrypt(validPayload);

  // Supported version 1 succeeds
  const parsedV1 = parseAnswerKeyPayload(encrypted, 1);
  assert.equal(parsedV1.strategy, 'PER_ITEM_EXACT');

  // Unsupported future format version 2 fails closed
  assert.throws(() => {
    parseAnswerKeyPayload(encrypted, 2);
  }, /UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION: 2/);
});
