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

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: c.pageTitle,
        description: c.pageSubtitle,
        inLanguage: locale,
        primaryImageOfPage: defaultOgImageUrl(),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@id': `${pageUrl}#itemlist` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#itemlist`,
        numberOfItems: c.articles.length,
        itemListElement: c.articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: article.title,
          url: localizedUrl(locale, article.href.replace(/^\//, '')),
        })),
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
      
      <header className={`pt-40 pb-20 px-6 max-w-4xl mx-auto text-center relative z-10 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">{c.pageTitle}</h1>
        <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">{c.pageSubtitle}</p>
      </header>

      <main className={`px-6 pb-32 max-w-4xl mx-auto grid gap-8 relative z-10 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        {c.articles.map((article) => (
          <Link
            key={article.href}
            href={article.href as ArticleHref}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row gap-6 items-center"
          >
            <div className="md:w-full">
              <div className="text-crimson font-bold text-xs tracking-widest uppercase mb-2">{article.category}</div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-crimson transition-colors">{article.title}</h2>
              <p className="text-gray-600 line-clamp-2">{article.desc}</p>
            </div>
          </Link>
        ))}
      </main>
      
      <ArticleMobileCta />
    </>
  );
}
