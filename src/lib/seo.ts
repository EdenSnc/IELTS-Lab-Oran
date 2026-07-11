/**
 * SEO configuration - single source of truth.
 * 
 * TODO: Once the final domain is decided, update NEXT_PUBLIC_SITE_URL in .env
 * and restart the dev server. Every hreflang tag and JSON-LD block derives from it.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ieltslab.app';

export const SITE_NAME = 'IELTS Lab Oran';

export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Generates the full hreflang alternates map for a given path.
 * Pass `path` without a leading slash (e.g. '' for homepage, 'articles/tlscontact-capago' for articles).
 */
export function buildAlternates(path: string = '') {
  const normalize = (p: string) => (p ? `/${p}` : '');
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${normalize(path)}`;
  }

  // x-default points to the English version (canonical default for undetermined locales)
  languages['x-default'] = `${SITE_URL}/en${normalize(path)}`;

  return {
    canonical: `${SITE_URL}/en${normalize(path)}`,
    languages,
  };
}
