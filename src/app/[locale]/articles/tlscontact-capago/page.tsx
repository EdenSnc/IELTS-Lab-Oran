import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getTlscontactContent, ArticleLocale } from '@/lib/articleContent';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: ArticleLocale }>;
}) {
  const { locale } = await params;
  const description = articleDescription(locale, 'tlscontact-capago');
  return buildArticleMetadata({
    locale,
    slug: 'tlscontact-capago',
    title: articleSeoTitle(locale, 'tlscontact-capago'),
    description,
  });
}

const copy = {
  en: {
    intro:
      'The visa centre receives documents and biometrics; it does not create a universal IELTS rule. Start with the requirement written by your university, sponsor, Campus France file, or official visa route.',
    ukTitle: 'UK Student visa: use this decision path',
    ukSteps: [
      ['1', 'Read your CAS', 'Check how your sponsor says English was assessed and whether a specific test is named.'],
      ['2', 'Check the official route', 'Some applicants can prove English through qualifications or sponsor assessment. Degree-level students at qualifying higher education providers may be assessed by their sponsor.'],
      ['3', 'Book a SELT only when required', 'If your route requires a Secure English Language Test, choose an approved provider and the exact approved test, such as IELTS for UKVI.'],
    ],
    franceTitle: 'France from Algeria: separate admission from visa processing',
    franceText:
      'France-Visas says Capago handles appointment booking, document submission, and biometrics in Algeria, including an Oran centre. The language evidence comes from your study programme or Campus France file; there is no single France-wide rule that every student must present IELTS 6.5.',
    checkTitle: 'Before paying for any test',
    checks: [
      'Identify the exact programme and visa route.',
      'Copy the required test name, version, minimum scores, and validity date.',
      'Confirm whether each skill needs a minimum score.',
      'Re-check the official requirement immediately before booking.',
    ],
  },
  fr: {
    intro:
      'Le centre de visas reçoit les documents et les données biométriques ; il ne crée pas une règle IELTS universelle. Commencez par l’exigence écrite de l’université, du sponsor, de Campus France ou du parcours officiel.',
    ukTitle: 'Student visa UK : suivez cette décision',
    ukSteps: [
      ['1', 'Lisez votre CAS', 'Vérifiez comment le sponsor a évalué votre anglais et si un test précis est nommé.'],
      ['2', 'Vérifiez le parcours officiel', 'Certains candidats prouvent l’anglais par leurs diplômes ou l’évaluation du sponsor. Au niveau licence ou plus, certains établissements peuvent évaluer eux-mêmes.'],
      ['3', 'Réservez un SELT seulement si nécessaire', 'Si le parcours exige un Secure English Language Test, choisissez un fournisseur et un test approuvés, par exemple IELTS for UKVI.'],
    ],
    franceTitle: 'France depuis l’Algérie : distinguez admission et visa',
    franceText:
      'France-Visas indique que Capago gère les rendez-vous, le dépôt des documents et la biométrie en Algérie, avec un centre à Oran. La preuve linguistique dépend du programme ou du dossier Campus France ; il n’existe pas de règle nationale imposant IELTS 6.5 à tous les étudiants.',
    checkTitle: 'Avant de payer un test',
    checks: [
      'Identifiez le programme et le parcours de visa exacts.',
      'Notez le nom du test, sa version, les scores minimums et la durée de validité.',
      'Vérifiez s’il existe un minimum pour chaque compétence.',
      'Revérifiez la source officielle juste avant la réservation.',
    ],
  },
  ar: {
    intro:
      'يستلم مركز التأشيرات الوثائق والبيانات البيومترية، لكنه لا يضع قاعدة IELTS موحدة. ابدأ بالشرط المكتوب من الجامعة أوالجهة الراعية أوملف Campus France أومسار التأشيرة الرسمي.',
    ukTitle: 'تأشيرة Student البريطانية: اتبع هذا المسار',
    ukSteps: [
      ['1', 'اقرأ CAS', 'تحقق من كيفية تقييم الجهة الراعية للإنجليزية وما إذا كانت قد حددت اختباراً بعينه.'],
      ['2', 'تحقق من المسار الرسمي', 'يمكن لبعض المتقدمين إثبات الإنجليزية بالمؤهلات أوتقييم الجهة الراعية. وقد تقيّم بعض مؤسسات التعليم العالي طلاب مستوى الشهادة أوأعلى بنفسها.'],
      ['3', 'احجز SELT فقط عند اشتراطه', 'إذا اشترط المسار Secure English Language Test، فاختر مزوداً واختباراً معتمدين مثل IELTS for UKVI.'],
    ],
    franceTitle: 'فرنسا من الجزائر: افصل بين القبول وإجراءات التأشيرة',
    franceText:
      'تذكر France-Visas أن Capago يدير المواعيد وتسليم الوثائق والبيانات البيومترية في الجزائر، بما في ذلك مركز وهران. أما إثبات اللغة فيحدده برنامج الدراسة أوملف Campus France؛ ولا توجد قاعدة فرنسية موحدة تفرض IELTS 6.5 على كل طالب.',
    checkTitle: 'قبل دفع رسوم أي اختبار',
    checks: [
      'حدد برنامج الدراسة ومسار التأشيرة بدقة.',
      'سجّل اسم الاختبار ونسخته والحد الأدنى والمدة المقبولة.',
      'تحقق مما إذا كان لكل مهارة حد أدنى.',
      'راجع المصدر الرسمي مرة أخرى قبل الحجز مباشرة.',
    ],
  },
} as const;

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getTlscontactContent(locale);
  const t = copy[locale];
  const description = articleDescription(locale, 'tlscontact-capago');
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <article
        className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          {c.title}
        </h1>
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl shadow-sm mb-10">
          <p className="text-amber-900 font-bold text-lg mb-2">{c.warningTitle}</p>
          <p
            className="text-amber-950/80 m-0"
            dangerouslySetInnerHTML={{ __html: c.warningText }}
          />
        </div>

        <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
          <p className="lead">{t.intro}</p>
          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.ukTitle}
          </h2>

          <div className="not-prose grid gap-4 my-8">
            {t.ukSteps.map(([number, title, text]) => (
              <div
                key={number}
                className="grid grid-cols-[3rem_1fr] gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-charcoal text-lg font-extrabold text-white">
                  {number}
                </span>
                <div>
                  <h3 className="font-extrabold text-charcoal">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.franceTitle}
          </h2>
          <p>{t.franceText}</p>

          <div className="not-prose my-10 rounded-3xl bg-charcoal p-7 text-white">
            <h2 className="text-xl font-extrabold">{t.checkTitle}</h2>
            <ol className="mt-5 space-y-3">
              {t.checks.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-200">
                  <span className="font-extrabold text-crimson">{index + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="not-prose bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="md:w-2/3">
              <h2 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h2>
              <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
            </div>
            <Link
              href="/#intake"
              className="w-full md:w-auto text-center bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-crimson transition-colors"
            >
              {c.ctaBtn}
            </Link>
          </div>
        </div>
        <div className="mt-16">
          <ArticleTrust
            locale={locale}
            slug="tlscontact-capago"
            title={c.title}
            description={description}
            sources={[
              {
                label: 'GOV.UK: Student visa knowledge of English',
                href: 'https://www.gov.uk/student-visa/knowledge-of-english',
              },
              {
                label: 'GOV.UK: approved secure English language tests',
                href: 'https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt',
              },
              {
                label: 'France-Visas: Algeria application process',
                href: 'https://www.france-visas.gouv.fr/en/algerie',
              },
            ]}
          />
        </div>
      </article>
      <ArticleMobileCta />
    </>
  );
}
