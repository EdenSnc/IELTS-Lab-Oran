import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getTlscontactContent, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'TLScontact & Capago: Language Requirements | IELTS Lab Oran',
    description: 'Learn the exact English language requirements for UK and France student visas when applying through TLScontact or Capago in Algeria.',
    alternates: buildAlternates('articles/tlscontact-capago'),
  };
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getTlscontactContent(locale);
  const isRtl = locale === 'ar';

  const ukSteps = [
    {
      title: locale === 'ar' ? 'احجز UKVI IELTS' : locale === 'fr' ? 'Réserver l\'IELTS UKVI' : 'Book UKVI IELTS',
      desc: locale === 'ar' ? 'اختبار UKVI للايلتس مسجل بالفيديو وله بروتوكولات أمان أكثر صرامة. الصيغة مطابقة للايلتس القياسي، لكنه يُولِّد رقم UKVI فريداً على نموذج تقرير الاختبار (TRF).' : locale === 'fr' ? "L'IELTS UKVI est enregistré en vidéo et soumis à des protocoles de sécurité plus stricts. Le format est identique à l'IELTS standard, mais il génère un numéro UKVI unique sur votre TRF." : 'The UKVI IELTS is recorded on video and has stricter security protocols. The format is identical to the standard IELTS, but it generates a unique UKVI number on your Test Report Form (TRF).',
    },
    {
      title: locale === 'ar' ? 'الرفع على بوابة TLScontact' : locale === 'fr' ? 'Téléverser sur le portail TLScontact' : 'Upload to TLScontact Portal',
      desc: locale === 'ar' ? 'امسح شهادة UKVI للايلتس بدقة عالية. عند حجز موعد بصمات الأصابع، ارفع هذا المسح في فئة "الوثائق التعليمية".' : locale === 'fr' ? "Scannez votre certificat IELTS UKVI en haute résolution. Lors de la prise de rendez-vous biométrique, téléchargez ce scan dans la catégorie «Documents éducatifs»." : 'Scan your UKVI IELTS certificate in high resolution. When you book your biometric appointment, upload this scan in the "Educational Documents" category.',
    },
    {
      title: locale === 'ar' ? 'أحضر الأصل' : locale === 'fr' ? 'Apporter l\'original' : 'Bring the Original',
      desc: locale === 'ar' ? 'أحضر دائماً النسخة المادية الأصلية من TRF إلى موعد بصمات الأصابع. لا تلامِن الشهادة.' : locale === 'fr' ? "Apportez toujours la copie physique originale de votre TRF à votre rendez-vous biométrique. Ne plastifiez pas le certificat." : 'Always bring the original physical copy of your TRF to your biometric appointment in Algiers or Oran. Do not laminate the certificate.',
    },
  ];

  const francePoints = locale === 'ar' ? [
    'أنت معفى عموماً من TCF DAP أو TCF TP.',
    'يجب تقديم <strong>درجة الايلتس الأكاديمي (6.5 كحد أدنى عادةً)</strong>.',
    'على عكس المملكة المتحدة، تقبل فرنسا <strong>الايلتس الأكاديمي القياسي</strong>. لا تحتاج إلى نسخة UKVI.',
  ] : locale === 'fr' ? [
    'Vous êtes généralement dispensé du TCF DAP ou TCF TP.',
    'Vous devez fournir un <strong>score IELTS Academic (généralement 6.5 minimum)</strong>.',
    'Contrairement au Royaume-Uni, la France accepte le <strong>standard Academic IELTS</strong>. Vous n\'avez pas besoin d\'une version UKVI.',
  ] : [
    'You are generally exempt from the TCF DAP or TCF TP.',
    'You must provide an <strong>Academic IELTS score (usually 6.5 minimum)</strong>.',
    'Unlike the UK, France accepts the <strong>standard Academic IELTS</strong>. You do not need a UKVI version.',
  ];

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="bg-red-50 border-l-4 border-crimson p-6 rounded-r-2xl shadow-sm mb-10">
              <p className="text-crimson font-bold text-lg mb-2">{c.warningTitle}</p>
              <p className="text-gray-700 m-0" dangerouslySetInnerHTML={{ __html: c.warningText }} />
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p>
                {locale === 'ar' ? 'التقدم للحصول على تأشيرة طالب في المملكة المتحدة أو فرنسا يتضمن عمليات بيروقراطية صارمة تديرها وكالات خارجية مثل TLScontact (للمملكة المتحدة) وCapago أو VFS Global (لفرنسا) في الجزائر.' : locale === 'fr' ? 'Postuler pour un visa étudiant au Royaume-Uni ou en France implique des procédures bureaucratiques strictes gérées par des agences externes comme TLScontact (pour le Royaume-Uni) et Capago ou VFS Global (pour la France) en Algérie.' : 'Applying for a student visa in the UK or France involves strict bureaucratic processes managed by external agencies like TLScontact (for the UK) and Capago or VFS Global (for France) in Algeria.'}
              </p>
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
                {locale === 'ar' ? 'تأشيرة الطالب في المملكة المتحدة (Tier 4) عبر TLScontact' : locale === 'fr' ? 'Le Visa Étudiant UK (Tier 4) via TLScontact' : 'The UK Student Visa (Tier 4) via TLScontact'}
              </h2>
              <p>
                {locale === 'ar' ? 'للدراسة على مستوى الدرجة العلمية أو أعلى في المملكة المتحدة، يجب أن تُصدر لك جامعتك خطاب CAS. للحصول على CAS غير مشروط، تحتاج لإثبات كفاءتك اللغوية.' : locale === 'fr' ? "Pour étudier au niveau licence ou supérieur au Royaume-Uni, votre université doit vous délivrer un CAS. Pour obtenir un CAS inconditionnel, vous devez prouver votre niveau de langue." : 'To study at a degree level or above in the UK, your university must issue you a CAS (Confirmation of Acceptance for Studies). To get an unconditional CAS, you need to prove your English proficiency.'}
              </p>

              <div className="space-y-4 my-10 not-prose">
                  {ukSteps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <div className="w-10 h-10 bg-charcoal text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">{i + 1}</div>
                        <div>
                            <h4 className="font-bold text-charcoal text-lg mb-1">{step.title}</h4>
                            <p className="text-sm text-gray-600">{step.desc}</p>
                        </div>
                    </div>
                  ))}
              </div>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
                {locale === 'ar' ? 'فرنسا: Campus France وCapago' : locale === 'fr' ? 'France : Campus France & Capago' : 'France Campus France & Capago'}
              </h2>
              <ul className="list-disc pl-5 my-4 space-y-2">
                  {francePoints.map((p, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: p }} />
                  ))}
              </ul>

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
