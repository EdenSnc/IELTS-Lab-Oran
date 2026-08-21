import type { MetadataRoute } from 'next';
import { CANONICAL_ORIGIN, CONTENT_REVIEW_DATE, LOCALES } from '@/lib/seo';

const indexablePaths = [
  '',
  'articles',
  'articles/academic-vs-general',
  'articles/computer-vs-paper-ielts',
  'articles/free-ielts-resources-algeria',
  'articles/how-to-register-algeria',
  'articles/ielts-vs-toefl-canada',
  'articles/overcoming-speaking-anxiety',
  'articles/tlscontact-capago',
  'articles/writing-task-2-tactics',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths.flatMap((path) =>
    LOCALES.map((locale) => {
      const suffix = path ? `/${path}` : '';
      return {
        url: `${CANONICAL_ORIGIN}/${locale}${suffix}`,
        lastModified: new Date(CONTENT_REVIEW_DATE),
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
