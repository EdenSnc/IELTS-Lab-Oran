import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getSpeakingAnxietyContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'overcoming-speaking-anxiety',
    title: articleSeoTitle(locale, 'overcoming-speaking-anxiety'),
    description: articleDescription(locale, 'overcoming-speaking-anxiety'),
    publishedTime: '2026-07-29',
    modifiedTime: '2026-11-18',
  });
}

const SPEAKING_AEO: Record<
  ArticleLocale,
  {
    summaryTitle: string;
    summaryText: string;
    tableTitle: string;
    tableHeaders: [string, string, string, string];
    tableRows: Array<[string, string, string, string]>;
    recoveryTitle: string;
    recoveryParagraph: string;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
  }
> = {
  en: {
    summaryTitle: 'Quick Answer — Managing IELTS Speaking Anxiety',
    summaryText:
      'IELTS Speaking lasts 11–14 minutes across three structured parts and assesses Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation equally (25% each). Control exam-day anxiety by treating the interview as clear communication rather than vocabulary perfection, sketching keyword bullet maps during Part 2’s 1-minute prep, and rehearsing under live timing without memorized answers.',
    tableTitle: 'IELTS Speaking Format & Pacing Breakdown (11–14 Minutes)',
    tableHeaders: ['Part', 'Duration', 'What Happens', 'Practical Anti-Anxiety Focus'],
    tableRows: [
      ['Part 1 (Introduction)', '4–5 minutes', 'Familiar questions on home, study, work, or daily habits', 'Answer in 2–3 natural sentences—avoid one-word replies or long speeches'],
      ['Part 2 (Long Turn)', '3–4 minutes (incl. 1m prep)', 'Speak for 1–2 minutes from a task card using scratch notes', 'Write 6–8 keywords + past/present/future anchors, never full sentences'],
      ['Part 3 (Discussion)', '4–5 minutes', 'Abstract analytical questions linked to your Part 2 theme', 'Buy 2 seconds naturally (“That depends on two main factors…”) and explain one clear example'],
    ],
    recoveryTitle: 'How to Recover If Your Mind Goes Blank Mid-Answer',
    recoveryParagraph:
      'Pausing briefly to think of an idea is normal and far less damaging than hesitating repeatedly to hunt for a rare idiom. If you lose a specific English word, paraphrase its meaning immediately using simple, accurate language—examiners actively reward effective circumlocution under Lexical Resource.',
    faqTitle: 'Frequently Asked Questions — IELTS Speaking in Algeria',
    faqs: [
      {
        q: 'Is IELTS Speaking still conducted with a human examiner when I take Computer IELTS in Algeria?',
        a: 'Yes. Even though Listening, Reading, and Writing are completed on a computer, IELTS Speaking remains a live 11–14 minute 1-on-1 interview with a certified human examiner (either in person at the centre or via secure video call at the test venue).',
      },
      {
        q: 'Does having an Algerian, French, or Arabic accent lower my Pronunciation score?',
        a: 'No. Accent is never penalized as long as your speech is clear, intelligible, and uses natural word stress, sentence rhythm, and intonation.',
      },
      {
        q: 'Can I ask the examiner to repeat or clarify a question?',
        a: 'Yes. In Parts 1 and 3 you can politely ask the examiner to repeat a question, and in Part 3 you can also ask what a specific word means without automatic score loss.',
      },
      {
        q: 'What happens if the examiner interrupts me before I finish my sentence?',
        a: 'Do not panic—examiners work to strict minute-by-minute timing rules. Being politely stopped at the 2-minute mark in Part 2 or during Part 3 simply means you spoke long enough and the test is moving forward.',
      },
    ],
  },
  fr: {
    summaryTitle: 'Réponse rapide — Gérer le stress à l’oral IELTS (Speaking)',
    summaryText:
      'L’épreuve IELTS Speaking dure 11 à 14 minutes en trois parties et évalue à parts égales (25 % chacun) la fluidité, le vocabulaire, la grammaire et la prononciation. Pour maîtriser votre stress, privilégiez la continuité du discours plutôt que la recherche du mot parfait, structurez votre minute de brouillon en Partie 2 par mots-clés, et entraînez-vous en conditions chronométrées sans réciter par cœur.',
    tableTitle: 'Déroulement des 3 parties du Speaking (11 à 14 minutes)',
    tableHeaders: ['Partie', 'Durée', 'Format', 'Réflexe anti-stress'],
    tableRows: [
      ['Partie 1 (Entretien)', '4–5 min', 'Questions familières (études, travail, quotidien)', 'Répondez en 2 ou 3 phrases fluides sans réciter de biographie'],
      ['Partie 2 (Monologue)', '3–4 min (dont 1 min prépa)', 'Parler 1 à 2 minutes à partir d’une carte sujet', 'Notez 6–8 mots-clés chronologiques sur le brouillon, jamais de phrases entières'],
      ['Partie 3 (Discussion)', '4–5 min', 'Questions abstraites et analytiques liées à la Partie 2', 'Reformulez brièvement l’enjeu puis illustrez par un exemple concret'],
    ],
    recoveryTitle: 'Que faire en cas de trou de mémoire pendant l’entretien ?',
    recoveryParagraph:
      'Chercher ses idées une seconde est naturel ; en revanche, bloquer longuement pour trouver un mot savant pénalise Fluency and Coherence. Si un terme précis vous échappe, reformulez-le simplement avec vos propres mots : la capacité à paraphraser est explicitement valorisée par les examinateurs.',
    faqTitle: 'Questions fréquentes — IELTS Speaking en Algérie',
    faqs: [
      {
        q: 'Le Speaking se passe-t-il toujours avec un examinateur humain pour l’IELTS sur ordinateur ?',
        a: 'Oui. Même si Listening, Reading et Writing se passent sur PC, l’épreuve Speaking reste un entretien individuel en direct de 11 à 14 minutes avec un examinateur certifié (sur place ou en visioconférence sécurisée au centre).',
      },
      {
        q: 'Un accent algérien ou francophone fait-il baisser la note de prononciation ?',
        a: 'Non. L’accent n’est jamais sanctionné tant que votre prononciation reste parfaitement compréhensible avec une accentuation et une intonation naturelles.',
      },
      {
        q: 'Puis-je demander à l’examinateur de répéter une question ?',
        a: 'Oui. Vous pouvez demander poliment de répéter une question en Parties 1 et 3, ou de clarifier un terme en Partie 3 sans pénalité.',
      },
      {
        q: 'Est-ce mauvais signe si l’examinateur m’interrompt ?',
        a: 'Pas du tout. L’examinateur suit un chronométrage officiel strict ; vous interrompre au bout de 2 minutes en Partie 2 signifie simplement que vous avez rempli le temps imparti.',
      },
    ],
  },
  ar: {
    summaryTitle: 'إجابة سريعة — كيف تتغلب على التوتر في محادثة IELTS Speaking؟',
    summaryText:
      'تستغرق مقابلة IELTS Speaking من 11 إلى 14 دقيقة مقسمة على ثلاثة أجزاء، وتُقيّم الطلاقة والترابط، المفردات، القواعد، والنطق بالتساوي (25% لكل معيار). للسيطرة على القلق يوم الامتحان، ركّز على وضوح التواصل بدلاً من البحث عن مفردات معقدة، واستثمر دقيقة التحضير في الجزء الثاني لكتابة كلمات مفتاحية فقط، وتدرّب بمؤقت حقيقي دون إجابات محفوظة.',
    tableTitle: 'تفصيل أجزاء اختبار المحادثة الثلاثة (11–14 دقيقة)',
    tableHeaders: ['الجزء', 'المدة', 'طبيعة الأسئلة', 'القاعدة العملية لتخفيف التوتر'],
    tableRows: [
      ['الجزء 1 (تعارف)', '4–5 دقائق', 'أسئلة مألوفة حول الدراسة أو العمل أو العادات اليومية', 'أجب في جملتين أو ثلاث جمل طبيعية دون إيجاز مخل أو إطالة متكلفة'],
      ['الجزء 2 (التحدث الفردي)', '3–4 دقائق (منها دقيقة تحضير)', 'التحدث لمدة دقيقة إلى دقيقتين حول بطاقة موضوع محددة', 'دوّن 6–8 كلمات مفتاحية مرتبة زمنياً ولا تضيع الدقيقة في كتابة جمل كاملة'],
      ['الجزء 3 (النقاش التحليلي)', '4–5 دقائق', 'أسئلة فكرية وعامة مرتبطة بموضوع الجزء الثاني', 'اشرح فكرة واحدة واضحة وادعمها بمثال واقعي بدلاً من التعميم'],
    ],
    recoveryTitle: 'كيف تتصرف إذا نسيت كلمة أثناء الحديث؟',
    recoveryParagraph:
      'التوقف القصير لترتيب الفكرة أمر طبيعي، أما التلعثم الطويل بحثاً عن مفردة صعبة فيخفض درجة الطلاقة. إذا غابت عنك كلمة محددة، اشرح معناها فوراً بعبارات بسيطة ودقيقة؛ فمهارة إعادة الصياغة (Paraphrasing) تُحتسب إيجابياً ضمن معيار المفردات.',
    faqTitle: 'الأسئلة الشائعة — محادثة IELTS في الجزائر',
    faqs: [
      {
        q: 'هل تبقى مقابلة المحادثة مع ممتحن بشري في اختبار الكمبيوتر بالجزائر؟',
        a: 'نعم، رغم إجراء الاستماع والقراءة والكتابة على الكمبيوتر، يظل قسم Speaking مقابلة فردية حية مدتها 11–14 دقيقة مع ممتحن معتمد (وجهاً لوجه أو عبر اتصال فيديو مؤمّن داخل المركز).',
      },
      {
        q: 'هل تؤثر اللكنة المحلية على درجة النطق (Pronunciation)؟',
        a: 'لا، لا يعاقب اختبار IELTS على اللكنة إطلاقاً طالما أن مخارج الحروف ونبر الكلمات وتنغيم الجمل واضحة ومفهومة تماماً للمستمع.',
      },
      {
        q: 'هل يحق لي طلب إعادة السؤال من الممتحن؟',
        a: 'نعم، يمكنك بأدب طلب إعادة السؤال في الجزأين الأول والثالث، أو الاستفسار عن معنى كلمة معينة في الجزء الثالث دون خصم درجات.',
      },
      {
        q: 'هل مقاطعة الممتحن لي تعني أن إجابتي ضعيفة؟',
        a: 'إطلاقاً؛ يلتزم الممتحن بتوقيت زمني صارم لكل جزء، ومقاطعته لك عند انتهاء الدقيقتين في الجزء الثاني تعني ببساطة أنك استوفيت الوقت المطلوب.',
      },
    ],
  },
};

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getSpeakingAnxietyContent(locale);
  const aeo = SPEAKING_AEO[locale];
  const isRtl = locale === 'ar';

  const sections = [
    {
      title: locale === 'ar' ? 'أدرك أنه اختبار للتواصل لا للكمال' : locale === 'fr' ? 'Reconnaître que c’est un test de communication, pas de perfection' : 'Acknowledge That It Is a Test of Communication, Not Perfection',
      body: locale === 'ar' ? 'قد يتوقف المرشح وهو يبحث عن كلمة متقدمة مثالية. أعط الأولوية لإجابة واضحة ومتواصلة، ثم استخدم المفردات الدقيقة التي تتحكم فيها. Fluency and Coherence أحد معايير التقييم الأربعة المتساوية.' : locale === 'fr' ? 'Un candidat peut se bloquer en cherchant le mot avancé parfait. Donnez la priorité à une réponse claire et continue, puis utilisez le vocabulaire précis que vous maîtrisez. Fluency and Coherence est l’un des quatre critères de poids égal.' : 'Candidates can freeze while searching for a perfect advanced word. Prioritise a clear, continuous response, then use precise vocabulary you control. Fluency and Coherence is one of four equally weighted criteria.',
    },
    {
      title: locale === 'ar' ? 'استراتيجية "دقيقة التحضير" للجزء الثاني' : locale === 'fr' ? 'La Stratégie de la « 1 Minute de Préparation » en Partie 2' : 'The Part 2 "1-Minute Prep" Strategy',
      body: locale === 'ar' ? 'في الجزء الثاني، لديك دقيقة واحدة للتحضير ثم تتحدث لمدة تصل إلى دقيقتين. لا تكتب جملاً كاملة على ورقة المسودة. اكتب نقاطاً تحتوي على الكلمات المفتاحية والعبارات الانتقالية. وجود خريطة هيكلية يمنعك من التيه والتذعر عند فقدان خيط أفكارك.' : locale === 'fr' ? 'En Partie 2, vous avez une minute de préparation, puis vous parlez pendant deux minutes au maximum. N’écrivez pas de phrases complètes sur le brouillon. Notez des mots-clés et des transitions. Cette carte structurelle vous évite de vous perdre si vous perdez le fil.' : 'In Part 2, you have one minute to prepare, then you speak for up to two minutes. Do not write full sentences on the scrap paper. Note keywords and transitions. This structural map helps you recover if you lose your train of thought.',
    },
    {
      title: locale === 'ar' ? 'محاكاة الضغط تدريجياً' : locale === 'fr' ? 'Simuler la Pression Progressivement' : 'Simulate the Pressure Progressively',
      body: locale === 'ar' ? 'التكرار المنظم يمكن أن يقلل عدم اليقين. ابدأ بالتسجيل الذاتي، ثم تدرب مع شريك، ثم نفّذ مقابلات تجريبية موقوتة. الهدف ليس محاكاة كل شعور، بل جعل صيغة الأجزاء الثلاثة وطريقة الإجابة مألوفتين.' : locale === 'fr' ? 'Une pratique progressive peut réduire l’incertitude : commencez par vous enregistrer, continuez avec un partenaire, puis passez à des entretiens blancs chronométrés. L’objectif n’est pas de reproduire chaque sensation, mais de rendre familiers les trois parties et le rythme.' : 'Progressive practice can reduce uncertainty: start with self-recording, continue with a partner, then move to timed mock interviews. The goal is not to reproduce every feeling, but to make the three-part format and response rhythm familiar.',
    },
  ];

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
            <p className="lead text-xl text-gray-600 mb-8 font-medium">
              {c.lead}{' '}
              <Link href="/" className="text-[#b81428] font-bold hover:underline">
                {locale === 'ar' ? 'التحضير للايلتس في وهران' : locale === 'fr' ? 'préparation IELTS à Oran' : 'IELTS preparation in Oran'}
              </Link>
              .
            </p>

            <div className="space-y-8 my-12 not-prose">
              {sections.map((section, i) => (
                <div key={i} className="bg-white border border-gray-200/80 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-crimson/5 rounded-full blur-xl group-hover:bg-crimson/10 transition-colors z-0" />
                  <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-charcoal text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-md transform group-hover:rotate-6 transition-transform">
                      {i + 1}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-charcoal mb-3 leading-tight">{section.title}</h2>
                      <p className="text-gray-600 leading-relaxed m-0">{section.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-3xl font-extrabold mt-14 mb-6 text-charcoal tracking-tight">{aeo.tableTitle}</h2>
            <div className="not-prose overflow-x-auto rounded-2xl border border-gray-200 shadow-sm my-8">
              <table className="w-full border-collapse text-start text-sm">
                <thead>
                  <tr className="bg-charcoal text-white">
                    {aeo.tableHeaders.map((h) => (
                      <th key={h} className="p-4 font-bold border-b border-white/10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {aeo.tableRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="p-4 font-bold text-charcoal bg-gray-50">{row[0]}</td>
                      <td className="p-4 font-semibold text-[#b81428] whitespace-nowrap">{row[1]}</td>
                      <td className="p-4 text-gray-700">{row[2]}</td>
                      <td className="p-4 text-gray-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-3xl font-extrabold mt-14 mb-4 text-charcoal tracking-tight">{aeo.recoveryTitle}</h2>
            <p>{aeo.recoveryParagraph}</p>

            <h2 className="text-3xl font-extrabold mt-14 mb-6 text-charcoal tracking-tight">{aeo.faqTitle}</h2>
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
              slug="overcoming-speaking-anxiety"
              title={c.title}
              description={articleDescription(locale, 'overcoming-speaking-anxiety')}
              publishedAt="2026-07-29"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label: locale === 'fr'
                    ? 'IELTS.org : format de l’épreuve orale (Speaking)'
                    : locale === 'ar'
                      ? 'IELTS.org: صيغة اختبار المحادثة Speaking'
                      : 'IELTS.org: IELTS Speaking test format',
                  href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking',
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
