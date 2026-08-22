import fs from 'fs';
import path from 'path';
import { parseStagedTestPackage } from '../src/lib/content/staging-schema.ts';
import { certifyCompleteMockPackage } from '../src/lib/content/content-certification.ts';

/**
 * The former seed script wrote obsolete Passage/Track models directly from
 * ad-hoc content JSON. That bypassed the canonical contract and could not
 * create a reproducible, versioned test.
 *
 * Until an importer emits StagedTestPackage v2, this command is a
 * validation gate only. Persistence will be added to the adapter/import service
 * rather than reintroducing a second content shape here.
 */
function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error('Usage: npm run content:validate -- <staged-test-package.json>');
  }

  const filePath = path.resolve(process.cwd(), input);
  const payload: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const staged = parseStagedTestPackage(payload);
  if (process.argv.slice(3).includes('--certify-full-mock')) {
    certifyCompleteMockPackage(staged);
  }

  const partCount = staged.test.sections.reduce(
    (total, section) => total + section.parts.length,
    0,
  );
  const questionGroupCount = staged.test.sections.reduce(
    (sectionTotal, section) => sectionTotal + section.parts.reduce(
      (partTotal, part) => partTotal + part.questionGroups.length,
      0,
    ),
    0,
  );
  const questionCount = staged.test.sections.reduce(
    (sectionTotal, section) => sectionTotal + section.parts.reduce(
      (partTotal, part) => partTotal + part.questionGroups.reduce(
        (groupTotal, group) => groupTotal + group.questions.length,
        0,
      ),
      0,
    ),
    0,
  );

  console.log(JSON.stringify({
    valid: true,
    schemaVersion: staged.schemaVersion,
    title: staged.test.title,
    sections: staged.test.sections.length,
    parts: partCount,
    questionGroups: questionGroupCount,
    questions: questionCount,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
}
