import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getArticlesListContent, ArticleLocale } from '@/lib/articleContent';

export const metadata = {
  title: 'IELTS Visa & Test Articles | IELTS Lab Oran',
  description: 'Guides and resources for IELTS test takers in Algeria. Visa language requirements, test comparisons, and registration help.',
};

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={article.href as any}
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
      
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center">
        <div>
            <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
            <div className="text-xs text-crimson font-semibold">25,000 DA</div>
        </div>
        <Link href="/#intake" className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform">
            APPLY NOW
        </Link>
      </div>
    </>
  );
}
