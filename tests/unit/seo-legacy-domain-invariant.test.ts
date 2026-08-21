import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function scanDirectory(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'coverage', 'dist'].includes(entry.name)) {
        files.push(...scanDirectory(fullPath, extensions));
      }
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

test('SEO Invariant: Zero occurrences of legacy/incorrect domains in src/', () => {
  const srcFiles = scanDirectory('src', ['.ts', '.tsx', '.js', '.jsx', '.json', '.css']);
  const forbiddenPatterns = ['ieltslab.app', 'ieltslaboran.com', 'ieltslab.tech'];

  const violations: { file: string; pattern: string; line: number; text: string }[] = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      for (const pattern of forbiddenPatterns) {
        if (line.toLowerCase().includes(pattern)) {
          violations.push({
            file,
            pattern,
            line: index + 1,
            text: line.trim(),
          });
        }
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Found legacy domain violations in src/:\n${violations.map((v) => `${v.file}:${v.line} (${v.pattern}) -> ${v.text}`).join('\n')}`
  );
});

test('SEO Invariant: Zero occurrences of legacy/incorrect domains in messages/', () => {
  const messageFiles = scanDirectory('messages', ['.json']);
  const forbiddenPatterns = ['ieltslab.app', 'ieltslaboran.com', 'ieltslab.tech'];

  const violations: { file: string; pattern: string; line: number; text: string }[] = [];

  for (const file of messageFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      for (const pattern of forbiddenPatterns) {
        if (line.toLowerCase().includes(pattern)) {
          violations.push({
            file,
            pattern,
            line: index + 1,
            text: line.trim(),
          });
        }
      }
    });
  }

  assert.deepEqual(violations, [], `Found legacy domain violations in messages/`);
});

test('Hydration invariant: rejected browser-extension workaround is absent', () => {
  assert.equal(
    fs.existsSync('src/components/BrowserExtensionHydrationGuard.tsx'),
    false,
    'Browser-extension DOM mutation workaround must not return',
  );

  const source = scanDirectory('src', ['.ts', '.tsx', '.js', '.jsx']);
  for (const file of source) {
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(!content.includes('bis_skin_checked'), `${file} contains extension-specific DOM cleanup`);
    assert.ok(!content.includes('browser-extension-hydration-guard'), `${file} contains the rejected hydration workaround`);
  }
});
