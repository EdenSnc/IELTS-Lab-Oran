import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BUCKET = 'protected-test-assets';

export function assertValidAssetStorageKey(storageKey: string) {
  if (
    storageKey.includes('\\')
    || /[%_*?\[\]]/u.test(storageKey)
    || storageKey.startsWith('/')
    || storageKey.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) throw new Error('INVALID_PRIVATE_ASSET_KEY');
  return storageKey;
}

function configuration(bucketOverride?: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = bucketOverride ?? process.env.PRIVATE_TEST_ASSET_BUCKET ?? DEFAULT_BUCKET;
  if (!projectUrl || !serviceKey || serviceKey.length < 20) return null;
  return { projectUrl, serviceKey, bucket };
}

function safeStorageKey(storageKey: string) {
  const normalized = storageKey.replaceAll('\\', '/');
  if (
    normalized.startsWith('/')
    || normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) throw new Error('INVALID_PRIVATE_ASSET_KEY');
  return normalized.split('/').map(encodeURIComponent).join('/');
}

export async function fetchPrivateAsset(storageKey: string, range?: string | null, bucketOverride?: string) {
  const remote = configuration(bucketOverride);
  if (remote) {
    const { projectUrl, serviceKey, bucket } = remote;
    const url = `${projectUrl.replace(/\/$/, '')}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${safeStorageKey(storageKey)}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        apikey: serviceKey,
        ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${serviceKey}` }),
        ...(range ? { Range: range } : {}),
      },
    });
    if (response.ok || response.status === 206) return response;
  }

  // The filesystem fallback is for local development only. Production must use
  // authenticated object storage so protected assets are never bundled.
  if (process.env.NODE_ENV === 'production') throw new Error('PRIVATE_ASSET_UNAVAILABLE');
  const localRoot = process.env.PRIVATE_TEST_ASSET_LOCAL_ROOT;
  if (!localRoot) throw new Error('PRIVATE_ASSET_UNAVAILABLE');
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), localRoot);
  const filePath = path.resolve(/*turbopackIgnore: true*/ root, storageKey);
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('INVALID_PRIVATE_ASSET_KEY');
  const body = await fs.readFile(filePath);
  const headers = new Headers({ 'Accept-Ranges': 'bytes', 'Content-Length': String(body.byteLength) });
  if (!range) return new Response(new Uint8Array(body), { headers });
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416, headers });
  const start = Number(match[1]);
  const end = Math.min(match[2] ? Number(match[2]) : body.byteLength - 1, body.byteLength - 1);
  if (start > end || start >= body.byteLength) return new Response(null, { status: 416, headers });
  const partial = body.subarray(start, end + 1);
  headers.set('Content-Length', String(partial.byteLength));
  headers.set('Content-Range', `bytes ${start}-${end}/${body.byteLength}`);
  return new Response(new Uint8Array(partial), { status: 206, headers });
}

export async function downloadPrivateAsset(storageKey: string, bucketOverride?: string) {
  return Buffer.from(await (await fetchPrivateAsset(storageKey, null, bucketOverride)).arrayBuffer());
}
