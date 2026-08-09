import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getWritingTask2Content, ArticleLocale } from '@/lib/articleContent';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: ArticleLocale }>;
}) {
  const { locale } = await params;
  const description = articleDescription(locale, 'writing-task-2-tactics');
  return buildArticleMetadata({
    locale,
    slug: 'writing-task-2-tactics',
    title: articleSeoTitle(locale, 'writing-task-2-tactics'),
    description,
  });
}

const copy = {
  en: {
    factsTitle: 'What the official format requires',
    facts: [
      'Write at least 250 words in about 40 minutes.',
      'Task 2 contributes twice as much as Task 1 to the Writing score.',
      'Examiners assess Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.',
    ],
    methodTitle: 'A reliable planning workflow',
    stages: [
      ['1. Analyse', 'Identify every instruction word and decide your position before writing.'],
      ['2. Select', 'Choose two developed ideas you can explain and support; more ideas are not automatically better.'],
      ['3. Organise', 'Use a clear introduction, logically separated body paragraphs, and a conclusion. Four paragraphs are a useful default, not an IELTS rule.'],
      ['4. Check', 'Reserve time for task coverage, paragraph logic, repetition, grammar, spelling, and the 250-word minimum.'],
    ],
    warning:
      'No template or paragraph count guarantees Band 7. The structure must fit the question, and memorized language can sound unnatural or fail to answer the task.',
    discuss:
      'For “discuss both views” questions, cover both views and give your own opinion if the prompt asks for it. For other question types, do not force an artificial concession.',
  },
  fr: {
    factsTitle: 'Ce que le format officiel exige',
    facts: [
      'Écrivez au moins 250 mots en environ 40 minutes.',
      'La Tâche 2 compte deux fois plus que la Tâche 1 dans le score Writing.',
      'Les critères sont Task Response, Coherence and Cohesion, Lexical Resource, et Grammatical Range and Accuracy.',
    ],
    methodTitle: 'Une méthode de planification fiable',
    stages: [
      ['1. Analyser', 'Repérez chaque consigne et décidez votre position avant d’écrire.'],
      ['2. Sélectionner', 'Choisissez deux idées que vous pouvez expliquer et soutenir ; davantage d’idées n’est pas automatiquement mieux.'],
      ['3. Organiser', 'Utilisez une introduction claire, des paragraphes logiques et une conclusion. Quatre paragraphes sont un bon défaut, pas une règle IELTS.'],
      ['4. Vérifier', 'Gardez du temps pour la consigne, la logique, les répétitions, la grammaire, l’orthographe et le minimum de 250 mots.'],
    ],
    warning:
      'Aucun modèle ni nombre de paragraphes ne garantit Band 7. La structure doit répondre à la question ; un texte mémorisé peut sembler artificiel ou manquer la consigne.',
    discuss:
      'Pour « discuss both views », traitez les deux points de vue et donnez votre opinion si la consigne le demande. Pour les autres types, ne forcez pas une concession artificielle.',
  },
  ar: {
    factsTitle: 'ما الذي يتطلبه التنسيق الرسمي',
    facts: [
      'اكتب 250 كلمة على الأقل في نحو 40 دقيقة.',
      'تُحتسب Task 2 بضعف وزن Task 1 في درجة Writing.',
      'يقيم المصحح Task Response وCoherence and Cohesion وLexical Resource وGrammatical Range and Accuracy.',
    ],
    methodTitle: 'طريقة تخطيط موثوقة',
    stages: [
      ['1. حلّل', 'حدد كل كلمة توجيهية واتخذ موقفك قبل أن تبدأ الكتابة.'],
      ['2. اختر', 'اختر فكرتين تستطيع شرحهما ودعمهما؛ كثرة الأفكار ليست أفضل تلقائياً.'],
      ['3. نظّم', 'استخدم مقدمة واضحة وفقرات مترابطة وخاتمة. أربع فقرات خيار عملي شائع وليست قاعدة IELTS.'],
      ['4. راجع', 'خصص وقتاً لتغطية المطلوب ومنطق الفقرات والتكرار والقواعد والإملاء والحد الأدنى 250 كلمة.'],
    ],
    warning:
      'لا يضمن أي قالب أوعدد فقرات Band 7. يجب أن يناسب التنظيم السؤال، وقد تبدو اللغة المحفوظة مصطنعة أوتفشل في الإجابة عن المطلوب.',
    discuss:
      'في أسئلة “discuss both views”، ناقش الرأيين وقدّم رأيك إذا طلبه السؤال. لا تفرض رأياً مضاداً مصطنعاً على أنواع الأسئلة الأخرى.',
  },
} as const;

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getWritingTask2Content(locale);
  const t = copy[locale];
  const description = articleDescription(locale, 'writing-task-2-tactics');
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
        <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
          <p className="lead text-xl text-gray-600">{c.lead}</p>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal">{t.factsTitle}</h2>
          <ul>
            {t.facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal">{t.methodTitle}</h2>
          <div className="not-prose grid gap-4 md:grid-cols-2">
            {t.stages.map(([title, text]) => (
              <section key={title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-extrabold text-crimson">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
              </section>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            {t.warning}
          </p>
          <p>{t.discuss}</p>

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
            slug="writing-task-2-tactics"
            title={c.title}
            description={description}
            sources={[
              {
                label: 'IELTS.org: Academic Writing format and Task 2 weighting',
                href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing',
              },
            ]}
          />
        </div>
      </article>
      <ArticleMobileCta />
    </>
  );
}
