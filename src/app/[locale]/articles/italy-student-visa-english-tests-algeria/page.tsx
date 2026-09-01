import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { type ArticleLocale } from '@/lib/articleContent';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

const slug = 'italy-student-visa-english-tests-algeria' as const;
const reviewedAt = '2026-09-01';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug,
    title: articleSeoTitle(locale, slug),
    description: articleDescription(locale, slug),
    modifiedTime: reviewedAt,
  });
}

const copy = {
  en: {
    title: 'Italy Study Visas from Algeria: IELTS, Duolingo and EnglishScore in 2026',
    lead: 'A university can accept one English document for admission while the Italian visa authority asks for different evidence. That distinction is at the centre of the confusion facing Algerian applicants in 2026.',
    alertTitle: 'What changed in late August and 1 September 2026',
    alert: 'On 27 August, the Italian Embassy in Algiers clarified that suitable internationally recognised B2 certificates—such as IELTS, TOEFL or similar tests—may be considered, as can an equivalent university certificate only when it proves all four skills. Students able to obtain suitable evidence by 31 October were encouraged to do so. The Embassy also requested extra British Council IELTS sessions at preferential rates. On 1 September, the code ITALIA_PROMO reduced the displayed booking fee by 1,000 DA in a live checkout check. The published Embassy notice does not say that this code unlocks hidden or reserved sessions, and 31 October is the evidence deadline—not a verified expiry date for the code. Recheck the final price and available date before paying.',
    distinctionTitle: 'Admission is not the same decision as a visa',
    distinction: 'Some Italian universities accept Duolingo English Test, an internal interview or a medium-of-instruction letter for admission. That does not automatically make the same document sufficient for a study visa in Algeria. The Embassy evaluates the visa file separately, and its current university guidance names IELTS, Cambridge, TOEFL and Trinity for English-taught courses.',
    tableTitle: 'Where the three tests stand',
    rows: [
      ['IELTS', 'Explicitly named by the Embassy and listed as accepted for the Italian Embassy in Algeria.', 'Verify the B2/score requirement for your programme and visa file, then book an official Academic test unless the authority tells you otherwise.'],
      ['Duolingo English Test', 'Accepted by a number of Italian universities for admission, and in some separate Italian scholarship contexts. It is not named on the Embassy in Algiers’ current university-visa list.', 'Do not assume university acceptance settles the visa requirement. Obtain written confirmation from the competent visa authority before relying on it.'],
      ['British Council EnglishScore', 'A CEFR-aligned mobile certificate used by some institutions and employers. It is not IELTS and is not named on the Embassy’s current list.', 'Do not treat the British Council name as proof of visa acceptance. Ask for written confirmation before paying for a certificate.'],
    ],
    actionTitle: 'A safe decision path',
    actions: [
      'Keep the university admission rule and the visa-document rule as two separate checklists.',
      'Read the latest Embassy/VFS instructions for Algeria, not advice written for another country.',
      'Confirm the required level, test version, overall score, skill minimums and deadline in writing.',
      'If time is short, prefer evidence explicitly named by the Embassy rather than gambling on an unlisted alternative.',
      'Keep the official booking receipt, result-verification details and the page or email stating the requirement.',
    ],
    finalTitle: 'The practical conclusion',
    final: 'Duolingo or EnglishScore may be useful evidence in the right academic context, but neither should be presented as a guaranteed substitute for IELTS in an Algerian study-visa file. IELTS currently has the clearest published acceptance signal. Every application is still assessed individually, so no preparation centre or social-media post can guarantee a visa.',
    ctaTitle: 'Need to prepare for the computer-delivered IELTS?',
    cta: 'Train on the real computer format before paying for the official test.',
    ctaButton: 'Apply to IELTS Lab Oran',
  },
  fr: {
    title: 'Visa d’études Italie depuis l’Algérie : IELTS, Duolingo et EnglishScore en 2026',
    lead: 'Une université peut accepter un justificatif d’anglais pour l’admission, tandis que l’autorité italienne des visas peut demander une preuve différente. Cette distinction explique une grande partie de la confusion actuelle.',
    alertTitle: 'Ce qui a changé fin août et le 1er septembre 2026',
    alert: 'Le 27 août, l’Ambassade d’Italie à Alger a précisé que des certifications B2 appropriées et reconnues internationalement—comme IELTS, TOEFL ou des tests similaires—peuvent être prises en compte. Une attestation universitaire équivalente doit couvrir les quatre compétences. Les étudiants pouvant obtenir une preuve appropriée avant le 31 octobre ont été encouragés à le faire. L’Ambassade a aussi demandé au British Council d’ajouter des sessions IELTS à tarif préférentiel. Le 1er septembre, le code ITALIA_PROMO a réduit de 1 000 DA le prix affiché lors d’une vérification réelle du paiement. L’avis publié par l’Ambassade ne dit pas que ce code débloque des sessions cachées ou réservées, et le 31 octobre est la date limite pour fournir la preuve linguistique, et non une date d’expiration vérifiée du code. Revérifiez le prix final et la date disponible avant de payer.',
    distinctionTitle: 'Admission universitaire et visa : deux décisions distinctes',
    distinction: 'Certaines universités italiennes acceptent le Duolingo English Test, un entretien interne ou une attestation de langue d’enseignement pour l’admission. Cela ne rend pas automatiquement le même document suffisant pour le visa depuis l’Algérie. L’Ambassade évalue le dossier séparément et sa page actuelle cite IELTS, Cambridge, TOEFL et Trinity pour les cursus en anglais.',
    tableTitle: 'Situation des trois tests',
    rows: [
      ['IELTS', 'Explicitement cité par l’Ambassade et répertorié comme accepté par l’Ambassade d’Italie en Algérie.', 'Vérifiez le niveau B2 ou le score exigé, puis réservez un IELTS Academic officiel sauf instruction contraire.'],
      ['Duolingo English Test', 'Accepté par plusieurs universités italiennes pour l’admission et dans certains dispositifs de bourse distincts. Il ne figure pas dans la liste visa universitaire actuelle de l’Ambassade à Alger.', 'Ne confondez pas acceptation universitaire et visa. Demandez une confirmation écrite à l’autorité compétente avant de vous y fier.'],
      ['British Council EnglishScore', 'Certificat mobile aligné sur le CECR, utilisé par certaines institutions et entreprises. Ce n’est pas IELTS et il n’est pas cité dans la liste actuelle de l’Ambassade.', 'Le nom British Council ne prouve pas son acceptation pour le visa. Demandez une confirmation écrite avant d’acheter le certificat.'],
    ],
    actionTitle: 'La méthode la plus sûre',
    actions: [
      'Séparez la condition d’admission et la condition documentaire du visa.',
      'Lisez les dernières consignes Ambassade/VFS pour l’Algérie, pas celles d’un autre pays.',
      'Confirmez par écrit le niveau, la version du test, le score global, les minimums par compétence et la date limite.',
      'En cas d’urgence, privilégiez une preuve explicitement nommée par l’Ambassade.',
      'Conservez reçu, vérification du résultat et page ou e-mail précisant l’exigence.',
    ],
    finalTitle: 'Conclusion pratique',
    final: 'Duolingo et EnglishScore peuvent être utiles dans certains contextes académiques, mais aucun ne doit être présenté comme un remplacement garanti d’IELTS pour un visa étudiant depuis l’Algérie. IELTS dispose actuellement du signal d’acceptation publié le plus clair. Chaque dossier reste évalué individuellement.',
    ctaTitle: 'Vous devez préparer l’IELTS sur ordinateur ?',
    cta: 'Entraînez-vous au format informatique réel avant de payer le test officiel.',
    ctaButton: 'Candidater à IELTS Lab Oran',
  },
  ar: {
    title: 'تأشيرة الدراسة لإيطاليا من الجزائر: IELTS وDuolingo وEnglishScore في 2026',
    lead: 'قد تقبل الجامعة وثيقة معينة لإثبات الإنجليزية عند القبول، بينما تطلب جهة التأشيرة الإيطالية دليلاً مختلفاً. هذا الفرق هو سبب أساسي في الارتباك الذي يواجه الطلبة الجزائريين.',
    alertTitle: 'ما الذي تغيّر في نهاية أغسطس و1 سبتمبر 2026؟',
    alert: 'في 27 أغسطس أوضحت السفارة الإيطالية بالجزائر أن شهادات B2 المناسبة والمعترف بها دولياً—مثل IELTS وTOEFL أو ما شابه—يمكن أخذها في الاعتبار، كما يمكن قبول شهادة جامعية مكافئة فقط إذا أثبتت المهارات الأربع. وشجعت من يستطيع توفير الدليل المناسب قبل 31 أكتوبر على القيام بذلك. كما طلبت من British Council زيادة جلسات IELTS بأسعار تفضيلية. وفي 1 سبتمبر خفّض الرمز ITALIA_PROMO السعر الظاهر بمقدار 1,000 دج خلال تحقق مباشر من صفحة الدفع. لا يقول إعلان السفارة المنشور إن الرمز يفتح مواعيد مخفية أو محجوزة، و31 أكتوبر هو موعد تقديم إثبات اللغة وليس تاريخ انتهاء مؤكداً للرمز. تحقق من السعر النهائي والموعد المتاح قبل الدفع.',
    distinctionTitle: 'القبول الجامعي ليس قرار التأشيرة',
    distinction: 'تقبل بعض الجامعات الإيطالية Duolingo English Test أومقابلة داخلية أوشهادة لغة الدراسة للقبول. لكن ذلك لا يعني تلقائياً أن الوثيقة نفسها كافية للتأشيرة من الجزائر. السفارة تقيّم الملف بصورة مستقلة، وتذكر صفحتها الحالية IELTS وCambridge وTOEFL وTrinity للبرامج بالإنجليزية.',
    tableTitle: 'وضع الاختبارات الثلاثة',
    rows: [
      ['IELTS', 'مذكور صراحة من السفارة ومدرج كاختبار مقبول لدى السفارة الإيطالية في الجزائر.', 'تحقق من مستوى B2 أوالدرجة المطلوبة ثم احجز IELTS Academic رسمياً ما لم تخبرك الجهة المختصة بغير ذلك.'],
      ['Duolingo English Test', 'تقبله عدة جامعات إيطالية للقبول وبعض برامج المنح المنفصلة، لكنه غير مذكور في قائمة السفارة الحالية لتأشيرة الدراسة الجامعية.', 'لا تفترض أن قبول الجامعة يحسم التأشيرة. اطلب تأكيداً مكتوباً من جهة التأشيرة قبل الاعتماد عليه.'],
      ['British Council EnglishScore', 'شهادة عبر الهاتف مرتبطة بمستويات CEFR وتستخدمها بعض المؤسسات وأصحاب العمل. ليست IELTS وغير مذكورة في قائمة السفارة الحالية.', 'اسم British Council لا يثبت قبولها للتأشيرة. اطلب تأكيداً مكتوباً قبل شراء الشهادة.'],
    ],
    actionTitle: 'مسار قرار آمن',
    actions: [
      'افصل بين شرط القبول الجامعي وشرط وثائق التأشيرة.',
      'اقرأ آخر تعليمات السفارة وVFS الخاصة بالجزائر لا التعليمات الموجهة لدولة أخرى.',
      'أكد كتابياً المستوى ونسخة الاختبار والدرجة الإجمالية وحد كل مهارة والموعد النهائي.',
      'إذا كان الوقت ضيقاً فاختر دليلاً ذكرته السفارة صراحة بدلاً من المجازفة ببديل غير مدرج.',
      'احتفظ بوصل الحجز وبيانات التحقق من النتيجة والصفحة أوالرسالة التي تحدد الشرط.',
    ],
    finalTitle: 'الخلاصة العملية',
    final: 'قد يفيد Duolingo أوEnglishScore في سياق أكاديمي مناسب، لكن لا ينبغي تقديم أي منهما كبديل مضمون لـIELTS في ملف تأشيرة طالب جزائري. لدى IELTS حالياً أوضح إشارة قبول منشورة. ويبقى كل ملف خاضعاً لتقييم فردي.',
    ctaTitle: 'هل تحتاج إلى التحضير لـIELTS على الكمبيوتر؟',
    cta: 'تدرّب على الصيغة الحقيقية على الكمبيوتر قبل دفع رسوم الاختبار الرسمي.',
    ctaButton: 'قدّم إلى IELTS Lab Oran',
  },
} as const;

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = copy[locale];
  const description = articleDescription(locale, slug);
  const isRtl = locale === 'ar';

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-tight">{c.title}</h1>
        <p className="text-xl leading-relaxed text-gray-600 mb-10">{c.lead}</p>

        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8 mb-12">
          <h2 className="text-xl font-extrabold text-charcoal mb-3">{c.alertTitle}</h2>
          <p className="leading-relaxed text-gray-700">{c.alert}</p>
        </section>

        <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
          <h2 className="text-3xl font-extrabold mt-14 mb-5 text-charcoal tracking-tight">{c.distinctionTitle}</h2>
          <p>{c.distinction}</p>

          <h2 className="text-3xl font-extrabold mt-14 mb-6 text-charcoal tracking-tight">{c.tableTitle}</h2>
          <div className="not-prose grid gap-4">
            {c.rows.map(([testName, status, advice]) => (
              <section key={testName} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold text-charcoal">{testName}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{status}</p>
                <p className="mt-3 border-t border-gray-100 pt-3 text-sm font-semibold leading-relaxed text-gray-600">{advice}</p>
              </section>
            ))}
          </div>

          <h2 className="text-3xl font-extrabold mt-14 mb-5 text-charcoal tracking-tight">{c.actionTitle}</h2>
          <ol>
            {c.actions.map((action) => <li key={action}>{action}</li>)}
          </ol>

          <h2 className="text-3xl font-extrabold mt-14 mb-5 text-charcoal tracking-tight">{c.finalTitle}</h2>
          <p>{c.final}</p>

          <div className="not-prose mt-14 rounded-[2.5rem] bg-charcoal p-8 text-white md:p-10">
            <h2 className="text-2xl font-extrabold">{c.ctaTitle}</h2>
            <p className="mt-3 text-gray-200">{c.cta}</p>
            <Link href="/#intake" className="mt-6 inline-flex rounded-full bg-crimson px-7 py-3 font-bold text-white transition-opacity hover:opacity-90">
              {c.ctaButton}
            </Link>
          </div>
        </div>

        <div className="mt-16">
          <ArticleTrust
            locale={locale}
            slug={slug}
            title={c.title}
            description={description}
            reviewedAt={reviewedAt}
            sources={[
              { label: 'Italian Embassy in Algiers: study-visa clarification, 27 August 2026', href: 'https://ambalgeri.esteri.it/it/news/dall_ambasciata/2026/08/visti-per-studio-2026-2027-chiarimenti-sulle-procedure-e-sulle-misure-straordinarie-dellambasciata/' },
              { label: 'Italian Embassy in Algiers: university study requirements', href: 'https://ambalgeri.esteri.it/it/servizi-consolari-e-visti/servizi-per-il-cittadino-straniero/studio/universita/' },
              { label: 'VFS Global Algeria: student visa applicants', href: 'https://visa.vfsglobal.com/dza/en/ita/news/student-visa-applicants' },
              { label: 'Duolingo English Test: acceptance in Italian universities', href: 'https://blog.englishtest.duolingo.com/duolingo-english-test-accepted-in-italy-2/' },
              { label: 'British Council EnglishScore: test and certificate', href: 'https://www.englishscore.com/' },
            ]}
          />
        </div>
      </article>
      <ArticleMobileCta />
    </>
  );
}
