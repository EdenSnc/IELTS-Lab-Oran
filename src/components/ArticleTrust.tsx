import { CONTENT_REVIEW_DATE, Locale, SITE_NAME, SITE_URL, localizedUrl } from '@/lib/seo';

type Source = {
  label: string;
  href: string;
};

type ArticleTrustProps = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  sources: Source[];
};

const copy = {
  en: {
    reviewed: 'Fact-checked 29 July 2026 by IELTS Lab Oran',
    sources: 'Official sources',
    note: 'Requirements and fees can change. Confirm the final decision on the linked official page.',
  },
  fr: {
    reviewed: 'Vérifié le 29 juillet 2026 par IELTS Lab Oran',
    sources: 'Sources officielles',
    note: 'Les exigences et les frais peuvent changer. Confirmez votre décision finale sur la page officielle liée.',
  },
  ar: {
    reviewed: 'تم التحقق من المعلومات في 29 يوليو 2026 بواسطة IELTS Lab Oran',
    sources: 'المصادر الرسمية',
    note: 'قد تتغير الشروط والرسوم. تحقق من قرارك النهائي في الصفحة الرسمية المرتبطة.',
  },
} as const;

export default function ArticleTrust({
  locale,
  slug,
  title,
  description,
  sources,
}: ArticleTrustProps) {
  const articleUrl = localizedUrl(locale, `articles/${slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    dateModified: CONTENT_REVIEW_DATE,
    inLanguage: locale,
    mainEntityOfPage: articleUrl,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: localizedUrl(locale),
    },
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: localizedUrl(locale),
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: localizedUrl(locale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy[locale].sources === 'Official sources' ? 'IELTS articles' : 'IELTS',
        item: localizedUrl(locale, 'articles'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <p className="mt-4 mb-10 text-sm text-gray-500">{copy[locale].reviewed}</p>
      <aside className="not-prose my-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-charcoal">{copy[locale].sources}</h2>
        <ul className="mt-4 grid gap-3">
          {sources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-crimson underline decoration-crimson/30 underline-offset-4 hover:decoration-crimson"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-gray-500">{copy[locale].note}</p>
      </aside>
    </>
  );
}
