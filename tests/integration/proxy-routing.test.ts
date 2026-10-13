import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'publishable-integration-key';

test('proxy delegates valid route groups and returns a real global 404 for unknown paths', async () => {
  const { default: proxy } = await import('../../src/proxy');
  for (const pathname of ['/sample', '/staff/operations']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`));
    assert.equal(
      response.headers.get('x-middleware-rewrite'),
      null,
      `${pathname} must not be rewritten`,
    );
    assert.equal(
      response.headers.get('location'),
      null,
      `${pathname} must not be redirected by locale routing`,
    );
  }

  for (const pathname of ['/zz', '/random/unmatched/path']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`));
    assert.equal(response.status, 404, `${pathname} must carry HTTP 404 through the rewrite`);
    assert.equal(
      response.headers.get('x-middleware-rewrite'),
      `http://localhost/_not-found`,
      `${pathname} must use the global not-found document`,
    );
    assert.equal(response.headers.get('location'), null, `${pathname} must not redirect`);
  }
});
