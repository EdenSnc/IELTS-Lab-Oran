import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'publishable-integration-key';

test('proxy delegates valid route groups and unknown paths to the App Router', async () => {
  const { default: proxy } = await import('../../src/proxy');
  for (const pathname of ['/sample', '/staff/operations', '/zz', '/random/unmatched/path']) {
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
});
