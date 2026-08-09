import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getComputerVsPaperContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import {
  articleDescription,
  articleSeoTitle,
  buildArticleMetadata,
} from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: ArticleLocale }>;
}) {
  const { locale } = await params;

  return buildArticleMetadata({
    locale,
    slug: 'computer-vs-paper-ielts',
    title: articleSeoTitle(locale, 'computer-vs-paper-ielts'),
    description: articleDescription(locale, 'computer-vs-paper-ielts'),
  });
}

const faqs = {
  en: [
    {
      q: 'Does British Council Algeria still offer paper IELTS?',
      a: 'British Council Algeria says that from 30 April 2026, all of its IELTS tests in Algeria are delivered on computer. Check the live booking portal before paying because availability can change.',
    },
    {
      q: 'Is IELTS on computer harder than IELTS on paper?',
      a: 'No. The content, timing, question types and scoring are the same. The main difference is how you read, type, highlight, navigate and review answers on screen.',
    },
    {
      q: 'How quickly do computer IELTS results arrive?',
      a: 'British Council Algeria currently says results are normally available in one to two days.',
    },
    {
      q: 'Can I use IELTS One Skill Retake?',
      a: 'If your original computer test and test centre are eligible, you can retake one skill within 60 days. Confirm that the organisation receiving your score accepts One Skill Retake. IRCC does not accept it for Express Entry.',
    },
    {
      q: 'Do I need to bring a laptop or headphones?',
      a: 'No. The official test centre supplies the computer and Listening equipment. You should still practise on a desktop or laptop before test day so the interface feels familiar.',
    },
  ],
  fr: [
    {
      q: 'Le British Council Algérie propose-t-il encore l’IELTS sur papier ?',
      a: 'Le British Council Algérie indique qu’à partir du 30 avril 2026, tous ses tests IELTS en Algérie sont sur ordinateur. Vérifiez le portail de réservation avant de payer, car les disponibilités peuvent changer.',
    },
    {
      q: 'L’IELTS sur ordinateur est-il plus difficile ?',
      a: 'Non. Le contenu, la durée, les types de questions et la notation restent identiques. La différence concerne la lecture, la saisie, le surlignage, la navigation et la vérification à l’écran.',
    },
    {
      q: 'Quand reçoit-on les résultats ?',
      a: 'Le British Council Algérie indique actuellement un délai habituel de un à deux jours.',
    },
    {
      q: 'Puis-je utiliser IELTS One Skill Retake ?',
      a: 'Si le test initial sur ordinateur et le centre sont éligibles, vous pouvez repasser une compétence dans les 60 jours. Vérifiez que l’organisme destinataire accepte One Skill Retake. IRCC ne l’accepte pas pour Entrée express.',
    },
    {
      q: 'Dois-je apporter un ordinateur ou un casque ?',
      a: 'Non. Le centre officiel fournit l’ordinateur et le matériel d’écoute. Entraînez-vous quand même sur ordinateur avant le test afin de maîtriser l’interface.',
    },
  ],
  ar: [
    {
      q: 'هل ما زال المجلس الثقافي البريطاني يقدم اختبار الآيلتس الورقي في الجزائر؟',
      a: 'يذكر المجلس الثقافي البريطاني في الجزائر أنه ابتداء من 30 أبريل 2026 ستجرى جميع اختباراته للآيلتس في الجزائر على الكمبيوتر. تحقق من بوابة الحجز قبل الدفع لأن المواعيد قد تتغير.',
    },
    {
      q: 'هل اختبار الآيلتس على الكمبيوتر أصعب من الاختبار الورقي؟',
      a: 'لا. المحتوى والمدة وأنواع الأسئلة وطريقة التقييم هي نفسها. الاختلاف الأساسي هو القراءة والكتابة والتظليل والتنقل ومراجعة الإجابات على الشاشة.',
    },
    {
      q: 'متى تظهر نتائج اختبار الآيلتس على الكمبيوتر؟',
      a: 'يذكر المجلس الثقافي البريطاني في الجزائر حاليا أن النتائج تظهر عادة خلال يوم أو يومين.',
    },
    {
      q: 'هل يمكنني استخدام IELTS One Skill Retake؟',
      a: 'إذا كان اختبارك الأصلي على الكمبيوتر والمركز مؤهلين، يمكنك إعادة مهارة واحدة خلال 60 يوما. تأكد من أن الجهة التي سترسل إليها النتيجة تقبل هذه الخدمة. لا تقبلها دائرة الهجرة الكندية في Express Entry.',
    },
    {
      q: 'هل يجب أن أحضر حاسوبي أو سماعاتي؟',
      a: 'لا. يوفر مركز الاختبار الرسمي الكمبيوتر ومعدات الاستماع. لكن تدرب مسبقا على حاسوب مكتبي أو محمول حتى تصبح الواجهة مألوفة.',
    },
  ],
} satisfies Record<
  ArticleLocale,
  Array<{
    q: string;
    a: string;
  }>
>;

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const content = getComputerVsPaperContent(locale);
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <article
        className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <h1 className="mb-8 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          {content.title}
        </h1>

        <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
          <div className="mb-10 rounded-r-2xl border-l-4 border-crimson bg-red-50 p-6 shadow-sm">
            <p className="mb-2 text-lg font-bold text-crimson">{content.alertTitle}</p>
            <p
              className="m-0 text-gray-700"
              dangerouslySetInnerHTML={{ __html: content.alertText }}
            />
          </div>

          <p className="lead mb-8 text-xl font-medium text-gray-600">{content.lead}</p>

          <h2 className="mt-16 mb-6 text-3xl font-extrabold tracking-tight text-charcoal">
            {content.h2_1}
          </h2>

          <div className="not-prose my-8 grid gap-4 md:grid-cols-2">
            {content.bullets.map((bullet, index) => {
              const match = bullet.match(/<strong>(.*?)<\/strong>([\s\S]*)/);
              const title = match ? match[1] : `Feature ${index + 1}`;
              const text = match ? match[2].replace(/^:\s*/, '') : bullet;

              return (
                <div
                  key={title}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-crimson/50"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson/10 text-sm font-bold text-crimson">
                      {index + 1}
                    </div>
                    <h3
                      className="text-lg font-bold text-charcoal"
                      dangerouslySetInnerHTML={{ __html: title }}
                    />
                  </div>
                  <p
                    className="ml-11 text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                </div>
              );
            })}
          </div>

          <h2 className="mt-16 mb-6 text-3xl font-extrabold tracking-tight text-charcoal">
            {content.h2_2}
          </h2>

          <div className="not-prose my-8 space-y-6">
            {faqs[locale].map((item) => (
              <section
                key={item.q}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-2 text-lg font-bold text-charcoal">{item.q}</h3>
                <p className="text-sm text-gray-600">{item.a}</p>
              </section>
            ))}
          </div>

          <div className="relative mt-16 flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50 md:flex-row md:p-10">
            <div className="relative z-10 md:w-2/3">
              <h3 className="mb-3 text-2xl font-extrabold text-charcoal">
                {content.ctaTitle}
              </h3>
              <p className="m-0 leading-relaxed text-gray-600">{content.ctaDesc}</p>
            </div>
            <Link
              href="/#intake"
              className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-8 py-4 text-center font-bold text-white shadow-soft transition-colors hover:bg-crimson md:w-auto"
            >
              {content.ctaBtn} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        <div className="mt-16">
          <ArticleTrust
            locale={locale}
            slug="computer-vs-paper-ielts"
            title={content.title}
            description={articleDescription(locale, 'computer-vs-paper-ielts')}
            sources={[
              {
                label: 'British Council Algeria: test dates, fees, and computer delivery',
                href: 'https://www.britishcouncil.dz/fr/examen/ielts/dates-frais-lieux',
              },
              {
                label: 'IELTS.org: One Skill Retake rules',
                href: 'https://ielts.org/take-a-test/booking-your-test/one-skill-retake',
              },
              {
                label: 'IRCC: language tests accepted for Express Entry',
                href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html',
              },
            ]}
          />
        </div>
      </article>

      <ArticleMobileCta />
    </>
  );
}
