import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const target = process.argv[2] || 'all';

function findTests(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTests(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

let testFiles = [];
if (target === 'unit') {
  testFiles = findTests('tests/unit');
} else if (target === 'integration') {
  testFiles = findTests('tests/integration');
} else if (target === 'database') {
  testFiles = findTests('tests/database');
} else if (target === 'certification') {
  testFiles = findTests('tests/certification');
} else {
  testFiles = findTests('tests');
}

const nodeOptions = [
  process.env.NODE_OPTIONS,
  '--require=./scripts/tsx-windows-preload.cjs',
].filter(Boolean).join(' ');

const esmLoaderPath = path.resolve('scripts/esm-loader.mjs');
const registerCode = `import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register(pathToFileURL(${JSON.stringify(esmLoaderPath)}));`;

const result = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    `--import=data:text/javascript,${encodeURIComponent(registerCode)}`,
    '--test',
    ...testFiles,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      NODE_ENV: 'test',
    },
  },
);

process.exit(result.status ?? 1);
