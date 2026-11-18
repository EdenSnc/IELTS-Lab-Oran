import { Link } from '@/i18n/routing';
import {
  CONTENT_REVIEW_DATE,
  GUIDE_POOL,
  Locale,
  SITE_NAME,
  SITE_URL,
  defaultOgImageUrl,
  localizedUrl,
  toAlgeriaIsoDate,
} from '@/lib/seo';

export { GUIDE_POOL };

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
  reviewedAt?: string;
  publishedAt?: string;
};

function getRelatedGuides(currentSlug: string) {
  const candidates = GUIDE_POOL.filter((item) => item.slug !== currentSlug);
  const idx = Math.max(
    0,
    GUIDE_POOL.findIndex((item) => item.slug === currentSlug),
  );
  return [
    candidates[idx % candidates.length],
    candidates[(idx + 3) % candidates.length],
    candidates[(idx + 6) % candidates.length],
  ];
}

const copy = {
  en: {
    reviewed: 'Fact-checked 29 July 2026 by Amine Senouci (IELTS Lab Oran)',
    sources: 'Official sources',
    note: 'Requirements and fees can change. Confirm the final decision on the linked official page.',
    breadcrumbGuides: 'IELTS Guides',
    breadcrumbAria: 'Breadcrumb',
    relatedTitle: 'Related IELTS Algeria Guides',
  },
  fr: {
    reviewed: 'Vérifié le 29 juillet 2026 par Amine Senouci (IELTS Lab Oran)',
    sources: 'Sources officielles',
    note: 'Les exigences et les frais peuvent changer. Confirmez votre décision finale sur la page officielle liée.',
    breadcrumbGuides: 'Guides IELTS',
    breadcrumbAria: 'Fil d’Ariane',
    relatedTitle: 'Autres guides IELTS Algérie',
  },
  ar: {
    reviewed: 'تم التحقق في 29 يوليو 2026 بواسطة أمين سنوسي (IELTS Lab Oran)',
    sources: 'المصادر الرسمية',
    note: 'قد تتغير الشروط والرسوم. تحقق من قرارك النهائي في الصفحة الرسمية المرتبطة.',
    breadcrumbGuides: 'أدلة IELTS',
    breadcrumbAria: 'مسار التنقل',
    relatedTitle: 'أدلة IELTS أخرى في الجزائر',
  },
} as const;

export function ArticleBreadcrumb({
  locale,
  title,
}: {
  locale: Locale;
  title: string;
}) {
  const safeLocale: Locale = locale in copy ? locale : 'en';
  return (
    <nav
      aria-label={copy[safeLocale].breadcrumbAria}
      className="not-prose mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600"
    >
      <Link href="/" className="hover:text-[#b81428] underline-offset-4 hover:underline">
        {SITE_NAME}
      </Link>
      <span aria-hidden="true">/</span>
      <Link href="/articles" className="hover:text-[#b81428] underline-offset-4 hover:underline">
        {copy[safeLocale].breadcrumbGuides}
      </Link>
      <span aria-hidden="true">/</span>
      <span className="text-charcoal line-clamp-1">{title}</span>
    </nav>
  );
}

export default function ArticleTrust({
  locale,
  slug,
  title,
  description,
  sources,
  reviewedAt = CONTENT_REVIEW_DATE,
  publishedAt = reviewedAt,
}: ArticleTrustProps) {
  const safeLocale: Locale = locale in copy ? locale : 'en';
  const articleUrl = localizedUrl(safeLocale, `articles/${slug}`);
  const related = getRelatedGuides(slug);
  const instructorId = `${SITE_URL}/#instructor`;
  const organizationId = `${SITE_URL}/#organization`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: defaultOgImageUrl(),
    datePublished: toAlgeriaIsoDate(publishedAt),
    dateModified: toAlgeriaIsoDate(reviewedAt),
    inLanguage: safeLocale,
    mainEntityOfPage: articleUrl,
    author: {
      '@type': 'Person',
      '@id': instructorId,
      name: 'Amine Senouci',
      alternateName: 'Mr. Senouci',
      url: localizedUrl(safeLocale, 'about#instructor'),
    },
    reviewedBy: {
      '@type': 'Person',
      '@id': instructorId,
      name: 'Amine Senouci',
      url: localizedUrl(safeLocale, 'about#instructor'),
    },
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': organizationId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo_rounded.png`,
        width: 512,
        height: 512,
      },
    },
    ...(sources.length > 0 ? { citation: sources.map((s) => s.href) } : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: localizedUrl(safeLocale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy[safeLocale].breadcrumbGuides,
        item: localizedUrl(safeLocale, 'articles'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: articleUrl,
      },
    ],
  };

  const reviewDateOnly = reviewedAt.slice(0, 10);

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
      <p className="mt-2 mb-8 text-sm font-medium text-gray-700">
        {reviewDateOnly === CONTENT_REVIEW_DATE
          ? copy[safeLocale].reviewed
          : safeLocale === 'fr'
            ? `Vérifié le ${new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewDateOnly}T00:00:00Z`))} par Amine Senouci (IELTS Lab Oran)`
            : safeLocale === 'ar'
              ? `تم التحقق في ${new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewDateOnly}T00:00:00Z`))} بواسطة أمين سنوسي (IELTS Lab Oran)`
              : `Fact-checked ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewDateOnly}T00:00:00Z`))} by Amine Senouci (IELTS Lab Oran)`}
      </p>
      <aside className="not-prose my-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-charcoal">{copy[safeLocale].sources}</h2>
        <ul className="mt-4 grid gap-3">
          {sources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#b81428] underline decoration-crimson/30 underline-offset-4 hover:decoration-crimson"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-gray-600">{copy[safeLocale].note}</p>
      </aside>
      <nav aria-label={copy[safeLocale].relatedTitle} className="not-prose mt-8 rounded-3xl border border-gray-200 bg-[#faf9f6] p-6">
        <h2 className="text-base font-extrabold text-charcoal mb-4">{copy[safeLocale].relatedTitle}</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {related.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/articles/${guide.slug}`}
                className="block h-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-bold text-charcoal hover:border-crimson/40 hover:text-[#b81428] transition-colors"
              >
                {guide.title[safeLocale]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
