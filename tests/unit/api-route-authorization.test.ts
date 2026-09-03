import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { PUBLIC_API_ROUTES } from '../../src/lib/security/api-route-policy';

const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api');
const REQUEST_USER_GUARD = /\brequire(?:Privileged)?RequestUser(?:WithAssurance)?\s*\(/u;

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(absolute);
    return entry.name === 'route.ts' ? [absolute] : [];
  }));
  return nested.flat();
}

function routePath(file: string) {
  return `/${path.relative(path.join(process.cwd(), 'src', 'app'), path.dirname(file)).replaceAll('\\', '/')}`;
}

test('every API route is authenticated or explicitly classified as public', async () => {
  const unclassified: string[] = [];
  for (const file of await routeFiles(API_ROOT)) {
    const source = await readFile(file, 'utf8');
    const route = routePath(file);
    if (!REQUEST_USER_GUARD.test(source) && !(route in PUBLIC_API_ROUTES)) {
      unclassified.push(route);
    }
  }
  assert.deepEqual(unclassified.sort(), []);
});
