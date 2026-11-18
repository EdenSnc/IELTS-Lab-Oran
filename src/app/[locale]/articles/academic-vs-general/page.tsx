import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getAcademicVsGeneralContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import AcademicGeneralQuiz from '@/components/AcademicGeneralQuiz';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'academic-vs-general',
    title: articleSeoTitle(locale, 'academic-vs-general'),
    description: articleDescription(locale, 'academic-vs-general'),
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-18',
  });
}

const EXTRA_AEO: Record<
  ArticleLocale,
  {
    summaryTitle: string;
    summaryText: string;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
  }
> = {
  en: {
    summaryTitle: 'Quick Answer — IELTS Academic vs General Training',
    summaryText:
      'Choose IELTS Academic for undergraduate/postgraduate university admission and professional registration (medicine, engineering, nursing), and choose IELTS General Training for skilled immigration such as Canada Express Entry. Both tests cost 40,000 DA in Algeria and share identical Listening and Speaking sections, differing only in Reading and Writing Task 1.',
    faqTitle: 'Frequently Asked Questions — Academic vs General Training',
    faqs: [
      {
        q: 'Do IELTS Academic and General Training cost the same in Algeria?',
        a: 'Yes. British Council Algeria lists the same standard 40,000 DA registration fee for both IELTS Academic and IELTS General Training (whereas IELTS for UKVI carries a separate fee when required).',
      },
      {
        q: 'Can I use IELTS Academic for Canada Express Entry?',
        a: 'No. IRCC strictly requires IELTS General Training (or another approved general test) for Express Entry immigration profiles; IELTS Academic is rejected for Express Entry.',
      },
      {
        q: 'Is IELTS General Training easier than IELTS Academic?',
        a: 'General Training Reading texts are drawn from everyday and workplace contexts rather than academic journals, so official raw-score conversion typically requires slightly more correct answers to achieve the same band score.',
      },
      {
        q: 'Are Listening and Speaking taken together or separately?',
        a: 'Listening and Speaking use the exact same test tasks and band descriptors across both Academic and General Training; only Reading passages and Writing Task 1 differ.',
      },
    ],
  },
  fr: {
    summaryTitle: 'Réponse rapide — IELTS Academic ou General Training ?',
    summaryText:
      'Choisissez l’IELTS Academic pour une admission universitaire (licence, master, doctorat) ou un ordre professionnel, et l’IELTS General Training pour l’immigration économique comme Entrée express au Canada. Les deux versions coûtent 40 000 DA en Algérie, ont exactement les mêmes épreuves Listening et Speaking, et ne diffèrent qu’en Reading et Writing Task 1.',
    faqTitle: 'Questions fréquentes — Academic vs General Training',
    faqs: [
      {
        q: 'Le prix est-il identique pour Academic et General Training en Algérie ?',
        a: 'Oui. Le tarif standard affiché par le British Council Algérie est de 40 000 DA pour les deux versions (hors version spécifique IELTS for UKVI).',
      },
      {
        q: 'Puis-je présenter l’IELTS Academic pour Entrée express Canada ?',
        a: 'Non. IRCC exige exclusivement la version IELTS General Training pour les profils d’immigration Entrée express.',
      },
      {
        q: 'Le General Training est-il plus facile que l’Academic ?',
        a: 'Les textes du General Training sont plus pratiques que scientifiques, mais le barème exige généralement davantage de bonnes réponses brutes en Reading pour atteindre le même Band.',
      },
      {
        q: 'Les épreuves Listening et Speaking changent-elles selon le module ?',
        a: 'Non. Les sections Listening et Speaking sont strictement identiques dans les deux tests ; seules les sections Reading et Writing Task 1 changent.',
      },
    ],
  },
  ar: {
    summaryTitle: 'إجابة سريعة — أيهما تختار: Academic أم General Training؟',
    summaryText:
      'اختر اختبار IELTS Academic للقبول الجامعي (بكالوريوس، ماستر، دكتوراه) والتسجيل في الهيئات المهنية، واختر IELTS General Training للهجرة المهنية مثل برنامج Express Entry الكندي. يبلغ سعر كلا الاختبارين 40,000 دج في الجزائر، ويتطابقان تماماً في الاستماع والمحادثة، بينما يختلفان فقط في القراءة والمهمة الأولى للكتابة.',
    faqTitle: 'الأسئلة الشائعة — الفرق بين Academic وGeneral Training',
    faqs: [
      {
        q: 'هل يختلف سعر IELTS Academic عن General Training في الجزائر؟',
        a: 'لا، السعر القياسي المعلن لدى المجلس الثقافي البريطاني في الجزائر واحد لكليهما ويبلغ 40,000 دج (تختلف الرسوم فقط لنسخة IELTS for UKVI عند الحاجة إليها).',
      },
      {
        q: 'هل يُقبل اختبار IELTS Academic في ملف الهجرة إلى كندا Express Entry؟',
        a: 'لا، تشترط وزارة الهجرة الكندية (IRCC) تقديم نسخة IELTS General Training حصراً لبرنامج Express Entry ولا تقبل النسخة الأكاديمية.',
      },
      {
        q: 'هل يُعد General Training أسهل في تحصيل الدرجات؟',
        a: 'نصوص القراءة في General Training مأخوذة من الحياة اليومية والعمل وليست أبحاثاً أكاديمية، ولذلك يتطلب سلم التصحيح عادةً عدداً أكبر من الإجابات الصحيحة لبلوغ نفس الدرجة.',
      },
      {
        q: 'هل يختلف قسما الاستماع والمحادثة بين النسختين؟',
        a: 'لا، قسما Listening وSpeaking متطابقان بنسبة 100% في الأسئلة ومعايير التقييم بين النسختين؛ يقتصر الاختلاف على نصوص Reading ومهمة Writing Task 1.',
      },
    ],
  },
};

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getAcademicVsGeneralContent(locale);
  const aeo = EXTRA_AEO[locale];
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <main id="main-content" className={`pt-32 pb-24 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <ArticleBreadcrumb locale={locale} title={c.title} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>

          <div className="bg-white border-s-4 border-crimson p-6 rounded-e-2xl shadow-sm mb-8">
            <h2 className="text-charcoal font-bold text-lg mb-2">{aeo.summaryTitle}</h2>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed m-0">{aeo.summaryText}</p>
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
            <p className="lead text-xl text-gray-600 mb-8 font-medium" dangerouslySetInnerHTML={{ __html: c.lead }} />

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>

            <div className="grid md:grid-cols-2 gap-8 my-8 not-prose">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl mb-3 text-blue-900">{c.academicTitle}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{c.academicDesc}</p>
              </div>
              <div className="bg-green-50 border border-green-100 p-6 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl mb-3 text-green-900">{c.generalTitle}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{c.generalDesc}</p>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
            <p dangerouslySetInnerHTML={{ __html: c.formatIntro }} />

            <div className="overflow-x-auto my-10 not-prose rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-start border-collapse">
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
                    <td className="p-4 border-b border-gray-100 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.readingBullets[0].replace(/^<strong>[^<]*<\/strong>(?:<br\s*\/?>|\s)*/i, '') }} />
                    <td className="p-4 border-b border-gray-100 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.readingBullets[1].replace(/^<strong>[^<]*<\/strong>(?:<br\s*\/?>|\s)*/i, '') }} />
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-charcoal bg-gray-50">
                      {locale === 'ar' ? 'الكتابة (Writing)' : 'Writing'}
                    </td>
                    <td className="p-4 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.writingBullets[0].replace(/^<strong>[^<]*<\/strong>(?:<br\s*\/?>|\s)*/i, '') }} />
                    <td className="p-4 text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: c.writingBullets[1].replace(/^<strong>[^<]*<\/strong>(?:<br\s*\/?>|\s)*/i, '') }} />
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_3}</h2>
            <p>{c.scoringText}</p>
            <AcademicGeneralQuiz locale={locale} />

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{aeo.faqTitle}</h2>
            <div className="not-prose my-6 space-y-4">
              {aeo.faqs.map((item) => (
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
                mainEntity: aeo.faqs.map((item) => ({
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
              slug="academic-vs-general"
              title={c.title}
              description={articleDescription(locale, 'academic-vs-general')}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label:
                    locale === 'fr'
                      ? 'IELTS.org : types de tests IELTS'
                      : locale === 'ar'
                        ? 'IELTS.org: أنواع اختبارات IELTS'
                        : 'IELTS.org: IELTS test types',
                  href: 'https://ielts.org/take-a-test/test-types',
                },
                {
                  label:
                    locale === 'fr'
                      ? 'IELTS.org : format General Training'
                      : locale === 'ar'
                        ? 'IELTS.org: صيغة اختبار General Training'
                        : 'IELTS.org: General Training test format',
                  href: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test',
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
