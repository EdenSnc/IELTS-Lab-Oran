import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getArticlesListContent, ArticleLocale } from '@/lib/articleContent';
import type { ComponentProps } from 'react';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import {
  Locale,
  SITE_NAME,
  SITE_URL,
  buildWebsitePageMetadata,
  defaultOgImageUrl,
  localizedUrl,
} from '@/lib/seo';

type ArticleHref = ComponentProps<typeof Link>['href'];

const GUIDE_BREADCRUMB: Record<Locale, string> = {
  en: 'IELTS Guides',
  fr: 'Guides IELTS',
  ar: 'أدلة IELTS',
};

const HUB_INTRO: Record<Locale, string> = {
  en: 'Every guide below is written and fact-checked in Algeria against primary official sources—covering the 40,000 DA registration fee, computer-delivered exam tools, One Skill Retake rules, European student visas, and Canada Express Entry CLB thresholds.',
  fr: 'Chaque guide ci-dessous est rédigé et vérifié en Algérie à partir des sources officielles : tarif de 40 000 DA, format 100 % sur ordinateur, règles One Skill Retake, visas d’études européens et seuils CLB pour Entrée express Canada.',
  ar: 'تم إعداد ومراجعة جميع الأدلة أدناه خصيصاً للمترشحين في الجزائر بالاعتماد المباشر على المصادر الرسمية المعتمدة: رسوم التسجيل البالغة 40,000 دج، نظام الامتحان المحوسب بالكامل، شروط إعادة مهارة واحدة (One Skill Retake)، متطلبات تأشيرات الدراسة في إيطاليا وبريطانيا وفرنسا، وجداول معادلة نقاط CLB لبرنامج الهجرة الكندي Express Entry.',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = getArticlesListContent(safeLocale);
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: 'articles',
    title: `${c.pageTitle} | ${SITE_NAME}`,
    description: c.pageSubtitle,
  });
}

export default async function ArticlesPage() {
  const rawLocale = await getLocale();
  const locale: Locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const c = getArticlesListContent(locale);
  const isRtl = locale === 'ar';
  const pageUrl = localizedUrl(locale, 'articles');

  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
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
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['en', 'fr', 'ar'],
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: c.pageTitle,
        description: c.pageSubtitle,
        inLanguage: locale,
        primaryImageOfPage: defaultOgImageUrl(),
        isPartOf: { '@id': websiteId },
        mainEntity: { '@id': `${pageUrl}#itemlist` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#itemlist`,
        numberOfItems: c.articles.length,
        itemListElement: c.articles.map((article, index) => {
          const itemUrl = localizedUrl(locale, article.href.replace(/^\//, ''));
          return {
            '@type': 'ListItem',
            position: index + 1,
            name: article.title,
            url: itemUrl,
            item: {
              '@type': 'Article',
              url: itemUrl,
              name: article.title,
            },
          };
        }),
      },
      {
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
            name: GUIDE_BREADCRUMB[locale],
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <main
        id="main-content"
        className={`px-6 pb-24 pt-36 max-w-4xl mx-auto relative z-10 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <nav aria-label="Breadcrumb" className="mb-6 flex justify-center flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <Link href="/" className="hover:text-[#b81428] underline-offset-4 hover:underline">
            {SITE_NAME}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-charcoal">{GUIDE_BREADCRUMB[locale]}</span>
        </nav>

        <header className="pb-14 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">{c.pageTitle}</h1>
          <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">{c.pageSubtitle}</p>
          <p className="mt-4 text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">{HUB_INTRO[locale]}</p>
        </header>

        <div className="grid gap-8">
          {c.articles.map((article) => (
            <Link
              key={article.href}
              href={article.href as ArticleHref}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-200/80 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row gap-6 items-center"
            >
              <div className="md:w-full">
                <div className="text-[#b81428] font-bold text-xs tracking-widest uppercase mb-2">{article.category}</div>
                <h2 className="text-2xl font-bold mb-3 group-hover:text-[#b81428] transition-colors">{article.title}</h2>
                <p className="text-gray-600 line-clamp-2">{article.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <ArticleMobileCta />
    </>
  );
}
