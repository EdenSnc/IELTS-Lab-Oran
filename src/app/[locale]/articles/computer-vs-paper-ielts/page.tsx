import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getComputerVsPaperContent, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'Computer-Based vs. Paper-Based IELTS | IELTS Lab Oran',
    description: 'Understand the crucial differences between taking the IELTS on a computer versus on paper, and why computer-delivered is better.',
    alternates: buildAlternates('articles/computer-vs-paper-ielts'),
  };
}


export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getComputerVsPaperContent(locale);
  const isRtl = locale === 'ar';

  const faqItems = [
    { q: locale === 'ar' ? 'كيف أحصل على 8.5 في الايلتس؟' : locale === 'fr' ? 'Comment obtenir 8.5 à l\'IELTS ?' : '1. How can I get an 8.5 in IELTS?', a: locale === 'ar' ? 'يتطلب تحقيق 8.5 ممارسة مستمرة وإتقاناً للغة الإنجليزية. ركز على تعزيز مفرداتك وقواعدك، وتمرن بانتظام على المهارات الأربع، وتعرّف كلياً على صيغة الاختبار الرقمي.' : locale === 'fr' ? 'Obtenir un 8.5 nécessite une pratique constante et une maîtrise de la langue anglaise. Concentrez-vous sur l\'enrichissement de votre vocabulaire et votre grammaire, pratiquez les quatre compétences régulièrement, et familiarisez-vous totalement avec le format numérique.' : 'Achieving a band score of 8.5 requires consistent practice and mastery of the English language. Focus on enhancing your vocabulary and grammar, practicing all four skills regularly, and familiarising yourself entirely with the digital test format.' },
    { q: locale === 'ar' ? 'هل الحصول على 7.0 في الايلتس سهل؟' : locale === 'fr' ? 'Est-il facile d\'obtenir 7.0 à l\'IELTS ?' : '2. Is scoring an IELTS 7.0 easy?', a: locale === 'ar' ? 'تحقيق 7.0 ممكن مع التحضير الجيد. يتطلب فهماً قوياً للغة الإنجليزية والقدرة على استخدامها فعلياً في سياقات متنوعة. إجراء اختبارات وهمية في ظروف واقعية أمر بالغ الأهمية.' : locale === 'fr' ? 'Un 7.0 est réalisable avec une bonne préparation. Cela nécessite une solide compréhension de l\'anglais et la capacité à l\'utiliser efficacement dans des contextes variés. Les tests blancs sous conditions réalistes sont essentiels.' : 'Scoring a 7.0 is highly achievable with proper preparation. It requires a strong understanding of the English language and the ability to use it effectively in various contexts. Taking mock tests under realistic PC conditions is crucial.' },
    { q: locale === 'ar' ? 'كيف أتدرب للاختبار على الكمبيوتر؟' : locale === 'fr' ? 'Comment pratiquer pour le test sur ordinateur ?' : '3. How do I practice for the IELTS on Computer test?', a: locale === 'ar' ? 'استخدم الاختبارات الوهمية الرسمية للايلتس المصممة خصيصاً للنسخة الرقمية، أو تدرب في مخبرنا الرقمي المتخصص في وهران الذي يحاكي بيئة الاختبار الرسمية تماماً.' : locale === 'fr' ? 'Utilisez les tests blancs officiels conçus pour le format numérique, ou entraînez-vous dans notre laboratoire numérique dédié à Oran qui reproduit parfaitement l\'environnement officiel.' : 'Use the official IELTS mock tests specifically designed for the computer format. Alternatively, train in our dedicated digital lab in Oran, which perfectly replicates the official testing environment.' },
    { q: locale === 'ar' ? 'هل الأسئلة أصعب على الكمبيوتر؟' : locale === 'fr' ? 'Les questions sont-elles plus difficiles sur ordinateur ?' : '4. Are the questions harder on the computer test?', a: locale === 'ar' ? 'لا. محتوى الاختبار ومدته وهيكله متطابقة تماماً سواء على الورق أو الكمبيوتر. الذي يتغير هو طريقة التقديم فحسب.' : locale === 'fr' ? 'Non. Le contenu du test, la durée et la structure sont exactement les mêmes sur papier ou sur ordinateur. Seule la méthode de passation change.' : 'No. The test content, timing, and structure are exactly the same whether you take it on paper or computer. Only the delivery method changes.' },
    { q: locale === 'ar' ? 'هل أحتاج إلى إحضار حاسوبي الخاص؟' : locale === 'fr' ? 'Dois-je apporter mon propre ordinateur ?' : '5. Do I need to bring my own laptop?', a: locale === 'ar' ? 'لا. مركز الاختبار الرسمي يوفر جميع الأجهزة اللازمة، بما في ذلك سماعات عالية الجودة لقسم الاستماع.' : locale === 'fr' ? 'Non. Le centre officiel fournit tout le matériel nécessaire, y compris des casques haute qualité pour l\'écoute.' : 'No. The official test center provides all necessary hardware, including high-quality headphones for the listening section.' },
  ];

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <div className="bg-red-50 border-l-4 border-crimson p-6 rounded-r-2xl shadow-sm mb-10">
                  <p className="text-crimson font-bold text-lg mb-2">{c.alertTitle}</p>
                  <p className="text-gray-700 m-0" dangerouslySetInnerHTML={{ __html: c.alertText }} />
              </div>

              <p className="lead text-xl text-gray-600 mb-8 font-medium">{c.lead}</p>
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>
              <ul className="list-disc pl-5 my-6 space-y-4">
                  {c.bullets.map((b, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
                  ))}
              </ul>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
              
              <div className="space-y-6 my-8 not-prose">
                  {faqItems.map((item, i) => (
                    <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                        <h4 className="font-bold text-charcoal text-lg mb-2">{item.q}</h4>
                        <p className="text-gray-600 text-sm">{item.a}</p>
                    </div>
                  ))}
              </div>
          
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
            <div className="text-xs text-crimson font-semibold">32,000 DA</div>
        </div>
        <Link href="/#intake" className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform">
            APPLY NOW
        </Link>
      </div>
    </>
  );
}
