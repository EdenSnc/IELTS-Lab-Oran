import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getFreeResourcesContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'free-ielts-resources-algeria',
    title: articleSeoTitle(locale, 'free-ielts-resources-algeria'),
    description: articleDescription(locale, 'free-ielts-resources-algeria'),
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-18',
  });
}

const READY_COPY: Record<
  ArticleLocale,
  {
    summaryTitle: string;
    summaryText: string;
    heading: string;
    body: string;
    freeLabel: string;
    freeDesc: string;
    premiumLabel: string;
    premiumDesc: string;
    sampleTitle: string;
    sampleDesc: string;
    sampleBtn: string;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
  }
> = {
  en: {
    summaryTitle: 'Quick Answer — Best Free IELTS Resources in Algeria',
    summaryText:
      'For Algeria’s computer-delivered IELTS, combine three verified free sources—British Council IELTS Ready Member, IELTS.org official sample tasks, and IDP’s online computer familiarisation tests—plus our free 5-question computer Reading sample (/sample). Avoid relying solely on printed PDF handouts, which fail to train split-screen reading and typing speed.',
    heading: 'IELTS Ready Member vs. IELTS Ready Premium',
    body: 'British Council candidates in Algeria often search for IELTS Ready Premium. You do not need to pay extra for Premium access before booking:',
    freeLabel: 'IELTS Ready Member (Free account)',
    freeDesc: 'Available after registering on the British Council Take IELTS portal without paying yet. Includes sample computer questions and tips.',
    premiumLabel: 'IELTS Ready Premium (Unlocked after booking)',
    premiumDesc: 'Unlocks automatically once you book and pay your test fee (40,000 DA) with British Council Algeria—no separate subscription exists.',
    sampleTitle: 'Try a Free Computer IELTS Reading Sample Now',
    sampleDesc: 'Practise split-screen reading, highlights, notes, and countdown timing before investing 40,000 DA.',
    sampleBtn: 'Start free Reading sample',
    faqTitle: 'Frequently Asked Questions — Free IELTS Prep in Algeria',
    faqs: [
      {
        q: 'Is IELTS Ready Premium free in Algeria?',
        a: 'IELTS Ready Member is free for anyone who creates a British Council Take IELTS account, while IELTS Ready Premium unlocks automatically at no extra charge once you book and pay for your official 40,000 DA test.',
      },
      {
        q: 'Are Cambridge IELTS books still useful for computer IELTS?',
        a: 'Yes for authentic question logic and vocabulary, provided you practise typing your Writing essays and supplement books with real split-screen computer simulations so exam-day navigation feels natural.',
      },
      {
        q: 'Where can I test the computer IELTS Reading screen without creating an account?',
        a: 'You can launch IELTS Lab Oran’s free 5-question, 10-minute Academic Reading sample directly at /sample?locale=en in your browser with highlighting and timer tools.',
      },
      {
        q: 'Why can’t free answer keys grade my IELTS Writing or Speaking?',
        a: 'Objective Reading and Listening keys check right-or-wrong answers, whereas Writing and Speaking depend on four analytical examiner rubrics (Task Response, Coherence, Lexical Resource, and Grammar/Pronunciation) that require calibrated human or diagnostic review.',
      },
    ],
  },
  fr: {
    summaryTitle: 'Réponse rapide — Meilleures ressources IELTS gratuites en Algérie',
    summaryText:
      'Pour préparer l’IELTS sur ordinateur en Algérie gratuitement, combinez trois sources officielles — British Council IELTS Ready Member, les sujets IELTS.org et les tests de familiarisation sur PC d’IDP — ainsi que notre échantillon Reading gratuit de 5 questions (/sample). Évitez de travailler uniquement sur des PDF imprimés.',
    heading: 'IELTS Ready Member vs IELTS Ready Premium',
    body: 'De nombreux candidats en Algérie recherchent IELTS Ready Premium. Voici comment fonctionne réellement cet accès :',
    freeLabel: 'IELTS Ready Member (Gratuit sans réservation)',
    freeDesc: 'Accessible gratuitement avec un compte sur le portail Take IELTS du British Council : exercices de découverte et fiches conseils.',
    premiumLabel: 'IELTS Ready Premium (Débloqué après inscription)',
    premiumDesc: 'S’active automatiquement après le paiement de votre examen (40 000 DA) auprès du British Council Algérie : il n’existe pas d’abonnement séparé.',
    sampleTitle: 'Tester gratuitement notre simulation Reading sur PC',
    sampleDesc: 'Entraînez-vous avec l’écran partagé, le surlignage, la prise de notes et le chronomètre officiel avant votre inscription.',
    sampleBtn: 'Lancer l’échantillon gratuit',
    faqTitle: 'Questions fréquentes — Ressources IELTS gratuites',
    faqs: [
      {
        q: 'Comment obtenir IELTS Ready Premium gratuitement en Algérie ?',
        a: 'Le niveau IELTS Ready Member est gratuit sur simple inscription, tandis qu’IELTS Ready Premium se débloque automatiquement dès la confirmation du paiement de votre examen officiel (40 000 DA) auprès du British Council Algérie.',
      },
      {
        q: 'Les livres Cambridge IELTS restent-ils utiles pour le test sur ordinateur ?',
        a: 'Oui pour la logique des questions, mais il est indispensable de rédiger vos essais au clavier et de pratiquer la lecture en écran partagé pour ne pas perdre de temps le jour J.',
      },
      {
        q: 'Où tester gratuitement l’interface IELTS sur ordinateur sans compte ?',
        a: 'Vous pouvez ouvrir immédiatement notre extrait Academic Reading gratuit de 5 questions sur /sample?locale=fr avec chronomètre et outil de surlignage.',
      },
      {
        q: 'Pourquoi les corrigés gratuits ne suffisent-ils pas en Writing et Speaking ?',
        a: 'Contrairement au Listening et au Reading, l’écriture et l’oral sont évalués selon quatre critères analytiques officiels qui nécessitent un retour calibré pour identifier vos erreurs récurrentes.',
      },
    ],
  },
  ar: {
    summaryTitle: 'إجابة سريعة — أفضل مصادر تحضير IELTS المجانية في الجزائر',
    summaryText:
      'للتحضير المجاني لاختبار IELTS على الكمبيوتر في الجزائر، اعتمد على ثلاث منصات رسمية: حساب IELTS Ready Member لدى المجلس البريطاني، ونماذج IELTS.org، وتجارب واجهة الكمبيوتر من IDP، إضافة إلى عينة القراءة التفاعلية المجانية لدينا (/sample). لا تكتفِ بملفات PDF الورقية لأنها لا تدرّبك على الشاشة المقسمة وسرعة الكتابة.',
    heading: 'الفرق بين IELTS Ready المجاني و IELTS Ready Premium',
    body: 'يبحث الكثير من المرشحين في الجزائر عن منصة IELTS Ready Premium؛ إليك كيفية الوصول إليها رسمياً:',
    freeLabel: 'IELTS Ready Member (حساب مجاني)',
    freeDesc: 'متاح مجاناً عند إنشاء حساب على بوابة المجلس الثقافي البريطاني دون الحاجة لدفع رسوم الامتحان بعد، ويوفر نماذج تمهيدية.',
    premiumLabel: 'IELTS Ready Premium (يُفتح بعد حجز الاختبار)',
    premiumDesc: 'يُفتح مجاناً وبشكل تلقائي فور دفع رسوم الامتحان (40,000 دج) مع المجلس الثقافي البريطاني بالجزائر، ولا يباع باشتراك منفصل.',
    sampleTitle: 'جرّب محاكاة القراءة المجانية على الكمبيوتر الآن',
    sampleDesc: 'تدرّب على الشاشة المقسمة والتظليل والمؤقت قبل حجز الامتحان الرسمي.',
    sampleBtn: 'ابدأ عينة القراءة المجانية',
    faqTitle: 'الأسئلة الشائعة حول مصادر IELTS المجانية في الجزائر',
    faqs: [
      {
        q: 'كيف أحصل على حساب IELTS Ready Premium في الجزائر؟',
        a: 'تتوفر نسخة IELTS Ready Member مجاناً بمجرد التسجيل في موقع المجلس الثقافي البريطاني، بينما تُفتح نسخة IELTS Ready Premium تلقائياً فور حجز ودفع رسوم الاختبار الرسمي (40,000 دج).',
      },
      {
        q: 'هل لا تزال كتب كامبريدج مفيدة مع التحول إلى الكمبيوتر؟',
        a: 'نعم من حيث جودة الأسئلة الأكاديمية، بشرط كتابة المقالات على لوحة المفاتيح ودمجها مع محاكاة رقمية للشاشة المقسمة وأدوات التظليل.',
      },
      {
        q: 'أين يمكنني تجربة شاشة اختبار الكمبيوتر مجاناً دون تسجيل حساب؟',
        a: 'يمكنك فتح عينة القراءة الأكاديمية المجانية المكونة من 5 أسئلة مباشرة عبر /sample?locale=ar مع مؤقت العد التنازلي وأداة التظليل.',
      },
      {
        q: 'لماذا لا تكفي مفاتيح الإجابة المجانية لتطوير الكتابة والمحادثة؟',
        a: 'لأن تقييم Writing وSpeaking يعتمد على أربعة معايير رسمية دقيقة تتطلب تشخيصاً متخصصاً لكشف الأخطاء المتكررة في الترابط والقواعد وتلبية المطلوب.',
      },
    ],
  },
};

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getFreeResourcesContent(locale);
  const rc = READY_COPY[locale];
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <main id="main-content" className={`pt-32 pb-24 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <ArticleBreadcrumb locale={locale} title={c.title} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>

          <div className="bg-white border-s-4 border-crimson p-6 rounded-e-2xl shadow-sm mb-8">
            <h2 className="text-charcoal font-bold text-lg mb-2">{rc.summaryTitle}</h2>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed m-0">{rc.summaryText}</p>
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
            <p className="lead text-xl text-gray-600 mb-8 font-medium">
              {c.lead}{' '}
              <Link href="/" className="text-[#b81428] font-bold hover:underline">
                {locale === 'ar' ? 'التحضير للايلتس في وهران' : locale === 'fr' ? 'préparation IELTS à Oran' : 'IELTS preparation in Oran'}
              </Link>
              .
            </p>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>
            <p>{c.p1}</p>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
            <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
              {c.bullets.map((b, i) => {
                const match = b.match(/<strong>(.*?)<\/strong>([\s\S]*)/);
                const title = match ? match[1] : `Resource ${i + 1}`;
                const text = match ? match[2].replace(/^:\s*/, '') : b;
                return (
                  <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors z-0" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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

            <section className="not-prose my-12 rounded-3xl border border-gray-200 bg-[#faf9f6] p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-charcoal mb-3">{rc.heading}</h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-5">{rc.body}</p>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="rounded-2xl bg-white p-5 border border-gray-200">
                  <h3 className="font-bold text-charcoal text-base mb-1">{rc.freeLabel}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed m-0">{rc.freeDesc}</p>
                </div>
                <div className="rounded-2xl bg-white p-5 border border-gray-200">
                  <h3 className="font-bold text-[#b81428] text-base mb-1">{rc.premiumLabel}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed m-0">{rc.premiumDesc}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-crimson/20 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-charcoal text-base">{rc.sampleTitle}</h3>
                  <p className="text-sm text-gray-600 mt-1 m-0">{rc.sampleDesc}</p>
                </div>
                <a
                  href={`/sample?locale=${locale}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#c4162c] px-6 py-3 text-sm font-bold text-white hover:bg-red-800 transition-colors"
                >
                  {rc.sampleBtn}
                </a>
              </div>
            </section>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{rc.faqTitle}</h2>
            <div className="not-prose my-6 space-y-4">
              {rc.faqs.map((item) => (
                <section key={item.q} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-charcoal mb-2">{item.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed m-0">{item.a}</p>
                </section>
              ))}
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-crimson/10 pointer-events-none" />
              <div className="relative z-10 md:w-2/3">
                <h3 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h3>
                <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
              </div>
              <div className="relative z-10 md:w-1/3 w-full flex flex-col gap-3 items-end">
                <Link href="/#intake" className="w-full md:w-auto text-center inline-flex justify-center items-center gap-2 bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-[#c4162c] transition-colors shadow-soft">
                  {c.ctaBtn} <span aria-hidden="true">{isRtl ? '←' : '→'}</span>
                </Link>
              </div>
            </div>
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                inLanguage: locale,
                mainEntity: rc.faqs.map((item) => ({
                  '@type': 'Question',
                  name: item.q,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a,
                  },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />

          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug="free-ielts-resources-algeria"
              title={c.title}
              description={articleDescription(locale, 'free-ielts-resources-algeria')}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label:
                    locale === 'fr'
                      ? 'British Council : préparation IELTS gratuite et IELTS Ready'
                      : locale === 'ar'
                        ? 'المجلس الثقافي البريطاني: تحضير IELTS المجاني ومنصة IELTS Ready'
                        : 'British Council: free IELTS preparation & IELTS Ready',
                  href: 'https://takeielts.britishcouncil.org/prepare',
                },
                {
                  label:
                    locale === 'fr'
                      ? 'IELTS.org : sujets et exemples officiels gratuits'
                      : locale === 'ar'
                        ? 'IELTS.org: نماذج أسئلة الاختبار الرسمية المجانية'
                        : 'IELTS.org: sample test questions',
                  href: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
                },
                {
                  label:
                    locale === 'fr'
                      ? 'IDP IELTS : tests d’entraînement gratuits sur ordinateur'
                      : locale === 'ar'
                        ? 'IDP IELTS: اختبارات تدريبية مجانية بصيغة الكمبيوتر'
                        : 'IDP IELTS: free IELTS on computer practice tests',
                  href: 'https://ielts.idp.com/prepare/ielts-on-computer-practice-tests',
                },
              ]}
            />
          </div>
        </article>
      </main>

      <ArticleMobileCta />
    </>
  );
}
