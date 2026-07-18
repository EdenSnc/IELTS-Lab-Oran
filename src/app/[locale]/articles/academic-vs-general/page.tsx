import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getAcademicVsGeneralContent, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'IELTS Academic vs General Training | IELTS Lab Oran',
    description: 'Learn the differences between IELTS Academic and General Training to choose the right test for your goals.',
    alternates: buildAlternates('articles/academic-vs-general'),
  };
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getAcademicVsGeneralContent(locale);
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p className="lead text-xl text-gray-600 mb-8 font-medium" dangerouslySetInnerHTML={{ __html: c.lead }} />
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>
              
              <div className="grid md:grid-cols-2 gap-8 my-8 not-prose">
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                      <h3 className="font-extrabold text-charcoal text-xl mb-3 text-blue-900">{c.academicTitle}</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{c.academicDesc}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-6 rounded-2xl shadow-sm">
                      <h3 className="font-extrabold text-charcoal text-xl mb-3 text-green-900">{c.generalTitle}</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{c.generalDesc}</p>
                  </div>
              </div>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
              <p dangerouslySetInnerHTML={{ __html: c.formatIntro }} />
              
              {/* Visual Infographic: Comparison Table */}
              <div className="overflow-x-auto my-10 not-prose rounded-2xl border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-charcoal text-white">
                      <th className="p-4 font-bold border-b border-white/10 w-1/4">
                        {locale === 'ar' ? 'المهارة' : locale === 'fr' ? 'Compétence' : 'Skill'}
                      </th>
                      <th className="p-4 font-bold border-b border-white/10 w-3/8 bg-blue-900/40">IELTS Academic</th>
                      <th className="p-4 font-bold border-b border-white/10 w-3/8 bg-green-900/40">IELTS General Training</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="p-4 border-b border-gray-100 font-bold text-charcoal bg-gray-50">
                        {locale === 'ar' ? 'الاستماع (Listening)' : 'Listening'}
                      </td>
                      <td className="p-4 border-b border-gray-100 text-gray-600 text-sm italic text-center" colSpan={2}>
                        {locale === 'ar' ? 'نفس الاختبار تماماً' : locale === 'fr' ? 'Test exactement identique' : 'Exactly the same test'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 border-b border-gray-100 font-bold text-charcoal bg-gray-50">
                        {locale === 'ar' ? 'المحادثة (Speaking)' : 'Speaking'}
                      </td>
                      <td className="p-4 border-b border-gray-100 text-gray-600 text-sm italic text-center" colSpan={2}>
                        {locale === 'ar' ? 'نفس الاختبار تماماً' : locale === 'fr' ? 'Test exactement identique' : 'Exactly the same test'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 border-b border-gray-100 font-bold text-charcoal bg-gray-50">
                        {locale === 'ar' ? 'القراءة (Reading)' : 'Reading'}
                      </td>
                      <td className="p-4 border-b border-gray-100 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.readingBullets[0].replace('<strong>Academic Reading:</strong>', '') }} />
                      <td className="p-4 border-b border-gray-100 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.readingBullets[1].replace('<strong>General Training Reading:</strong>', '') }} />
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-charcoal bg-gray-50">
                        {locale === 'ar' ? 'الكتابة (Writing)' : 'Writing'}
                      </td>
                      <td className="p-4 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.writingBullets[0].replace('<strong>Academic Writing:</strong><br/>', '') }} />
                      <td className="p-4 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.writingBullets[1].replace('<strong>General Training Writing:</strong><br/>', '') }} />
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_3}</h2>
              <p>{c.scoringText}</p>

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
