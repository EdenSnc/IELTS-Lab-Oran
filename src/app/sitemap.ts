import { COHORT_ARTICLE_PATH } from '@/lib/cohort-launch';
import { OSR_PATH, OSR_REVIEW_DATE } from '@/lib/one-skill-retake';
import type { MetadataRoute } from 'next';
import { CANONICAL_ORIGIN, CONTENT_REVIEW_DATE, LOCALES } from '@/lib/seo';

const indexablePaths = [
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
] as const;

const LAST_MODIFIED: Partial<Record<(typeof indexablePaths)[number], string>> = {
  '': '2026-11-17',
  articles: '2026-11-17',
  [COHORT_ARTICLE_PATH.slice(1)]: '2026-11-17',
  [OSR_PATH.slice(1)]: OSR_REVIEW_DATE,
  'articles/computer-vs-paper-ielts': '2026-11-17',
  'articles/free-ielts-resources-algeria': '2026-11-17',
  'articles/how-to-register-algeria': '2026-11-17',
  'articles/italy-student-visa-english-tests-algeria': '2026-08-27',
};

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths.flatMap((path) =>
    LOCALES.map((locale) => {
      const suffix = path ? `/${path}` : '';
      const lastMod = LAST_MODIFIED[path] ?? CONTENT_REVIEW_DATE;
      return {
        url: `${CANONICAL_ORIGIN}/${locale}${suffix}`,
        lastModified: new Date(`${lastMod}T00:00:00Z`),
        changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
        priority: path === '' ? 1 : path === 'articles' ? 0.8 : 0.7,
        alternates: {
          languages: Object.fromEntries([
            ...LOCALES.map((language) => [
              language,
              `${CANONICAL_ORIGIN}/${language}${suffix}`,
            ]),
            ['x-default', `${CANONICAL_ORIGIN}/en${suffix}`],
          ]),
        },
      };
    }),
  );
}
