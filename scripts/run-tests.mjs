import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const target = process.argv[2] || 'ci';

function findTests(dir, filterFn) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTests(full, filterFn));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      if (!filterFn || filterFn(full)) {
        results.push(full);
      }
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
} else if (target === 'certification:generic') {
  testFiles = findTests('tests/certification', (file) => !file.includes('fixture'));
} else if (target === 'certification:fixture') {
  testFiles = findTests('tests/certification/fixture');
} else if (target === 'certification') {
  testFiles = findTests('tests/certification');
} else if (target === 'all') {
  testFiles = findTests('tests');
} else {
  // 'ci' or default: all unit, integration, and generic certification tests (no production DB required)
  testFiles = [
    ...findTests('tests/unit'),
    ...findTests('tests/integration'),
    ...findTests('tests/certification', (file) => !file.includes('fixture')),
  ];
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
