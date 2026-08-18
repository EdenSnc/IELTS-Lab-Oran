import { spawnSync } from 'node:child_process';
import path from 'node:path';

const nodeOptions = [process.env.NODE_OPTIONS, '--require=./scripts/tsx-windows-preload.cjs'].filter(Boolean).join(' ');
const result = spawnSync(
  process.execPath,
  [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('scripts/delivery-smoke.mts')],
  { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);
process.exit(result.status ?? 1);
