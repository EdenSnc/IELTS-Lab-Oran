import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getArticlesListContent, ArticleLocale } from '@/lib/articleContent';
import type { ComponentProps } from 'react';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import { buildAlternates } from '@/lib/seo';

type ArticleHref = ComponentProps<typeof Link>['href'];

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  const c = getArticlesListContent(locale);
  return {
    title: `${c.pageTitle} | IELTS Lab Oran`,
    description: c.pageSubtitle,
    alternates: buildAlternates(locale, 'articles'),
  };
}

export default async function ArticlesPage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getArticlesListContent(locale);
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      
      <header className={`pt-40 pb-20 px-6 max-w-4xl mx-auto text-center relative z-10 ${isRtl ? 'font-cairo' : ''}`}>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">{c.pageTitle}</h1>
        <p className="text-xl text-gray-500 font-light max-w-2xl mx-auto">{c.pageSubtitle}</p>
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
              <p className="text-gray-500 line-clamp-2">{article.desc}</p>
            </div>
          </Link>
        ))}
      </main>
      
      <ArticleMobileCta />
    </>
  );
}
