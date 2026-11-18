import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
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
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-18',
  });
}

const copy = {
  en: {
    summaryTitle: 'Quick Answer — IELTS Writing Task 2 Planning Method',
    summaryText:
      'IELTS Writing Task 2 carries twice the score weight of Task 1 and requires at least 250 words in roughly 40 minutes. To reach Band 7.0+, spend your first 5–7 minutes analysing the exact prompt and selecting two well-supported body ideas, type 260–310 clear words on screen, and save 4–5 minutes to audit grammar and cohesion—never rely on memorized essay templates.',
    factsTitle: 'What the official format requires',
    facts: [
      'Write at least 250 words in about 40 minutes.',
      'Task 2 contributes twice as much as Task 1 to the Writing score.',
      'Examiners assess Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.',
    ],
    methodTitle: 'A reliable 40-minute planning workflow',
    stages: [
      ['1. Analyse (2 min)', 'Identify every instruction word and decide your clear position before typing a single sentence.'],
      ['2. Select (4 min)', 'Choose two developed ideas you can explain and support with concrete examples; listing four shallow points lowers Task Response.'],
      ['3. Draft on PC (29 min)', 'Write a concise 2-sentence introduction, two focused body paragraphs, and a direct conclusion while watching the automatic word counter.'],
      ['4. Audit (5 min)', 'Check prompt coverage, paragraph progression, repeated words, subject-verb agreement, articles, and spelling.'],
    ],
    tableTitle: '40-Minute Computer Task 2 Time & Rubric Breakdown',
    tableHeaders: ['Criterion (25% each)', 'What Band 7+ Requires', 'Common Trap to Avoid'],
    tableRows: [
      ['Task Response', 'Addresses all parts of the prompt with a clear position throughout', 'Answering the general topic instead of the specific question'],
      ['Coherence & Cohesion', 'One central topic per paragraph with natural linking', 'Starting every single sentence with mechanical connectors'],
      ['Lexical Resource', 'Topic-specific collocations used accurately', 'Forcing rare idioms or misspelled “big words”'],
      ['Grammatical Range & Accuracy', 'Mix of complex and simple structures with frequent error-free sentences', 'Long run-on sentences that lose punctuation control'],
    ],
    warning:
      'No template or paragraph count guarantees Band 7. The structure must fit the question, and memorized language can sound unnatural or fail to answer the task.',
    discuss:
      'For “discuss both views and give your opinion” prompts, develop both perspectives fairly and state your own position clearly in the introduction and conclusion. For direct opinion or problem/solution prompts, do not force an artificial concession.',
    faqTitle: 'Frequently Asked Questions — IELTS Writing Task 2',
    faqs: [
      {
        q: 'Does computer-delivered IELTS show my exact word count automatically?',
        a: 'Yes. The official computer Writing screen displays a live automatic word counter for both Task 1 and Task 2, eliminating manual word counting and letting you focus on planning and editing.',
      },
      {
        q: 'Is there an upper word limit in IELTS Writing Task 2?',
        a: 'There is a minimum of 250 words and no official maximum, but writing 400+ words often reduces proofreading time and increases grammatical slips; 265–320 well-controlled words is a practical target.',
      },
      {
        q: 'Should I do Writing Task 2 before Task 1 on exam day?',
        a: 'Because Task 2 is worth twice as much as Task 1, strictly protect 40 minutes for Task 2 and cap Task 1 at 20 minutes—on computer you can switch between Task 1 and Task 2 freely.',
      },
      {
        q: 'Do examiners penalize memorized essay templates?',
        a: 'Yes. Official assessment guidance flags memorized openings and formulaic filler phrases because they fail to address the exact question wording and distort lexical naturalness.',
      },
    ],
  },
  fr: {
    summaryTitle: 'Réponse rapide — Méthode IELTS Writing Task 2',
    summaryText:
      'La Tâche 2 (Writing Task 2) compte deux fois plus que la Tâche 1 et exige au minimum 250 mots en environ 40 minutes. Pour viser Band 7.0+, consacrez 5 à 7 minutes à analyser la consigne et planifier deux arguments développés, rédigez au clavier entre 260 et 310 mots clairs, et gardez 5 minutes de relecture — sans utiliser de modèles récités.',
    factsTitle: 'Ce que le format officiel exige',
    facts: [
      'Écrivez au moins 250 mots en environ 40 minutes.',
      'La Tâche 2 compte deux fois plus que la Tâche 1 dans le score Writing.',
      'Les critères sont Task Response, Coherence and Cohesion, Lexical Resource, et Grammatical Range and Accuracy.',
    ],
    methodTitle: 'Une méthode de planification fiable en 40 minutes',
    stages: [
      ['1. Analyser (2 min)', 'Repérez chaque terme de la consigne et fixez votre position avant de commencer à taper.'],
      ['2. Sélectionner (4 min)', 'Choisissez deux idées solides que vous pouvez expliquer et illustrer ; multiplier les idées superficielles pénalise Task Response.'],
      ['3. Rédiger sur PC (29 min)', 'Écrivez une introduction directe, deux paragraphes argumentés et une conclusion claire en suivant le compteur automatique de mots.'],
      ['4. Relire (5 min)', 'Vérifiez la réponse à la consigne, la cohérence logique, les répétitions, les accords et l’orthographe.'],
    ],
    tableTitle: 'Grille des 4 critères officiels (25 % chacun)',
    tableHeaders: ['Critère (25 %)', 'Attendu pour Band 7+', 'Piège fréquent à éviter'],
    tableRows: [
      ['Task Response', 'Traite toutes les parties du sujet avec une position claire', 'Parler du thème général sans répondre à la question précise'],
      ['Coherence & Cohesion', 'Une idée centrale par paragraphe et transitions fluides', 'Abuser de connecteurs mécaniques à chaque phrase'],
      ['Lexical Resource', 'Collocations précises et naturelles liées au sujet', 'Insérer du vocabulaire rare mal maîtrisé'],
      ['Grammatical Range', 'Alternance de phrases simples et complexes sans fautes récurrentes', 'Phrases trop longues qui perdent la ponctuation'],
    ],
    warning:
      'Aucun modèle ni nombre de paragraphes ne garantit Band 7. La structure doit répondre à la question ; un texte mémorisé peut sembler artificiel ou manquer la consigne.',
    discuss:
      'Pour « discuss both views and give your opinion », développez les deux points de vue et affirmez clairement votre avis dès l’introduction. Pour les autres types de sujets, ne forcez pas une concession artificielle.',
    faqTitle: 'Questions fréquentes — IELTS Writing Task 2',
    faqs: [
      {
        q: 'L’écran affiche-t-il automatiquement le nombre de mots lors de l’examen sur ordinateur ?',
        a: 'Oui. L’interface officielle sur ordinateur affiche en temps réel le nombre exact de mots en Task 1 et Task 2, tout en permettant de copier-coller et réorganiser vos phrases.',
      },
      {
        q: 'Existe-t-il une limite maximale de mots en Task 2 ?',
        a: 'Le minimum est de 250 mots sans plafond officiel, mais viser 265 à 320 mots bien relus est beaucoup plus sûr que d’écrire 400 mots truffés d’erreurs d’inattention.',
      },
      {
        q: 'Faut-il privilégier Task 2 dans la gestion du temps ?',
        a: 'Oui. La Tâche 2 valant le double de la Tâche 1, limitez strictement la Tâche 1 à 20 minutes pour préserver 40 minutes complètes sur la Tâche 2.',
      },
      {
        q: 'Les modèles d’essais appris par cœur sont-ils pénalisés ?',
        a: 'Oui. Les examinateurs repèrent immédiatement les phrases préfabriquées qui ne répondent pas précisément à l’énoncé.',
      },
    ],
  },
  ar: {
    summaryTitle: 'إجابة سريعة — منهجية التخطيط لمقال IELTS Writing Task 2',
    summaryText:
      'تمثل المهمة الثانية (Task 2) ثلثي درجة قسم الكتابة وتتطلب كتابة 250 كلمة على الأقل في نحو 40 دقيقة. لاستهداف Band 7.0+، خصص أول 5–7 دقائق لتحليل السؤال بدقة واختيار فكرتين مدعومتين بالأمثلة، واكتب ما بين 265 و310 كلمات واضحة على الكمبيوتر، واترك 5 دقائق للمراجعة اللغوية بعيداً عن القوالب الجاهزة.',
    factsTitle: 'ما الذي يتطلبه التنسيق الرسمي',
    facts: [
      'اكتب 250 كلمة على الأقل في نحو 40 دقيقة.',
      'تُحتسب Task 2 بضعف وزن Task 1 في درجة Writing.',
      'يقيم المصحح Task Response وCoherence and Cohesion وLexical Resource وGrammatical Range and Accuracy.',
    ],
    methodTitle: 'طريقة تخطيط موثوقة خلال 40 دقيقة',
    stages: [
      ['1. حلّل (دقيقتان)', 'حدد كل كلمة توجيهية في السؤال واتخذ موقفاً واضحاً قبل البدء في الطباعة.'],
      ['2. اختر (4 دقائق)', 'اختر فكرتين رئيسيتين تستطيع شرحهما وتدعيمهما بالأمثلة؛ تكديس الأفكار السطحية يضعف معيار Task Response.'],
      ['3. اكتب على الكمبيوتر (29 دقيقة)', 'اكتب مقدمة موجزة وفقرتي عرض مترابطتين وخاتمة واضحة مع متابعة عداد الكلمات التلقائي.'],
      ['4. راجع (5 دقائق)', 'افحص تغطية المطلوب، تسلسل الأفكار، تنوع المفردات، سلامة الأزمنة، والإملاء.'],
    ],
    tableTitle: 'معايير التصحيح الرسمية الأربعة (25% لكل معيار)',
    tableHeaders: ['المعيار (25%)', 'المطلوب لبلوغ Band 7+', 'الخطأ الشائع الذي يجب تجنبه'],
    tableRows: [
      ['Task Response', 'الإجابة عن جميع أجزاء السؤال بموقف واضح ومتسق', 'الكتابة حول الموضوع العام وتجاهل السؤال الدقيق'],
      ['Coherence & Cohesion', 'فكرة مركزية واحدة لكل فقرة مع أدوات ربط طبيعية', 'بدء كل جملة بأدوات ربط آلية مكررة'],
      ['Lexical Resource', 'متلازمات لفظية دقيقة ومناسبة للسياق الأكاديمي', 'حشو كلمات نادرة أو مصطلحات في غير محلها'],
      ['Grammatical Range', 'مزج الجمل البسيطة والمركبة مع كثرة الجمل الخالية من الأخطاء', 'إطالة الجمل بشكل يفقد السيطرة على علامات الترقيم'],
    ],
    warning:
      'لا يضمن أي قالب أوعدد فقرات Band 7. يجب أن يناسب التنظيم السؤال، وقد تبدو اللغة المحفوظة مصطنعة أوتفشل في الإجابة عن المطلوب.',
    discuss:
      'في أسئلة “discuss both views and give your opinion”، ناقش الرأيين بإنصاف وأعلن رأيك الشخصي بوضوح في المقدمة والخاتمة. أما في الأسئلة المباشرة فلا تفرض تناقضاً مصطنعاً.',
    faqTitle: 'الأسئلة الشائعة — كتابة مقال IELTS Writing Task 2',
    faqs: [
      {
        q: 'هل يحسب اختبار الكمبيوتر عدد الكلمات تلقائياً؟',
        a: 'نعم، تعرض واجهة الكتابة الرسمية على الكمبيوتر عداد كلمات تلقائياً وفورياً لكل من Task 1 وTask 2 مع إمكانية النسخ واللصق والتعديل السريع.',
      },
      {
        q: 'هل يوجد حد أقصى لعدد الكلمات في Task 2؟',
        a: 'الحد الأدنى هو 250 كلمة ولا يوجد حد أقصى رسمي، لكن كتابة 265 إلى 320 كلمة مركزة ومدققة أفضل بكثير من كتابة 400 كلمة مليئة بالأخطاء النحوية.',
      },
      {
        q: 'كيف أقسم الوقت بين المهمة الأولى والثانية؟',
        a: 'بما أن Task 2 تعادل ضعف وزن Task 1، التزم بـ 20 دقيقة كحد أقصى للمهمة الأولى واحمِ 40 دقيقة كاملة لتخطيط وكتابة ومراجعة Task 2.',
      },
      {
        q: 'هل تؤدي القوالب المحفوظة إلى خفض الدرجة؟',
        a: 'نعم، يرصد المصححون العبارات المحفوظة مسبقاً بسهولة لأنها تبدو مصطنعة وغالباً ما تفشل في الإجابة عن صيغة السؤال المحددة.',
      },
    ],
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
      <main
        id="main-content"
        className={`pt-32 pb-24 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <article>
          <ArticleBreadcrumb locale={locale} title={c.title} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            {c.title}
          </h1>

          <div className="bg-white border-s-4 border-crimson p-6 rounded-e-2xl shadow-sm mb-8">
            <h2 className="text-charcoal font-bold text-lg mb-2">{t.summaryTitle}</h2>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed m-0">{t.summaryText}</p>
          </div>

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
                  <h3 className="text-lg font-extrabold text-[#b81428]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
                </section>
              ))}
            </div>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal">{t.tableTitle}</h2>
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
                      <td className="p-4 text-gray-600">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              {t.warning}
            </p>
            <p>{t.discuss}</p>

            <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal">{t.faqTitle}</h2>
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
              slug="writing-task-2-tactics"
              title={c.title}
              description={description}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label: locale === 'fr'
                    ? 'IELTS.org : format Academic Writing et poids de la Task 2'
                    : locale === 'ar'
                      ? 'IELTS.org: صيغة الكتابة الأكاديمية وأهمية Task 2'
                      : 'IELTS.org: Academic Writing format and Task 2 weighting',
                  href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing',
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
