import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return {
    title: 'Platform Status Update | IELTS Lab Oran',
    description: 'The IELTS simulation platform is currently in development. Join our offline bootcamp in the meantime.',
    alternates: buildAlternates('articles/simulation-platform'),
  };
}

export default async function PlatformStatusPage() {
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  const t = {
    title: locale === 'ar' ? 'تحديث حالة المنصة' : locale === 'fr' ? 'Mise à jour de l\'état de la plateforme' : 'Platform Status Update',
    date: locale === 'ar' ? '18 يوليو 2026' : locale === 'fr' ? '18 Juillet 2026' : 'July 18th, 2026',
    description: locale === 'ar' 
      ? 'منصة محاكاة الايلتس لا تزال قيد التطوير حاليًا. بينما نضع اللمسات الأخيرة على البرنامج، انضم إلى معسكرنا التدريبي لتعلم الإطار الدقيق للحصول على الدرجة التي تحتاجها.'
      : locale === 'fr'
      ? 'La plateforme de simulation IELTS est actuellement en cours de développement. Pendant que nous finalisons le logiciel, rejoignez notre bootcamp pour apprendre le cadre exact afin d\'obtenir le score dont vous avez besoin.'
      : 'The IELTS simulation platform is currently in development. While we finalize the software, join the offline bootcamp to learn the exact framework to get the score you need.',
    whatToExpect: locale === 'ar' ? 'ما يمكنك القيام به الآن' : locale === 'fr' ? 'Ce que vous pouvez faire maintenant' : 'What You Can Do Now',
    bullets: [
      locale === 'ar' ? '<strong>انضم إلى المعسكر التدريبي:</strong> احصل على تدريب شخصي وتوجيه مباشر.' : locale === 'fr' ? '<strong>Rejoignez le bootcamp :</strong> Bénéficiez d\'une formation en personne et de conseils directs.' : '<strong>Join the Bootcamp:</strong> Get in-person training and direct guidance.',
      locale === 'ar' ? '<strong>تعلم الإطار:</strong> اكتشف الاستراتيجيات الدقيقة لتحقيق هدفك.' : locale === 'fr' ? '<strong>Apprenez le cadre :</strong> Découvrez les stratégies exactes pour atteindre votre score cible.' : '<strong>Learn the Framework:</strong> Discover the exact strategies to achieve your target score.',
      locale === 'ar' ? '<strong>كن على اطلاع:</strong> سنعلمك بمجرد إطلاق المنصة.' : locale === 'fr' ? '<strong>Restez informé :</strong> Nous vous informerons dès le lancement de la plateforme.' : '<strong>Stay Informed:</strong> We will notify you as soon as the platform launches.'
    ],
    ctaTitle: locale === 'ar' ? 'هل أنت مستعد للبدء؟' : locale === 'fr' ? 'Prêt à commencer ?' : 'Ready to start?',
    ctaDesc: locale === 'ar' ? 'احجز مقعدك في المعسكر التدريبي الآن.' : locale === 'fr' ? 'Réservez votre place dans le bootcamp dès maintenant.' : 'Secure your spot in the bootcamp now.',
    ctaBtn: locale === 'ar' ? 'سجل الآن' : locale === 'fr' ? 'Inscrivez-vous' : 'Register Now'
  };

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="mb-6 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Status Update
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
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm">
                          {i + 1}
                        </div>
                        <h3 className="font-bold text-charcoal text-lg" dangerouslySetInnerHTML={{ __html: title }} />
                      </div>
                      <p className="text-gray-600 text-sm ml-11" dangerouslySetInnerHTML={{ __html: text }} />
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-12 bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                <h2 className="text-2xl font-bold text-charcoal mb-4">{t.ctaTitle}</h2>
                <p className="text-gray-600 mb-6">{t.ctaDesc}</p>
                <Link href="/#intake" className="inline-flex items-center gap-2 bg-crimson text-white px-8 py-4 rounded-full font-bold hover:bg-red-800 transition-all shadow-glow hover:-translate-y-1">
                  {t.ctaBtn}
                </Link>
              </div>
          </div>
      </article>
    </>
  );
}
