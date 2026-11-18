import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
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
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-18',
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
    tableTitle: 'UK vs France Visa Processing from Algeria — Quick Comparison',
    tableHeaders: ['Factor', 'UK Student Visa (TLScontact)', 'France Student Visa (Capago)'],
    tableRows: [
      ['Biometrics & Submission Partner', 'TLScontact Algeria', 'Capago Algeria (Algiers, Oran, Constantine, Annaba)'],
      ['Who Sets the English Score?', 'Your UK sponsor (CAS) + GOV.UK immigration rules', 'Your French institution + Études en France / Campus France dossier'],
      ['Standard IELTS Academic vs UKVI', 'Standard IELTS often accepted at degree-level HEPs; IELTS for UKVI (SELT) required for below-degree / SELT routes', 'Standard IELTS Academic accepted where English-taught programmes ask for IELTS'],
    ],
    checkTitle: 'Before paying for any test',
    checks: [
      'Identify the exact programme and visa route.',
      'Copy the required test name, version, minimum scores, and validity date.',
      'Confirm whether each skill needs a minimum score.',
      'Re-check the official requirement immediately before booking.',
    ],
    faqTitle: 'Frequently Asked Questions — UKVI, TLScontact & Capago',
    faqs: [
      {
        q: 'Do all UK Student visa applicants in Algeria need IELTS for UKVI?',
        a: 'No. If you are studying at degree level or above with a UK Higher Education Provider with a track record of compliance, your university CAS often states that English has been assessed using standard IELTS Academic. Always read your CAS before booking IELTS for UKVI.',
      },
      {
        q: 'Can I sit IELTS for UKVI in Oran or do I have to travel to Algiers?',
        a: 'UKVI Secure English Language Tests (SELTs) can only be taken at UK Home Office-approved SELT venues. Check the live British Council Algeria UKVI booking calendar before paying, as UKVI sittings are typically concentrated in Algiers.',
      },
      {
        q: 'Does Capago Oran require IELTS for an English-taught Master’s in France?',
        a: 'Capago collects the documents listed on your France-Visas receipt and Campus France file; if your French business or engineering school admits you to an English-taught programme based on IELTS Academic, include the exact certificate verified in your Études en France dossier.',
      },
      {
        q: 'What happens if I book standard IELTS when my route required IELTS for UKVI?',
        a: 'Standard IELTS Test Report Forms lack a UKVI SELT Unique Reference Number (URN) and cannot be used where GOV.UK mandates a SELT, which would force you to pay for a second test.',
      },
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
    tableTitle: 'Comparatif rapide : Student Visa UK vs Visa Étudiant France',
    tableHeaders: ['Critère', 'Royaume-Uni (TLScontact)', 'France (Capago Algérie)'],
    tableRows: [
      ['Centre de dépôt biométrique', 'TLScontact Algérie', 'Capago Algérie (dont centre d’Oran)'],
      ['Qui fixe le score d’anglais ?', 'Votre université (CAS) + règles GOV.UK', 'Votre école/université + dossier Campus France'],
      ['IELTS standard ou IELTS for UKVI ?', 'IELTS Academic souvent accepté dès la licence (selon CAS) ; IELTS for UKVI obligatoire si SELT requis', 'IELTS Academic standard accepté pour les cursus anglophones'],
    ],
    checkTitle: 'Avant de payer un test',
    checks: [
      'Identifiez le programme et le parcours de visa exacts.',
      'Notez le nom du test, sa version, les scores minimums et la durée de validité.',
      'Vérifiez s’il existe un minimum pour chaque compétence.',
      'Revérifiez la source officielle juste avant la réservation.',
    ],
    faqTitle: 'Questions fréquentes — IELTS for UKVI, TLScontact & Capago',
    faqs: [
      {
        q: 'Faut-il obligatoirement passer IELTS for UKVI pour étudier au Royaume-Uni ?',
        a: 'Non. Pour un diplôme de niveau licence/master auprès d’une université britannique habilitée (Higher Education Provider), l’établissement évalue souvent l’anglais via un IELTS Academic standard mentionné sur votre CAS.',
      },
      {
        q: 'Peut-on passer l’IELTS for UKVI à Oran ?',
        a: 'Les examens SELT (IELTS for UKVI) ne se déroulent que dans les centres expressément agréés par le Home Office britannique. Vérifiez le calendrier officiel du British Council Algérie, car les sessions UKVI ont généralement lieu à Alger.',
      },
      {
        q: 'Capago Oran exige-t-il un score IELTS fixe pour un cursus en anglais en France ?',
        a: 'Non. Capago réceptionne les pièces de votre liste France-Visas et Campus France ; le score d’anglais requis dépend uniquement de la formation anglophone dans laquelle vous êtes admis.',
      },
      {
        q: 'Que se passe-t-il si je réserve un IELTS standard alors qu’un SELT UKVI était exigé ?',
        a: 'Un relevé IELTS standard ne comporte pas de numéro URN UKVI et sera refusé pour une démarche exigeant un SELT, vous obligeant à repayer un examen complet.',
      },
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
    tableTitle: 'مقارنة سريعة: تأشيرة بريطانيا مقابل تأشيرة فرنسا من الجزائر',
    tableHeaders: ['المعيار', 'بريطانيا (TLScontact)', 'فرنسا (Capago الجزائر)'],
    tableRows: [
      ['مركز إيداع الملف والبيومتري', 'TLScontact الجزائر', 'Capago الجزائر (بما فيها مركز وهران)'],
      ['من يحدد درجة الإنجليزية؟', 'الجامعة الراعية في خطاب CAS وقواعد GOV.UK', 'المؤسسة الفرنسية المستقبلة وملف Campus France'],
      ['IELTS العادي أم IELTS for UKVI؟', 'يُقبل العادي غالباً لمستوى البكالوريوس والماستر؛ ويُشترط UKVI عند طلب SELT', 'يُقبل IELTS Academic العادي للبرامج المدرسة بالإنجليزية'],
    ],
    checkTitle: 'قبل دفع رسوم أي اختبار',
    checks: [
      'حدد برنامج الدراسة ومسار التأشيرة بدقة.',
      'سجّل اسم الاختبار ونسخته والحد الأدنى والمدة المقبولة.',
      'تحقق مما إذا كان لكل مهارة حد أدنى.',
      'راجع المصدر الرسمي مرة أخرى قبل الحجز مباشرة.',
    ],
    faqTitle: 'الأسئلة الشائعة — IELTS for UKVI وTLScontact وCapago',
    faqs: [
      {
        q: 'هل يحتاج كل طالب جزائري متقدم لبريطانيا إلى اختبار IELTS for UKVI؟',
        a: 'لا. في برامج البكالوريوس والدراسات العليا لدى الجامعات البريطانية المعتمدة، تقيّم الجامعة غالباً مستوى الإنجليزية بشهادة IELTS Academic العادية وتثبت ذلك في خطاب CAS.',
      },
      {
        q: 'هل تتوفر جلسات IELTS for UKVI في وهران أم في الجزائر العاصمة فقط؟',
        a: 'تُجرى اختبارات UKVI حصراً في المراكز المعتمدة من وزارة الداخلية البريطانية (SELT)؛ تحقق دائماً من بوابة المجلس الثقافي البريطاني في الجزائر لأن جلسات UKVI تتركز عادةً في الجزائر العاصمة.',
      },
      {
        q: 'هل يشترط مركز Capago وهران درجة IELTS موحدة للدراسة بالإنجليزية في فرنسا؟',
        a: 'لا يفرض Capago درجة من عنده، بل يستلم الوثائق المحددة في ملف Campus France وقبول المؤسسة التعليمية الفرنسية التي تشترط الدرجة المناسبة لبرنامجها.',
      },
      {
        q: 'ماذا يحدث إذا حجزت IELTS العادي بينما يشترط مساري اختبار UKVI؟',
        a: 'لا تحمل شهادة IELTS العادية الرقم المرجعي الخاص بـ UKVI (URN)، وبالتالي لا تُقبل في المسارات التي تلزم باختبار SELT مما يضطرك لحجز اختبار جديد.',
      },
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
      <main
        id="main-content"
        className={`pt-32 pb-24 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <article>
          <ArticleBreadcrumb locale={locale} title={c.title} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            {c.title}
          </h1>
          <div className="bg-amber-50 border-s-4 border-amber-500 p-6 rounded-e-2xl shadow-sm mb-10">
            <p className="text-amber-900 font-bold text-lg mb-2">{c.warningTitle}</p>
            <p
              className="text-amber-950/90 m-0"
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

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
              {t.tableTitle}
            </h2>
            <div className="not-prose overflow-x-auto rounded-2xl border border-gray-200 shadow-sm my-8">
              <table className="w-full border-collapse text-start text-sm">
                <thead>
                  <tr className="bg-charcoal text-white">
                    {t.tableHeaders.map((h) => (
                      <th key={h} className="p-4 font-bold border-b border-white/10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {t.tableRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="p-4 font-bold text-charcoal bg-gray-50">{row[0]}</td>
                      <td className="p-4 text-gray-700">{row[1]}</td>
                      <td className="p-4 text-gray-700">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="not-prose my-10 rounded-3xl bg-charcoal p-7 text-white">
              <h2 className="text-xl font-extrabold">{t.checkTitle}</h2>
              <ol className="mt-5 space-y-3">
                {t.checks.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-200">
                    <span className="font-extrabold text-[#ff7a8a]">{index + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
              {t.faqTitle}
            </h2>
            <div className="not-prose my-6 space-y-4">
              {t.faqs.map((item) => (
                <section key={item.q} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-charcoal mb-2">{item.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed m-0">{item.a}</p>
                </section>
              ))}
            </div>

            <div className="not-prose bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between">
              <div className="md:w-2/3">
                <h2 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h2>
                <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
              </div>
              <Link
                href="/#intake"
                className="w-full md:w-auto text-center bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-[#c4162c] transition-colors"
              >
                {c.ctaBtn}
              </Link>
            </div>
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                inLanguage: locale,
                mainEntity: t.faqs.map((item) => ({
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
              slug="tlscontact-capago"
              title={c.title}
              description={description}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label: locale === 'fr'
                    ? 'GOV.UK : niveau d’anglais pour le Student visa'
                    : locale === 'ar'
                      ? 'GOV.UK: متطلبات اللغة الإنجليزية لتأشيرة الدراسة البريطانية'
                      : 'GOV.UK: Student visa knowledge of English',
                  href: 'https://www.gov.uk/student-visa/knowledge-of-english',
                },
                {
                  label: locale === 'fr'
                    ? 'GOV.UK : tests SELT officiellement approuvés'
                    : locale === 'ar'
                      ? 'GOV.UK: اختبارات اللغة الإنجليزية المعتمدة (SELT)'
                      : 'GOV.UK: approved secure English language tests',
                  href: 'https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt',
                },
                {
                  label: locale === 'fr'
                    ? 'France-Visas : procédure de demande en Algérie'
                    : locale === 'ar'
                      ? 'France-Visas: إجراءات التقديم من الجزائر'
                      : 'France-Visas: Algeria application process',
                  href: 'https://www.france-visas.gouv.fr/en/algerie',
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
