import { COHORT_ARTICLE_PATH } from '@/lib/cohort-launch';
import { OSR_PATH } from '@/lib/one-skill-retake';
import type { MetadataRoute } from 'next';
import {
  CANONICAL_ORIGIN,
  CONTENT_REVIEW_DATE,
  INDEXABLE_LOCALIZED_PATHS,
  IndexableLocalizedPath,
  LOCALES,
} from '@/lib/seo';

const LAST_MODIFIED: Record<IndexableLocalizedPath, string> = {
  '': '2026-11-18',
  about: '2026-11-18',
  'mock-test': '2026-11-18',
  privacy: '2026-11-18',
  terms: '2026-11-18',
  articles: '2026-11-18',
  [COHORT_ARTICLE_PATH.slice(1) as 'articles/first-ielts-preparation-cohort-oran']: '2026-11-18',
  [OSR_PATH.slice(1) as 'articles/ielts-one-skill-retake-algeria']: '2026-11-18',
  'articles/academic-vs-general': '2026-11-18',
  'articles/computer-vs-paper-ielts': '2026-11-18',
  'articles/free-ielts-resources-algeria': '2026-11-18',
  'articles/how-to-register-algeria': '2026-11-18',
  'articles/ielts-vs-toefl-canada': '2026-11-18',
  'articles/italy-student-visa-english-tests-algeria': '2026-11-18',
  'articles/overcoming-speaking-anxiety': '2026-11-18',
  'articles/tlscontact-capago': '2026-11-18',
  'articles/writing-task-2-tactics': '2026-11-18',
};

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_LOCALIZED_PATHS.flatMap((path) =>
    LOCALES.map((locale) => {
      const suffix = path ? `/${path}` : '';
      const lastMod = LAST_MODIFIED[path] ?? CONTENT_REVIEW_DATE;
      const priority =
        path === ''
          ? 1
          : path === 'mock-test' || path === 'articles'
            ? 0.9
            : path === 'about'
              ? 0.8
              : path === 'privacy' || path === 'terms'
                ? 0.4
                : 0.7;
      return {
        url: `${CANONICAL_ORIGIN}/${locale}${suffix}`,
        lastModified: new Date(`${lastMod}T00:00:00Z`),
        changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
        priority,
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
