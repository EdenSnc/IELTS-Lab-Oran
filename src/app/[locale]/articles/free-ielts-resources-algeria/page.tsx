import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getFreeResourcesContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'free-ielts-resources-algeria',
    title: articleSeoTitle(locale, 'free-ielts-resources-algeria'),
    description: articleDescription(locale, 'free-ielts-resources-algeria'),
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-17',
  });
}

const READY_COPY: Record<ArticleLocale, {
  heading: string;
  body: string;
  freeLabel: string;
  freeDesc: string;
  premiumLabel: string;
  premiumDesc: string;
  sampleTitle: string;
  sampleDesc: string;
  sampleBtn: string;
}> = {
  en: {
    heading: 'IELTS Ready Member vs. IELTS Ready Premium',
    body: 'British Council candidates in Algeria often search for IELTS Ready Premium. You do not need to pay extra for Premium access before booking:',
    freeLabel: 'IELTS Ready Member (Free account)',
    freeDesc: 'Available after registering on the British Council Take IELTS portal without paying yet. Includes sample computer questions and tips.',
    premiumLabel: 'IELTS Ready Premium (Unlocked after booking)',
    premiumDesc: 'Unlocks automatically once you book and pay your test fee (40,000 DA) with British Council Algeria—no separate subscription exists.',
    sampleTitle: 'Try a Free Computer IELTS Reading Sample Now',
    sampleDesc: 'Practise split-screen reading, highlights, notes, and countdown timing before investing 40,000 DA.',
    sampleBtn: 'Start free Reading sample',
  },
  fr: {
    heading: 'IELTS Ready Member vs IELTS Ready Premium',
    body: 'De nombreux candidats en Algérie recherchent IELTS Ready Premium. Voici comment fonctionne réellement cet accès :',
    freeLabel: 'IELTS Ready Member (Gratuit sans réservation)',
    freeDesc: 'Accessible gratuitement avec un compte sur le portail Take IELTS du British Council : exercices de découverte et fiches conseils.',
    premiumLabel: 'IELTS Ready Premium (Débloqué après inscription)',
    premiumDesc: 'S’active automatiquement après le paiement de votre examen (40 000 DA) auprès du British Council Algérie : il n’existe pas d’abonnement séparé.',
    sampleTitle: 'Tester gratuitement notre simulation Reading sur PC',
    sampleDesc: 'Entraînez-vous avec l’écran partagé, le surlignage, le prise de notes et le chronomètre officiel avant votre inscription.',
    sampleBtn: 'Lancer l’échantillon gratuit',
  },
  ar: {
    heading: 'الفرق بين IELTS Ready المجاني و IELTS Ready Premium',
    body: 'يبحث الكثير من المرشحين في الجزائر عن منصة IELTS Ready Premium؛ إليك كيفية الوصول إليها رسمياً:',
    freeLabel: 'IELTS Ready Member (حساب مجاني)',
    freeDesc: 'متاح مجاناً عند إنشاء حساب على بوابة المجلس الثقافي البريطاني دون الحاجة لدفع رسوم الامتحان بعد، ويوفر نماذج تمهيدية.',
    premiumLabel: 'IELTS Ready Premium (يُفتح بعد حجز الاختبار)',
    premiumDesc: 'يُفتح مجاناً وبشكل تلقائي فور دفع رسوم الامتحان (40,000 دج) مع المجلس الثقافي البريطاني بالجزائر، ولا يباع باشتراك منفصل.',
    sampleTitle: 'جرّب محاكاة القراءة المجانية على الكمبيوتر الآن',
    sampleDesc: 'تدرّب على الشاشة المقسمة والتظليل والمؤقت قبل حجز الامتحان الرسمي.',
    sampleBtn: 'ابدأ عينة القراءة المجانية',
  },
};

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

              <section className="not-prose my-12 rounded-3xl border border-gray-200 bg-[#faf9f6] p-6 md:p-8">
                <h2 className="text-2xl font-extrabold text-charcoal mb-3">{READY_COPY[locale].heading}</h2>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">{READY_COPY[locale].body}</p>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <div className="rounded-2xl bg-white p-5 border border-gray-200">
                    <h3 className="font-bold text-charcoal text-base mb-1">{READY_COPY[locale].freeLabel}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed m-0">{READY_COPY[locale].freeDesc}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 border border-gray-200">
                    <h3 className="font-bold text-crimson text-base mb-1">{READY_COPY[locale].premiumLabel}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed m-0">{READY_COPY[locale].premiumDesc}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-crimson/20 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-charcoal text-base">{READY_COPY[locale].sampleTitle}</h3>
                    <p className="text-sm text-gray-600 mt-1 m-0">{READY_COPY[locale].sampleDesc}</p>
                  </div>
                  <a
                    href={`/sample?locale=${locale}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-crimson px-6 py-3 text-sm font-bold text-white hover:bg-red-800 transition-colors"
                  >
                    {READY_COPY[locale].sampleBtn}
                  </a>
                </div>
              </section>
          
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
              slug="free-ielts-resources-algeria"
              title={c.title}
              description={articleDescription(locale, 'free-ielts-resources-algeria')}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-17"
              sources={[
                {
                  label: locale === 'fr'
                    ? 'British Council : préparation IELTS gratuite et IELTS Ready'
                    : locale === 'ar'
                      ? 'المجلس الثقافي البريطاني: تحضير IELTS المجاني ومنصة IELTS Ready'
                      : 'British Council: free IELTS preparation & IELTS Ready',
                  href: 'https://takeielts.britishcouncil.org/take-ielts/prepare',
                },
                {
                  label: locale === 'fr'
                    ? 'IELTS.org : sujets et exemples officiels gratuits'
                    : locale === 'ar'
                      ? 'IELTS.org: نماذج أسئلة الاختبار الرسمية المجانية'
                      : 'IELTS.org: sample test questions',
                  href: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
                },
                {
                  label: locale === 'fr'
                    ? 'IDP IELTS : test de familiarisation sur ordinateur'
                    : locale === 'ar'
                      ? 'IDP IELTS: اختبار التعرف على صيغة الكمبيوتر'
                      : 'IDP IELTS: computer familiarisation test',
                  href: 'https://ielts.idp.com/prepare/article-computer-delivered-ielts-familiarisation-test',
                },
              ]}
            />
          </div>
      </article>
      
      <ArticleMobileCta />
    </>
  );
}
