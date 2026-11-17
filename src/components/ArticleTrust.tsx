import { Link } from '@/i18n/routing';
import {
  CONTENT_REVIEW_DATE,
  Locale,
  SITE_NAME,
  SITE_URL,
  defaultOgImageUrl,
  localizedUrl,
} from '@/lib/seo';

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

const GUIDE_POOL: Array<{
  slug: string;
  title: Record<Locale, string>;
}> = [
  {
    slug: 'how-to-register-algeria',
    title: {
      en: 'How to Register & Pay for IELTS in Algeria (2026)',
      fr: 'Inscription et paiement IELTS en Algérie (2026)',
      ar: 'التسجيل ودفع رسوم IELTS في الجزائر (2026)',
    },
  },
  {
    slug: 'computer-vs-paper-ielts',
    title: {
      en: 'IELTS on Computer in Algeria (Since April 2026)',
      fr: 'IELTS sur ordinateur en Algérie (depuis avril 2026)',
      ar: 'IELTS على الكمبيوتر في الجزائر (منذ أبريل 2026)',
    },
  },
  {
    slug: 'free-ielts-resources-algeria',
    title: {
      en: 'Free IELTS Resources & Mock Tests in Algeria',
      fr: 'Ressources et tests blancs IELTS gratuits en Algérie',
      ar: 'مصادر ونماذج IELTS المجانية في الجزائر',
    },
  },
  {
    slug: 'ielts-one-skill-retake-algeria',
    title: {
      en: 'IELTS One Skill Retake in Algeria (25,000 DA)',
      fr: 'One Skill Retake IELTS en Algérie (25 000 DA)',
      ar: 'إعادة مهارة واحدة One Skill Retake في الجزائر',
    },
  },
  {
    slug: 'academic-vs-general',
    title: {
      en: 'IELTS Academic vs General Training',
      fr: 'IELTS Academic vs General Training',
      ar: 'الفرق بين Academic وGeneral Training',
    },
  },
  {
    slug: 'ielts-vs-toefl-canada',
    title: {
      en: 'IELTS General Training for Canada Express Entry',
      fr: 'IELTS pour Entrée express Canada & NCLC/CLB',
      ar: 'IELTS للهجرة إلى كندا وحساب CLB',
    },
  },
  {
    slug: 'italy-student-visa-english-tests-algeria',
    title: {
      en: 'Italy Student Visa English Tests from Algeria',
      fr: 'Visa d’études Italie : tests d’anglais en Algérie',
      ar: 'تأشيرة إيطاليا واختبارات الإنجليزية للجزائريين',
    },
  },
  {
    slug: 'tlscontact-capago',
    title: {
      en: 'UK & France Visa Language Rules for Algeria',
      fr: 'Visas UK & France : règles de langue depuis l’Algérie',
      ar: 'قواعد اللغة لتأشيرات بريطانيا وفرنسا من الجزائر',
    },
  },
  {
    slug: 'overcoming-speaking-anxiety',
    title: {
      en: 'Overcoming IELTS Speaking Anxiety',
      fr: 'Gérer le stress au Speaking IELTS',
      ar: 'التغلب على قلق محادثة IELTS Speaking',
    },
  },
  {
    slug: 'writing-task-2-tactics',
    title: {
      en: 'IELTS Writing Task 2 Planning Method',
      fr: 'Méthode IELTS Writing Task 2',
      ar: 'منهجية التخطيط في IELTS Writing Task 2',
    },
  },
];

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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: defaultOgImageUrl(),
    datePublished: publishedAt,
    dateModified: reviewedAt,
    inLanguage: safeLocale,
    mainEntityOfPage: articleUrl,
    author: {
      '@type': 'Person',
      name: 'Amine Senouci',
      alternateName: 'Mr. Senouci',
      url: localizedUrl(safeLocale),
    },
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: localizedUrl(safeLocale),
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
      <nav aria-label={copy[safeLocale].breadcrumbAria} className="not-prose mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
        <Link href="/" className="hover:text-crimson underline-offset-4 hover:underline">
          {SITE_NAME}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/articles" className="hover:text-crimson underline-offset-4 hover:underline">
          {copy[safeLocale].breadcrumbGuides}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-charcoal line-clamp-1">{title}</span>
      </nav>
      <p className="mt-2 mb-8 text-sm text-gray-600">
        {reviewedAt === CONTENT_REVIEW_DATE
          ? copy[safeLocale].reviewed
          : safeLocale === 'fr'
            ? `Vérifié le ${new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewedAt}T00:00:00Z`))} par Amine Senouci (IELTS Lab Oran)`
            : safeLocale === 'ar'
              ? `تم التحقق في ${new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewedAt}T00:00:00Z`))} بواسطة أمين سنوسي (IELTS Lab Oran)`
              : `Fact-checked ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${reviewedAt}T00:00:00Z`))} by Amine Senouci (IELTS Lab Oran)`}
      </p>
      <aside className="not-prose my-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-charcoal">{copy[safeLocale].sources}</h2>
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
        <p className="mt-4 text-xs leading-relaxed text-gray-600">{copy[safeLocale].note}</p>
      </aside>
      <nav aria-label={copy[safeLocale].relatedTitle} className="not-prose mt-8 rounded-3xl border border-gray-200 bg-[#faf9f6] p-6">
        <h2 className="text-base font-extrabold text-charcoal mb-4">{copy[safeLocale].relatedTitle}</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {related.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/articles/${guide.slug}`}
                className="block h-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-bold text-charcoal hover:border-crimson/40 hover:text-crimson transition-colors"
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
