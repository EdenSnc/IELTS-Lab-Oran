import assert from 'node:assert/strict';
import test from 'node:test';
import { listeningAssetCacheHeaders } from '../../src/lib/audio/listening-cache';

test('Strict Listening assets are no-store while Practice assets remain private-cacheable', () => {
  assert.match(listeningAssetCacheHeaders(true)['Cache-Control'], /no-store/u);
  assert.equal(listeningAssetCacheHeaders(true).Pragma, 'no-cache');
  assert.match(listeningAssetCacheHeaders(false)['Cache-Control'], /immutable/u);
});
