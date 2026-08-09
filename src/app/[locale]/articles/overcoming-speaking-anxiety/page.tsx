import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getSpeakingAnxietyContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'overcoming-speaking-anxiety',
    title: articleSeoTitle(locale, 'overcoming-speaking-anxiety'),
    description: articleDescription(locale, 'overcoming-speaking-anxiety'),
  });
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getSpeakingAnxietyContent(locale);
  const isRtl = locale === 'ar';

  const sections = [
    {
      title: locale === 'ar' ? 'أدرك أنه اختبار للتواصل لا للكمال' : locale === 'fr' ? 'Reconnaître que c\'est un test de communication, pas de perfection' : 'Acknowledge That It Is a Test of Communication, Not Perfection',
      body: locale === 'ar' ? 'قد يتوقف المرشح وهو يبحث عن كلمة متقدمة مثالية. أعط الأولوية لإجابة واضحة ومتواصلة، ثم استخدم المفردات الدقيقة التي تتحكم فيها. Fluency and Coherence أحد معايير التقييم الأربعة المتساوية.' : locale === 'fr' ? "Un candidat peut se bloquer en cherchant le mot avancé parfait. Donnez la priorité à une réponse claire et continue, puis utilisez le vocabulaire précis que vous maîtrisez. Fluency and Coherence est l'un des quatre critères de poids égal." : 'Candidates can freeze while searching for a perfect advanced word. Prioritise a clear, continuous response, then use precise vocabulary you control. Fluency and Coherence is one of four equally weighted criteria.',
    },
    {
      title: locale === 'ar' ? 'استراتيجية "دقيقة التحضير" للجزء الثاني' : locale === 'fr' ? 'La Stratégie des «1 Minute de Préparation» en Partie 2' : 'The Part 2 "1-Minute Prep" Strategy',
      body: locale === 'ar' ? 'في الجزء الثاني، لديك دقيقة واحدة للتحضير ثم تتحدث لمدة تصل إلى دقيقتين. لا تكتب جملاً كاملة على ورقة المسودة. اكتب نقاطاً تحتوي على الكلمات المفتاحية والعبارات الانتقالية. وجود خريطة هيكلية يمنعك من التيه والتذعر عند فقدان خيط أفكارك.' : locale === 'fr' ? "En Partie 2, vous avez une minute de préparation, puis vous parlez pendant deux minutes au maximum. N'écrivez pas de phrases complètes sur le brouillon. Notez des mots-clés et des transitions. Cette carte structurelle vous évite de vous perdre si vous perdez le fil." : 'In Part 2, you have one minute to prepare, then you speak for up to two minutes. Do not write full sentences on the scrap paper. Note keywords and transitions. This structural map helps you recover if you lose your train of thought.',
    },
    {
      title: locale === 'ar' ? 'محاكاة الضغط' : locale === 'fr' ? 'Simuler la Pression' : 'Simulate the Pressure',
      body: locale === 'ar' ? 'التكرار المنظم يمكن أن يقلل عدم اليقين. ابدأ بالتسجيل الذاتي، ثم تدرب مع شريك، ثم نفّذ مقابلات تجريبية موقوتة. الهدف ليس محاكاة كل شعور، بل جعل صيغة الأجزاء الثلاثة وطريقة الإجابة مألوفتين.' : locale === 'fr' ? "Une pratique progressive peut réduire l'incertitude : commencez par vous enregistrer, continuez avec un partenaire, puis passez à des entretiens blancs chronométrés. L'objectif n'est pas de reproduire chaque sensation, mais de rendre familiers les trois parties et le rythme." : 'Progressive practice can reduce uncertainty: start with self-recording, continue with a partner, then move to timed mock interviews. The goal is not to reproduce every feeling, but to make the three-part format and response rhythm familiar.',
    },
  ];

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p className="lead text-xl text-gray-600 mb-8 font-medium">
                  {c.lead} <Link href="/" className="text-crimson font-bold hover:underline">{locale === 'ar' ? 'التحضير للايلتس في وهران' : locale === 'fr' ? 'préparation IELTS à Oran' : 'IELTS preparation in Oran'}</Link>.
              </p>

              {/* Visual Infographic: Quick Tips Cards */}
              <div className="space-y-8 my-12 not-prose">
                {sections.map((section, i) => (
                  <div key={i} className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-crimson/5 rounded-full blur-xl group-hover:bg-crimson/10 transition-colors z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-16 h-16 bg-charcoal text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-md transform group-hover:rotate-6 transition-transform">
                        {i + 1}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-charcoal mb-3 leading-tight">{section.title}</h2>
                        <p className="text-gray-600 leading-relaxed m-0">{section.body}</p>
                      </div>
                    </div>
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
          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug="overcoming-speaking-anxiety"
              title={c.title}
              description={articleDescription(locale, 'overcoming-speaking-anxiety')}
              sources={[
                {
                  label: 'IELTS.org: IELTS Speaking test format',
                  href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking',
                },
              ]}
            />
          </div>
      </article>
      
      <ArticleMobileCta />
    </>
  );
}
