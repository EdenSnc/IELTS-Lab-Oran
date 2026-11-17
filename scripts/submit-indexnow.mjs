import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_ORIGIN, INDEXNOW_KEY, LOCALES } from '../src/lib/seo.ts';
import { COHORT_ARTICLE_PATH } from '../src/lib/cohort-launch.ts';
import { OSR_PATH } from '../src/lib/one-skill-retake.ts';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const ALL_PATHS = [
  '',
  'articles',
  COHORT_ARTICLE_PATH.slice(1),
  OSR_PATH.slice(1),
  'articles/academic-vs-general',
  'articles/computer-vs-paper-ielts',
  'articles/free-ielts-resources-algeria',
  'articles/how-to-register-algeria',
  'articles/ielts-vs-toefl-canada',
  'articles/italy-student-visa-english-tests-algeria',
  'articles/overcoming-speaking-anxiety',
  'articles/tlscontact-capago',
  'articles/writing-task-2-tactics',
];

function allSitemapUrls() {
  return ALL_PATHS.flatMap((p) => {
    const suffix = p ? `/${p}` : '';
    return LOCALES.map((locale) => `${CANONICAL_ORIGIN}/${locale}${suffix}`);
  });
}

function changedUrlsFromGit() {
  const diff = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  const urls = new Set();
  for (const file of diff) {
    const m = file.match(/^src\/app\/\[locale\]\/(articles\/[^/]+)\/page\.tsx$/);
    if (m) {
      for (const locale of LOCALES) urls.add(`${CANONICAL_ORIGIN}/${locale}/${m[1]}`);
    } else if (
      file.startsWith('src/components/') ||
      file.startsWith('messages/') ||
      file === 'src/app/[locale]/page.tsx'
    ) {
      for (const locale of LOCALES) urls.add(`${CANONICAL_ORIGIN}/${locale}`);
    } else if (file === 'src/lib/articleContent.ts' || file === 'src/lib/seo.ts') {
      return allSitemapUrls();
    }
  }
  return Array.from(urls);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const modeChanged = args.includes('--changed');

const keyFile = path.resolve(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`);
if (!fs.existsSync(keyFile) || fs.readFileSync(keyFile, 'utf8').trim() !== INDEXNOW_KEY) {
  throw new Error(`Missing or mismatched IndexNow key file at ${keyFile}`);
}

const urlList = modeChanged ? changedUrlsFromGit() : allSitemapUrls();
if (!urlList.length) {
  console.log('No changed public URLs detected for IndexNow submission.');
  process.exit(0);
}

const payload = {
  host: new URL(CANONICAL_ORIGIN).host,
  key: INDEXNOW_KEY,
  keyLocation: `${CANONICAL_ORIGIN}/${INDEXNOW_KEY}.txt`,
  urlList,
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
const bodyText = await response.text();
console.log(`IndexNow response: HTTP ${response.status} (${urlList.length} URLs) ${bodyText}`);
if (!response.ok) {
  process.exit(1);
}
