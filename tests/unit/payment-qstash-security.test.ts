import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import {
  chargilyAmountFromMinor,
  chargilyMetadata,
  parseChargilyWebhook,
  verifyChargilySignature,
} from '../../src/lib/payments/chargily';
import { roundOverallBand } from '../../src/lib/grading/writing-run-core';
import { resultAccessActive } from '../../src/lib/attempts/result-access';
import { qstashEndpoint, verifyQStashRequest } from '../../src/lib/qstash/verification';

function signQStash(body: string, url: string, key: string) {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'Upstash',
    sub: url,
    body: createHash('sha256').update(body).digest('base64url'),
    iat: now,
    nbf: now - 1,
    exp: now + 60,
    jti: 'unit-test-message',
  })).toString('base64url');
  const signature = createHmac('sha256', key).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('Chargily verification uses the exact raw body and parses authoritative metadata', () => {
  process.env.CHARGILY_SECRET_KEY = 'unit-test-chargily-secret';
  const event = {
    id: '01hjjjzf7wbc454te45mwx35fe',
    entity: 'event',
    livemode: 'false',
    type: 'checkout.paid',
    data: {
      id: '01hjjj9aymmrwe664nbzrv84sg',
      entity: 'checkout',
      amount: 29500,
      currency: 'dzd',
      status: 'paid',
      metadata: [{ schema_version: 1, order_id: 'order-id', payment_attempt_id: 'attempt-id' }],
    },
  };
  const rawBody = JSON.stringify(event);
  const signature = createHmac('sha256', process.env.CHARGILY_SECRET_KEY).update(rawBody).digest('hex');
  assert.equal(verifyChargilySignature(rawBody, signature), true);
  assert.equal(verifyChargilySignature(`${rawBody} `, signature), false);
  const parsed = parseChargilyWebhook(rawBody);
  assert.equal(parsed.liveMode, false);
  assert.deepEqual(chargilyMetadata(parsed.data.metadata), {
    orderId: 'order-id',
    paymentAttemptId: 'attempt-id',
  });
});

test('Chargily receives whole DZD while platform accounting remains in minor units', () => {
  assert.equal(chargilyAmountFromMinor(390_000, 'DZD'), 3_900);
  assert.throws(() => chargilyAmountFromMinor(390_001, 'DZD'), /CHARGILY_AMOUNT_NOT_WHOLE_DZD/u);
  assert.throws(() => chargilyAmountFromMinor(390_000, 'EUR'), /CHARGILY_CURRENCY_UNSUPPORTED/u);
});

test('stored result access expires at the product entitlement boundary', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');
  assert.equal(resultAccessActive(null, now), true);
  assert.equal(resultAccessActive(new Date('2026-08-29T12:00:00.001Z'), now), true);
  assert.equal(resultAccessActive(new Date('2026-08-29T12:00:00.000Z'), now), false);
});

test('QStash receiver binds the signature to the exact body and destination URL', async () => {
  process.env.QSTASH_CALLBACK_BASE_URL = 'https://example.invalid';
  process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-unit-signing-key';
  process.env.QSTASH_NEXT_SIGNING_KEY = 'next-unit-signing-key';
  const endpoint = qstashEndpoint('/api/internal/grading/writing');
  const rawBody = JSON.stringify({
    version: 1,
    type: 'WRITING_GRADING',
    gradingRunId: 'a81b5dc4-22d0-4a84-a00f-202308000001',
  });
  const signature = signQStash(rawBody, endpoint, process.env.QSTASH_CURRENT_SIGNING_KEY);
  assert.equal(await verifyQStashRequest({ rawBody, signature, endpoint }), true);
  assert.equal(await verifyQStashRequest({ rawBody: `${rawBody} `, signature, endpoint }), false);
  assert.equal(await verifyQStashRequest({
    rawBody,
    signature,
    endpoint: 'https://example.invalid/api/internal/grading/recover',
  }), false);
});

test('overall IELTS rounding is correct for every realistic half-band combination', () => {
  const bands = Array.from({ length: 19 }, (_, index) => index / 2);
  for (const listening of bands) {
    for (const reading of bands) {
      for (const writing of bands) {
        for (const speaking of bands) {
          const average = (listening + reading + writing + speaking) / 4;
          assert.equal(
            roundOverallBand([listening, reading, writing, speaking]),
            Math.round(average * 2) / 2,
          );
        }
      }
    }
  }
  assert.equal(roundOverallBand([6, 6, 6.5, 6.5]), 6.5);
  assert.equal(roundOverallBand([6.5, 6.5, 7, 7]), 7);
});
