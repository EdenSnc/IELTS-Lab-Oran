import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Please specify a script to run.');
  process.exit(1);
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
    scriptPath,
    ...process.argv.slice(3),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  },
);

process.exit(result.status ?? 1);
