import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function collect(candidate) {
  const absolute = path.resolve(candidate);
  const entries = readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const nested = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collect(nested);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [nested] : [];
  });
}

const roots = process.argv.slice(2);
const files = (roots.length ? roots : ['tests/unit', 'tests/certification'])
  .flatMap(collect)
  .sort();
if (!files.length) throw new Error('No test files found.');

const result = spawnSync(process.execPath, [
  '--conditions=react-server',
  '--import',
  'tsx',
  '--test',
  ...files,
], { stdio: 'inherit' });
process.exit(result.status ?? 1);
