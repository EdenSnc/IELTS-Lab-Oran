import type { MetadataRoute } from 'next';
import { CONTENT_REVIEW_DATE, LOCALES, SITE_URL } from '@/lib/seo';

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
        url: `${SITE_URL}/${locale}${suffix}`,
        lastModified: new Date(CONTENT_REVIEW_DATE),
        changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
        priority: path === '' ? 1 : path === 'articles' ? 0.8 : 0.7,
        alternates: {
          languages: Object.fromEntries([
            ...LOCALES.map((language) => [
              language,
              `${SITE_URL}/${language}${suffix}`,
            ]),
            ['x-default', `${SITE_URL}/en${suffix}`],
          ]),
        },
      };
    }),
  );
}
