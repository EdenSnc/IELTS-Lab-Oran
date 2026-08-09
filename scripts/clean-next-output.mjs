import { rmSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const outputDirectory = path.resolve(projectRoot, '.next');

if (path.dirname(outputDirectory) !== projectRoot) {
  throw new Error('Refusing to clean an unexpected build directory');
}

rmSync(outputDirectory, { recursive: true, force: true });
