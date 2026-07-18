import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getFreeResourcesContent, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'Free IELTS Resources in Algeria | IELTS Lab Oran',
    description: 'Discover the best free IELTS practice tests and resources available to candidates in Algeria.',
    alternates: buildAlternates('articles/free-ielts-resources-algeria'),
  };
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getFreeResourcesContent(locale);
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p className="lead text-xl text-gray-600 mb-8 font-medium">
                  {c.lead} <Link href="/" className="text-crimson font-bold hover:underline">{locale === 'ar' ? 'التحضير للايلتس في وهران' : locale === 'fr' ? 'préparation IELTS à Oran' : 'IELTS preparation in Oran'}</Link>.
              </p>
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>
              <p>{c.p1}</p>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
              {/* Visual Infographic: Resource Cards */}
              <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                  {c.bullets.map((b, i) => {
                    const match = b.match(/<strong>(.*?)<\/strong>([\s\S]*)/);
                    const title = match ? match[1] : `Resource ${i+1}`;
                    const text = match ? match[2].replace(/^:\s*/, '') : b;
                    return (
                      <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors z-0"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                            <h3 className="font-bold text-charcoal text-lg leading-tight" dangerouslySetInnerHTML={{ __html: title }} />
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                        </div>
                      </div>
                    );
                  })}
              </div>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_3}</h2>
              <p>{c.p2}</p>
          
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-crimson/10 pointer-events-none"></div>
                  <div className="relative z-10 md:w-2/3">
                      <h3 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h3>
                      <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
                  </div>
                  <div className="relative z-10 md:w-1/3 w-full flex flex-col gap-3 items-end">
                      <Link href="/#intake" className="w-full md:w-auto text-center inline-flex justify-center items-center gap-2 bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-crimson transition-colors shadow-soft">
                          {c.ctaBtn} <span aria-hidden="true">&rarr;</span>
                      </Link>
                  </div>
              </div>
          </div>
      </article>
      
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
