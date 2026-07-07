import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getSpeakingAnxietyContent, ArticleLocale } from '@/lib/articleContent';

export const metadata = {
  title: 'Overcoming IELTS Speaking Anxiety | IELTS Lab Oran',
  description: 'A tactical guide for Algerian candidates to overcome nervousness and perform confidently in the IELTS Speaking test.',
};

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getSpeakingAnxietyContent(locale);
  const isRtl = locale === 'ar';

  const sections = [
    {
      title: locale === 'ar' ? 'أدرك أنه اختبار للتواصل لا للكمال' : locale === 'fr' ? 'Reconnaître que c\'est un test de communication, pas de perfection' : 'Acknowledge That It Is a Test of Communication, Not Perfection',
      body: locale === 'ar' ? 'يتجمد كثير من المرشحين لأنهم يبحثون عن الكلمة المتقدمة "المثالية". المحكم يُفضّل إجابة طلاقة بسيطة نسبياً على إجابة متقدمة مليئة بالوقفات الطويلة والتعثر. الطلاقة والتماسك يمثلان 25% من درجتك.' : locale === 'fr' ? "Beaucoup de candidats se figent parce qu'ils cherchent dans leur mémoire le mot de vocabulaire avancé «parfait». L'examinateur préfère une réponse fluide, légèrement simple, à une réponse très avancée pleine de longues pauses et de bégaiements. La fluidité et la cohérence représentent 25% de votre score." : 'Many candidates freeze because they are searching their brain for the "perfect" advanced vocabulary word. The examiner prefers a fluent, slightly simple response over a highly advanced response full of long pauses and stuttering. Fluency and Coherence account for 25% of your score.',
    },
    {
      title: locale === 'ar' ? 'استراتيجية "دقيقة التحضير" للجزء الثاني' : locale === 'fr' ? 'La Stratégie des «1 Minute de Préparation» en Partie 2' : 'The Part 2 "1-Minute Prep" Strategy',
      body: locale === 'ar' ? 'في الجزء الثاني، لديك دقيقة واحدة للتحضير لمونولوج دقيقتين. لا تكتب جملاً كاملة على ورقة المسودة. اكتب نقاطاً تحتوي على الكلمات المفتاحية والعبارات الانتقالية (مثل: "في البداية"، "علاوة على ذلك"، "في نهاية المطاف"). وجود خريطة هيكلية يمنعك من التيه والتذعر عند فقدان خيط أفكارك.' : locale === 'fr' ? "En Partie 2, vous avez une minute pour préparer un monologue de deux minutes. N'écrivez pas de phrases complètes sur le brouillon. Écrivez des points avec des mots-clés et des phrases de transition (ex. : «Initialement», «De plus», «En fin de compte»). Avoir une carte structurelle vous évite de vous perdre et de paniquer." : 'In Part 2, you have one minute to prepare a two-minute monologue. Do not write full sentences on the scrap paper. Write bullet points containing keywords and transitional phrases (e.g., "Initially," "Furthermore," "Ultimately"). Having a structural map prevents you from rambling and panicking when you lose your train of thought.',
    },
    {
      title: locale === 'ar' ? 'محاكاة الضغط' : locale === 'fr' ? 'Simuler la Pression' : 'Simulate the Pressure',
      body: locale === 'ar' ? 'الطريقة الوحيدة لعلاج قلق الاختبار هي العلاج بالتعرض. التدرب على الكلام أمام المرآة عديم الفائدة لأنه يفتقر إلى الضغط الاجتماعي للمحكم. في مخبرنا المكثف، يخضع المرشحون لمقابلات محادثة وهمية صارمة ومحددة بالوقت تحاكي تماماً توتر الاختبار الحقيقي.' : locale === 'fr' ? "La seule façon de guérir l'anxiété liée aux tests est la thérapie d'exposition. Pratiquer devant un miroir est inutile car cela manque de la pression sociale d'un examinateur. Dans notre laboratoire intensif, les candidats passent des entretiens de speaking chronométrés qui simulent parfaitement la tension de l'examen réel." : 'The only way to cure test anxiety is through exposure therapy. Practicing speaking to a mirror is useless because it lacks the social pressure of an examiner. In our intensive lab, candidates undergo strict, timed mock speaking interviews that perfectly simulate the tension of the real exam, ensuring that by test day, it feels like just another drill.',
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

              {sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
          
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
