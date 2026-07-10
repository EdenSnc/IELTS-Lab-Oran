import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getIeltsVsToeflContent, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'IELTS vs TOEFL vs TCF for Canada | IELTS Lab Oran',
    description: 'A comprehensive guide comparing IELTS, TOEFL, and TCF for Canadian immigration and Express Entry for Algerian applicants.',
    alternates: buildAlternates('articles/ielts-vs-toefl-canada'),
  };
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getIeltsVsToeflContent(locale);
  const isRtl = locale === 'ar';

  const clbLabel = locale === 'ar' ? '🎯 لتحقيق CLB 9 في الايلتس، تحتاج تحديداً إلى:' : locale === 'fr' ? '🎯 Pour atteindre CLB 9 à l\'IELTS, vous avez besoin exactement de :' : '🎯 To achieve CLB 9 on the IELTS, you need exactly:';
  const clbScores = 'Listening: 8.0 | Reading: 7.0 | Writing: 7.0 | Speaking: 7.0';

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="bg-white border-l-4 border-crimson p-6 rounded-r-2xl shadow-sm mb-10">
              <p className="text-charcoal font-bold text-lg mb-2">{c.keyTakeawayTitle}</p>
              <p className="text-gray-600 m-0" dangerouslySetInnerHTML={{ __html: c.keyTakeawayText }} />
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p>{c.intro}</p>
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
                {locale === 'ar' ? 'الدخول السريع ومستويات CLB' : locale === 'fr' ? 'Entrée Express et Niveaux CLB' : 'Express Entry and CLB Levels'}
              </h2>
              <p>
                {locale === 'ar' ? 'لبرامج الهجرة الكندية (الدخول السريع)، تُحوَّل درجاتك في اختبارات اللغة إلى مستويات معيار اللغة الكندي (CLB). النظام يتعامل مع اللغتين الإنجليزية والفرنسية بالتساوي، لكن الاختبارات المقبولة محددة بدقة.' : locale === 'fr' ? 'Pour l\'immigration canadienne (programme Entrée Express), vos scores sont convertis en niveaux CLB (Canadian Language Benchmark). Le système traite l\'anglais et le français à égalité, mais les tests acceptés sont strictement réglementés.' : 'For Canadian immigration (Express Entry program), your language test scores are converted into Canadian Language Benchmark (CLB) levels. The system treats English and French equally, but the tests accepted are strictly regulated.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10 not-prose">
                  <div className="bg-charcoal text-white rounded-3xl p-8 relative overflow-hidden">
                      <h3 className="text-xl font-bold text-crimson mb-4 relative z-10">
                        {locale === 'ar' ? 'الإنجليزية: التدريب العام للايلتس' : locale === 'fr' ? 'Anglais : IELTS General' : 'English: IELTS General'}
                      </h3>
                      <p className="text-gray-300 text-sm mb-4 relative z-10">
                        {locale === 'ar' ? 'المعيار الذهبي للدخول السريع. يختبر اللغة الإنجليزية في السياق اليومي بدلاً من الكتابة الأكاديمية.' : locale === 'fr' ? 'La référence absolue pour l\'Entrée Express. Il teste l\'anglais dans un contexte quotidien plutôt qu\'académique.' : 'The absolute gold standard for Express Entry. It tests everyday English context rather than academic writing.'}
                      </p>
                      <ul className="text-sm text-gray-100 space-y-2 relative z-10">
                          <li className="flex items-center gap-2"><span className="text-crimson font-bold">✓</span>{locale === 'ar' ? 'مقبول على نطاق واسع للإقامة الدائمة' : locale === 'fr' ? 'Largement accepté pour la RP' : 'Widely accepted for PR'}</li>
                          <li className="flex items-center gap-2"><span className="text-crimson font-bold">✓</span>{locale === 'ar' ? 'نتائج سريعة على الكمبيوتر' : locale === 'fr' ? 'Résultats rapides sur ordinateur' : 'Fast computer-based results'}</li>
                          <li className="flex items-center gap-2"><span className="text-crimson font-bold">✓</span>{locale === 'ar' ? 'نظام تنقيط واضح' : locale === 'fr' ? 'Système de notation clair' : 'Clear scoring system'}</li>
                      </ul>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                      <h3 className="text-xl font-bold text-charcoal mb-4">
                        {locale === 'ar' ? 'الفرنسية: TCF Canada' : locale === 'fr' ? 'Français : TCF Canada' : 'French: TCF Canada'}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {locale === 'ar' ? 'مصمم خصيصاً من وزارة التعليم الفرنسية ليتوافق مع معايير الهجرة الكندية.' : locale === 'fr' ? 'Conçu par le Ministère français de l\'Éducation pour s\'aligner aux normes d\'immigration canadienne.' : 'Specifically designed by the French Ministry of Education to align with Canadian immigration standards.'}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2">
                          <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span>{locale === 'ar' ? 'مثالي للمشتركين ثنائيي اللغة' : locale === 'fr' ? 'Parfait pour les profils bilingues' : 'Perfect for bilingual profiles'}</li>
                          <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span>{locale === 'ar' ? 'دفعة كبيرة لدرجات CRS' : locale === 'fr' ? 'Enorme boost de points CRS' : 'Huge CRS points boost'}</li>
                          <li className="flex items-center gap-2"><span className="text-red-500 font-bold">×</span>{locale === 'ar' ? 'تواريخ اختبار أقل' : locale === 'fr' ? 'Moins de dates disponibles' : 'Fewer test dates available'}</li>
                      </ul>
                  </div>
              </div>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
                {locale === 'ar' ? 'القاعدة الذهبية لـ CLB 9' : locale === 'fr' ? 'La Règle d\'Or du CLB 9' : 'The "CLB 9" Golden Rule'}
              </h2>
              <p>
                {locale === 'ar' ? 'إذا كنت تتقدم للدخول السريع باللغة الإنجليزية كلغتك الأساسية، فهدفك هو CLB 9. الوصول إلى CLB 9 يُحدث قفزة هائلة في درجة نظام التصنيف الشامل (CRS) (في الغالب نقاط إضافية 50)، وهو ما يُحدد الفارق بين الحصول على دعوة للتقديم والبقاء في قائمة الانتظار.' : locale === 'fr' ? 'Si vous postulez à l\'Entrée Express avec l\'anglais comme langue principale, votre objectif est CLB 9. Atteindre CLB 9 déclenche un énorme gain dans votre score CRS (souvent 50 points supplémentaires), ce qui fait généralement la différence entre obtenir une ITA et rester dans le bassin.' : 'If you are applying for Express Entry with English as your primary language, your goal is CLB 9. Reaching CLB 9 triggers a massive jump in your Comprehensive Ranking System (CRS) score (often an extra 50 points), which is usually the difference between getting an ITA (Invitation to Apply) and being stuck in the pool.'}
              </p>
              
              <p className="bg-gray-100 p-4 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium">
                {clbLabel}<br/>{clbScores}
              </p>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-crimson/10 pointer-events-none"></div>
                  <div className="relative z-10 md:w-2/3">
                      <h3 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h3>
                      <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
                  </div>
                  <div className="relative z-10 md:w-1/3 w-full flex justify-end">
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
            <div className="text-xs text-crimson font-semibold">32,000 DA</div>
        </div>
        <Link href="/#intake" className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform">
            APPLY NOW
        </Link>
      </div>
    </>
  );
}
