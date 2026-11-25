import assert from 'node:assert/strict';
import test from 'node:test';
import { BodyTooLargeError, readBoundedBody, readBoundedText } from '../../src/lib/http/read-body';

test('bounded readers count bytes and reject oversized requests before buffering the rest', async () => {
  const splitUtf8 = new TextEncoder().encode('é🙂');
  let cancelled = false;
  const oversized = new Request('https://example.test/api', {
    method: 'POST', duplex: 'half',
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(splitUtf8.subarray(0, 2));
        controller.enqueue(splitUtf8.subarray(2));
      },
      cancel() { cancelled = true; },
    }),
  } as RequestInit & { duplex: 'half' });
  await assert.rejects(readBoundedBody(oversized, 5), BodyTooLargeError);
  assert.equal(cancelled, true);
  const exact = new Request('https://example.test/api', { method: 'POST', body: splitUtf8 });
  assert.equal(await readBoundedText(exact, 6), 'é🙂');
});

test('a declared size over the limit is rejected before consuming the body', async () => {
  const request = new Request('https://example.test/api', {
    method: 'POST', body: 'small', headers: { 'Content-Length': '3000' },
  });
  await assert.rejects(readBoundedBody(request, 1000), BodyTooLargeError);
  assert.equal(request.bodyUsed, false);
});
