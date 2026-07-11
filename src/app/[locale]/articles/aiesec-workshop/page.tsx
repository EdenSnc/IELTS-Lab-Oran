import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'IELTS Preparation Workshop with AIESEC | IELTS Lab Oran',
    description: 'Join our exclusive IELTS Preparation Workshop in collaboration with AIESEC on July 17th.',
    alternates: buildAlternates('articles/aiesec-workshop'),
  };
}

export default async function AiesecWorkshopPage() {
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  const t = {
    title: locale === 'ar' ? 'ورشة تحضير الايلتس بالتعاون مع AIESEC' : locale === 'fr' ? 'Atelier de Préparation IELTS en collaboration avec AIESEC' : 'IELTS Preparation Workshop in collaboration with AIESEC',
    date: locale === 'ar' ? '17 يوليو 2026' : locale === 'fr' ? '17 Juillet 2026' : 'July 17th, 2026',
    description: locale === 'ar' 
      ? 'يسعدنا الإعلان عن ورشة عمل حصرية بالتعاون مع AIESEC. تم تصميم هذه الجلسة المكثفة لمساعدتك على فهم هيكل الاختبار، وتجنب الأخطاء الشائعة، ووضع استراتيجية واضحة لتحقيق أهدافك في الايلتس.'
      : locale === 'fr'
      ? 'Nous sommes ravis d\'annoncer un atelier exclusif en collaboration avec AIESEC. Cette session intensive est conçue pour vous aider à comprendre la structure du test, à éviter les erreurs courantes et à élaborer une stratégie claire pour atteindre vos objectifs IELTS.'
      : 'We are thrilled to announce an exclusive workshop in collaboration with AIESEC. This intensive session is designed to help you understand the test structure, avoid common pitfalls, and build a clear strategy to achieve your target band score.',
    whatToExpect: locale === 'ar' ? 'ماذا تتوقع' : locale === 'fr' ? 'À quoi s\'attendre' : 'What to Expect',
    bullets: [
      locale === 'ar' ? '<strong>تحليل هيكل الاختبار:</strong> انهيار كامل لكل قسم.' : locale === 'fr' ? '<strong>Analyse de la structure :</strong> Décomposition complète de chaque section.' : '<strong>Test Structure Breakdown:</strong> Complete teardown of each section.',
      locale === 'ar' ? '<strong>استراتيجيات الإجابة:</strong> كيف تتعامل مع أنواع الأسئلة الصعبة.' : locale === 'fr' ? '<strong>Stratégies de réponse :</strong> Comment aborder les types de questions difficiles.' : '<strong>Answering Strategies:</strong> How to tackle difficult question types.',
      locale === 'ar' ? '<strong>جلسة أسئلة وأجوبة:</strong> إجابات مباشرة على استفساراتك.' : locale === 'fr' ? '<strong>Session Q&R :</strong> Réponses directes à vos questions.' : '<strong>Q&A Session:</strong> Direct answers to all your inquiries.'
    ],
    ctaTitle: locale === 'ar' ? 'هل أنت مستعد للحضور؟' : locale === 'fr' ? 'Prêt à participer ?' : 'Ready to attend?',
    ctaDesc: locale === 'ar' ? 'احجز مقعدك الآن وتعرف على كيفية التحضير بذكاء.' : locale === 'fr' ? 'Réservez votre place dès maintenant et apprenez à vous préparer intelligemment.' : 'Secure your spot now and learn how to prepare smartly.',
    ctaBtn: locale === 'ar' ? 'سجل الآن' : locale === 'fr' ? 'Inscrivez-vous' : 'Register Now'
  };

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="mb-6 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            AIESEC Event
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-charcoal">{t.title}</h1>
          
          <div className="flex items-center gap-2 text-gray-500 mb-10 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            {t.date}
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p className="lead text-xl text-gray-600 mb-8 font-medium">{t.description}</p>
              
              <h2 className="text-2xl font-extrabold mt-12 mb-6 text-charcoal tracking-tight">{t.whatToExpect}</h2>
              
              <div className="grid md:grid-cols-1 gap-4 my-8 not-prose">
                {t.bullets.map((b, i) => {
                  const match = b.match(/<strong>(.*?)<\/strong>([\s\S]*)/);
                  const title = match ? match[1] : `Point ${i+1}`;
                  const text = match ? match[2].replace(/^:\s*/, '') : b;
                  
                  return (
                    <div key={i} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {i + 1}
                        </div>
                        <h3 className="font-bold text-charcoal text-lg" dangerouslySetInnerHTML={{ __html: title }} />
                      </div>
                      <p className="text-gray-600 text-sm ml-11" dangerouslySetInnerHTML={{ __html: text }} />
                    </div>
                  );
                })}
              </div>
          

          </div>
      </article>
      

    </>
  );
}
