import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import ClbCalculator from '@/components/ClbCalculator';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getIeltsVsToeflContent, ArticleLocale } from '@/lib/articleContent';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: ArticleLocale }>;
}) {
  const { locale } = await params;
  const description = articleDescription(locale, 'ielts-vs-toefl-canada');
  return buildArticleMetadata({
    locale,
    slug: 'ielts-vs-toefl-canada',
    title: articleSeoTitle(locale, 'ielts-vs-toefl-canada'),
    description,
  });
}

const copy = {
  en: {
    practicalTitle: 'The two practical routes from Algeria',
    ieltsTitle: 'English route: IELTS General Training',
    ieltsDescription:
      'This is the locally verified English option for Express Entry. British Council Algeria currently offers IELTS General Training on computer for 40,000 DZD.',
    ieltsPoints: [
      'Available to book in Algeria',
      'Accepted by IRCC for Express Entry',
      'Do not book IELTS Academic for Express Entry',
    ],
    tcfTitle: 'French route: TCF Canada',
    tcfDescription:
      'This is the locally verifiable French alternative. Institut français d’Algérie describes online registration for TCF Canada and operates an Oran branch.',
    tcfPoints: [
      'Useful when French is genuinely one of your strongest languages',
      'Accepted by IRCC for Express Entry',
      'Check the live session and branch before paying',
    ],
    otherTitle: 'Can you take the other approved tests from Oran?',
    otherPoints: [
      'CELPIP-General is accepted by IRCC, but CELPIP currently lists no test centre in Algeria. Choosing it would require travel.',
      'PTE Core is accepted by IRCC and must be taken at an authorised test centre. Confirm a real Algerian centre and a bookable date in Pearson’s booking system before choosing it.',
      'TEF Canada is an accepted French test, but we could not verify a current Algerian session from the official pages reviewed. TCF Canada is the French option we could verify through Institut français d’Algérie.',
    ],
    notAcceptedTitle: 'Do not use these for Express Entry',
    intro:
      'Canada uses different language-test rules for immigration and university admission. For Express Entry, use only a test named by Immigration, Refugees and Citizenship Canada (IRCC). IELTS General Training is the most relevant option to compare first in Algeria; a university may publish a different list for admission.',
    acceptedTitle: 'Which tests does IRCC accept for Express Entry?',
    english: 'English',
    french: 'French',
    englishTests: ['CELPIP-General', 'IELTS General Training', 'PTE Core'],
    frenchTests: ['TEF Canada', 'TCF Canada'],
    names:
      'CELPIP means Canadian English Language Proficiency Index Program. PTE Core means Pearson Test of English Core. They are separate English tests, not types of IELTS.',
    availability:
      'Local reality: the current CELPIP test-location list does not include Algeria. PTE Core availability must be checked in Pearson’s live booking system. Do not choose either test until you confirm where you can take it and whether the travel is practical.',
    notAccepted:
      'TOEFL and IELTS Academic cannot be submitted as Express Entry language proof. A university may accept either for admission, but university admission is a separate application. If you need both university admission and Express Entry, verify whether you need IELTS Academic for the university and IELTS General Training for IRCC.',
    academicTitle: 'Can IELTS Academic be used for Express Entry?',
    academicText:
      'No. IRCC explicitly requires IELTS General Training for Express Entry. If an Algerian university graduate needs IELTS Academic for a Canadian university and also wants an Express Entry profile, those are two different purposes and may require two separate tests.',
    bilingualTitle: 'Is it useful to submit both French and English?',
    bilingualText:
      'Often, yes, especially for Algerian professionals who already use both languages. But a second test is valuable only when the expected score crosses a real IRCC threshold.',
    bilingualPoints: [
      'French at NCLC 7 or higher in all four skills can qualify for the French-language category, subject to the other Express Entry rules.',
      'NCLC 7 French plus CLB 5 or higher English in all four skills currently earns 50 additional CRS points for French-language proficiency.',
      'A second official language can also add core CRS points: up to 24 without a spouse or 22 with a spouse.',
    ],
    bilingualDecision:
      'Practical Oran strategy: take your stronger language first, calculate the resulting CRS, then pay for the second test only if a realistic score changes eligibility, category access or ranking. For many francophone Algerians, TCF Canada plus IELTS General Training can be a stronger combination than treating English as the only route.',
    professionalsTitle: 'What Algerian professionals should check besides language',
    professionalsText:
      'Your occupation code, education credential assessment and, where applicable, Canadian licensing remain separate from the language test. Current category-based selection includes French-language proficiency and several professional fields, but categories can change. An engineer, healthcare worker, teacher or tradesperson should verify the current category and occupation list before building the entire plan around it.',
    clbTitle: 'Why candidates target CLB 9',
    clbText:
      'CLB 9 is an important threshold because some Comprehensive Ranking System skill-transferability factors improve at that level. The exact point effect depends on the complete profile; it is not an automatic 50-point increase for everyone.',
    osr:
      'IRCC currently states that IELTS One Skill Retake is not accepted for Express Entry.',
    table: ['CLB', 'Listening', 'Reading', 'Writing', 'Speaking'],
  },
  fr: {
    practicalTitle: 'Les deux parcours pratiques depuis l’Algérie',
    ieltsTitle: 'Parcours anglais : IELTS General Training',
    ieltsDescription:
      'C’est l’option anglaise vérifiée localement pour Entrée express. Le British Council Algérie propose actuellement IELTS General Training sur ordinateur à 40 000 DZD.',
    ieltsPoints: [
      'Réservable en Algérie',
      'Accepté par IRCC pour Entrée express',
      'Ne réservez pas IELTS Academic pour Entrée express',
    ],
    tcfTitle: 'Parcours français : TCF Canada',
    tcfDescription:
      'C’est l’alternative française vérifiable localement. L’Institut français d’Algérie décrit l’inscription en ligne au TCF Canada et dispose d’une antenne à Oran.',
    tcfPoints: [
      'Utile si le français est réellement l’une de vos langues fortes',
      'Accepté par IRCC pour Entrée express',
      'Vérifiez la session et l’antenne avant de payer',
    ],
    otherTitle: 'Peut-on passer les autres tests approuvés depuis Oran ?',
    otherPoints: [
      'CELPIP-General est accepté par IRCC, mais CELPIP ne répertorie actuellement aucun centre en Algérie. Il faudrait donc voyager.',
      'PTE Core est accepté par IRCC et doit être passé dans un centre agréé. Confirmez un centre algérien réel et une date réservable dans le système Pearson avant de le choisir.',
      'TEF Canada est un test de français accepté, mais nous n’avons pas vérifié de session algérienne actuelle sur les pages officielles consultées. TCF Canada est l’option française que nous avons pu vérifier auprès de l’Institut français d’Algérie.',
    ],
    notAcceptedTitle: 'Ne les utilisez pas pour Entrée express',
    intro:
      'Le Canada applique des règles différentes pour l’immigration et l’admission universitaire. Pour Entrée express, utilisez uniquement un test nommé par Immigration, Réfugiés et Citoyenneté Canada (IRCC). En Algérie, IELTS General Training est l’option à comparer en premier ; une université peut publier une autre liste.',
    acceptedTitle: 'Quels tests IRCC accepte-t-il pour Entrée express ?',
    english: 'Anglais',
    french: 'Français',
    englishTests: ['CELPIP-General', 'IELTS General Training', 'PTE Core'],
    frenchTests: ['TEF Canada', 'TCF Canada'],
    names:
      'CELPIP signifie Canadian English Language Proficiency Index Program. PTE Core signifie Pearson Test of English Core. Ce sont des tests d’anglais distincts, et non des versions de l’IELTS.',
    availability:
      'Réalité locale : la liste actuelle des centres CELPIP ne comprend pas l’Algérie. La disponibilité de PTE Core doit être vérifiée dans le système de réservation Pearson. Ne choisissez aucun de ces tests sans confirmer le lieu et la faisabilité du déplacement.',
    notAccepted:
      'TOEFL et IELTS Academic ne peuvent pas servir de preuve linguistique pour Entrée express. Une université peut accepter l’un ou l’autre pour l’admission, mais il s’agit d’une demande distincte. Si vous visez à la fois une université et Entrée express, vérifiez si vous avez besoin d’IELTS Academic pour l’université et d’IELTS General Training pour IRCC.',
    academicTitle: 'Peut-on utiliser IELTS Academic pour Entrée express ?',
    academicText:
      'Non. IRCC exige explicitement IELTS General Training pour Entrée express. Si un diplômé algérien doit passer IELTS Academic pour une université canadienne et souhaite aussi créer un profil Entrée express, il s’agit de deux objectifs distincts qui peuvent exiger deux tests séparés.',
    bilingualTitle: 'Est-il utile de présenter le français et l’anglais ?',
    bilingualText:
      'Souvent oui, surtout pour les professionnels algériens qui utilisent déjà les deux langues. Mais un deuxième test n’est rentable que si le score attendu franchit un véritable seuil IRCC.',
    bilingualPoints: [
      'Un niveau NCLC 7 ou plus dans les quatre compétences en français peut ouvrir la catégorie de compétence en français, sous réserve des autres règles d’Entrée express.',
      'NCLC 7 en français plus CLB 5 ou plus dans les quatre compétences en anglais donne actuellement 50 points CRS supplémentaires pour le français.',
      'La deuxième langue officielle peut aussi ajouter des points CRS de base : jusqu’à 24 sans conjoint ou 22 avec conjoint.',
    ],
    bilingualDecision:
      'Stratégie pratique depuis Oran : passez d’abord votre langue la plus forte, calculez le CRS obtenu, puis payez le deuxième test uniquement si un score réaliste change l’admissibilité, l’accès à une catégorie ou le classement. Pour de nombreux Algériens francophones, TCF Canada plus IELTS General Training peut être plus puissant que de miser uniquement sur l’anglais.',
    professionalsTitle: 'Ce que les professionnels algériens doivent vérifier en plus de la langue',
    professionalsText:
      'Le code de profession, l’évaluation des diplômes d’études et, lorsque nécessaire, l’autorisation professionnelle canadienne restent distincts du test linguistique. La sélection par catégorie actuelle comprend le français et plusieurs domaines professionnels, mais ces catégories peuvent changer. Ingénieurs, professionnels de santé, enseignants et gens de métier doivent vérifier la catégorie et la liste des professions à jour avant de construire tout leur projet autour de celle-ci.',
    clbTitle: 'Pourquoi viser CLB 9',
    clbText:
      'CLB 9 est un seuil important car certains facteurs de transférabilité du CRS s’améliorent à ce niveau. L’effet exact dépend du profil complet ; il n’ajoute pas automatiquement 50 points à chaque candidat.',
    osr:
      'IRCC indique actuellement que IELTS One Skill Retake n’est pas accepté pour Entrée express.',
    table: ['CLB', 'Écoute', 'Lecture', 'Écriture', 'Expression'],
  },
  ar: {
    practicalTitle: 'المساران العمليان من الجزائر',
    ieltsTitle: 'مسار الإنجليزية: IELTS General Training',
    ieltsDescription:
      'هذا هو خيار الإنجليزية المتحقق من توفره محلياً لـ Express Entry. يوفر المجلس الثقافي البريطاني في الجزائر حالياً IELTS General Training على الكمبيوتر بسعر 40,000 دج.',
    ieltsPoints: [
      'متاح للحجز في الجزائر',
      'مقبول لدى IRCC لـ Express Entry',
      'لا تحجز IELTS Academic لـ Express Entry',
    ],
    tcfTitle: 'مسار الفرنسية: TCF Canada',
    tcfDescription:
      'هذا هو البديل الفرنسي الذي أمكن التحقق منه محلياً. يشرح المعهد الفرنسي بالجزائر التسجيل الإلكتروني في TCF Canada وله فرع في وهران.',
    tcfPoints: [
      'مفيد عندما تكون الفرنسية فعلاً من أقوى لغاتك',
      'مقبول لدى IRCC لـ Express Entry',
      'تحقق من الدورة والفرع المتاحين قبل الدفع',
    ],
    otherTitle: 'هل يمكن إجراء الاختبارات الأخرى المعتمدة انطلاقاً من وهران؟',
    otherPoints: [
      'اختبار CELPIP-General مقبول لدى IRCC، لكن قائمة CELPIP الحالية لا تتضمن أي مركز في الجزائر. اختياره يعني السفر إلى الخارج.',
      'اختبار PTE Core مقبول لدى IRCC ويجب إجراؤه في مركز معتمد. تحقق من وجود مركز فعلي في الجزائر وموعد متاح داخل نظام Pearson قبل اختياره.',
      'اختبار TEF Canada مقبول للفرنسية، لكننا لم نتحقق من دورة حالية في الجزائر عبر الصفحات الرسمية التي راجعناها. أما TCF Canada فهو الخيار الفرنسي الذي تمكنا من التحقق منه عبر المعهد الفرنسي بالجزائر.',
    ],
    notAcceptedTitle: 'لا تستخدم هذه الاختبارات لبرنامج Express Entry',
    intro:
      'تطبق كندا قواعد مختلفة لاختبارات الهجرة والقبول الجامعي. في Express Entry استخدم فقط اختباراً تسميه دائرة الهجرة واللاجئين والمواطنة الكندية IRCC. في الجزائر، IELTS General Training هو الخيار الأول الذي يستحق المقارنة؛ وقد تنشر الجامعة قائمة مختلفة للقبول.',
    acceptedTitle: 'ما الاختبارات التي تقبلها IRCC في Express Entry؟',
    english: 'الإنجليزية',
    french: 'الفرنسية',
    englishTests: ['CELPIP-General', 'IELTS General Training', 'PTE Core'],
    frenchTests: ['TEF Canada', 'TCF Canada'],
    names:
      'CELPIP هو اختصار Canadian English Language Proficiency Index Program، وPTE Core هو Pearson Test of English Core. كلاهما اختبار إنجليزية مستقل وليس نوعاً من IELTS.',
    availability:
      'الواقع المحلي: قائمة مراكز CELPIP الحالية لا تشمل الجزائر. يجب التحقق من توفر PTE Core عبر نظام الحجز المباشر لدى Pearson. لا تختر أياً منهما قبل التأكد من مكان الاختبار وإمكانية السفر.',
    notAccepted:
      'لا يمكن تقديم TOEFL أو IELTS Academic كإثبات لغة في Express Entry. قد تقبل الجامعة أحدهما للقبول الدراسي، لكن طلب الجامعة منفصل عن ملف الهجرة. إذا كنت تحتاج القبول الجامعي وExpress Entry معاً، فتحقق مما إذا كنت تحتاج IELTS Academic للجامعة وIELTS General Training لدى IRCC.',
    academicTitle: 'هل يمكن استخدام IELTS Academic في Express Entry؟',
    academicText:
      'لا. تشترط IRCC بوضوح اختبار IELTS General Training في Express Entry. إذا احتاج خريج جزائري إلى IELTS Academic للقبول في جامعة كندية وأراد أيضاً إنشاء ملف Express Entry، فهذان هدفان مختلفان وقد يتطلبان اختبارين منفصلين.',
    bilingualTitle: 'هل من المفيد تقديم الفرنسية والإنجليزية معاً؟',
    bilingualText:
      'غالباً نعم، خصوصاً للمهنيين الجزائريين الذين يستعملون اللغتين بالفعل. لكن الاختبار الثاني يستحق تكلفته فقط إذا كانت النتيجة المتوقعة تتجاوز عتبة فعلية لدى IRCC.',
    bilingualPoints: [
      'الوصول إلى NCLC 7 أو أكثر في المهارات الفرنسية الأربع قد يؤهلك لفئة الكفاءة في اللغة الفرنسية، مع استيفاء بقية شروط Express Entry.',
      'NCLC 7 في الفرنسية مع CLB 5 أو أكثر في المهارات الإنجليزية الأربع يمنح حالياً 50 نقطة CRS إضافية للكفاءة الفرنسية.',
      'يمكن للغة الرسمية الثانية أن تضيف أيضاً نقاط CRS أساسية: حتى 24 نقطة من دون زوج أو 22 نقطة مع زوج.',
    ],
    bilingualDecision:
      'الخطة العملية من وهران: اختبر لغتك الأقوى أولاً، احسب CRS الناتج، ثم ادفع للاختبار الثاني فقط إذا كانت نتيجة واقعية ستغيّر الأهلية أو الوصول إلى فئة أو الترتيب. بالنسبة إلى كثير من الجزائريين المتقنين للفرنسية، قد يكون الجمع بين TCF Canada وIELTS General Training أقوى من الاعتماد على الإنجليزية وحدها.',
    professionalsTitle: 'ما الذي يجب على المهني الجزائري التحقق منه غير اللغة؟',
    professionalsText:
      'يبقى رمز المهنة وتقييم الشهادة الدراسية والترخيص المهني الكندي عند الحاجة أموراً منفصلة عن اختبار اللغة. تشمل الفئات الحالية الكفاءة في الفرنسية وعدة مجالات مهنية، لكنها قابلة للتغيير. يجب على المهندس أو العامل الصحي أو الأستاذ أو الحرفي مراجعة الفئة وقائمة المهن الحالية قبل بناء الخطة كلها عليها.',
    clbTitle: 'لماذا يستهدف المرشحون CLB 9',
    clbText:
      'يُعد CLB 9 حداً مهماً لأن بعض عوامل نقل المهارات في CRS تتحسن عنده. يعتمد أثر النقاط على الملف الكامل، ولا يضيف تلقائياً 50 نقطة لكل شخص.',
    osr:
      'تذكر IRCC حالياً أن IELTS One Skill Retake غير مقبول في Express Entry.',
    table: ['CLB', 'الاستماع', 'القراءة', 'الكتابة', 'المحادثة'],
  },
} as const;

const clbRows = [
  ['7', '6.0', '6.0', '6.0', '6.0'],
  ['8', '7.5', '6.5', '6.5', '6.5'],
  ['9', '8.0', '7.0', '7.0', '7.0'],
  ['10+', '8.5', '8.0', '7.5', '7.5'],
] as const;

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getIeltsVsToeflContent(locale);
  const t = copy[locale];
  const description = articleDescription(locale, 'ielts-vs-toefl-canada');
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
        <div className="bg-white border-l-4 border-crimson p-6 rounded-r-2xl shadow-sm mb-10">
          <p className="text-charcoal font-bold text-lg mb-2">{c.keyTakeawayTitle}</p>
          <p
            className="text-gray-600 m-0"
            dangerouslySetInnerHTML={{ __html: c.keyTakeawayText }}
          />
        </div>

        <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
          <p className="lead">{t.intro}</p>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.acceptedTitle}
          </h2>
          <div className="not-prose grid gap-5 md:grid-cols-2">
            {[
              [t.english, t.englishTests],
              [t.french, t.frenchTests],
            ].map(([language, tests]) => (
              <section key={language as string} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-crimson">
                  {language}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {(tests as readonly string[]).map((test) => (
                    <li key={test} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-charcoal">
                      {test}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p>{t.names}</p>
          <p>{t.availability}</p>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.practicalTitle}
          </h2>
          <div className="not-prose grid gap-5 md:grid-cols-2">
            <section className="relative overflow-hidden rounded-3xl bg-charcoal p-7 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-crimson/15 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-crimson">
                  {t.english}
                </p>
                <h3 className="mt-2 text-xl font-extrabold">{t.ieltsTitle}</h3>
                <p className="mt-4 text-sm leading-relaxed text-gray-300">{t.ieltsDescription}</p>
                <ul className="mt-5 space-y-3">
                  {t.ieltsPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <span aria-hidden="true" className="font-bold text-crimson">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-crimson">
                {t.french}
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-charcoal">{t.tcfTitle}</h3>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">{t.tcfDescription}</p>
              <ul className="mt-5 space-y-3">
                {t.tcfPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-gray-700">
                    <span aria-hidden="true" className="font-bold text-crimson">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="not-prose mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="text-base font-extrabold text-charcoal">{t.otherTitle}</h3>
            <ul className="mt-4 grid gap-3">
              {t.otherPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-extrabold text-charcoal">{t.notAcceptedTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{t.notAccepted}</p>
            </div>
          </aside>

          <section className="not-prose mt-10 rounded-3xl border border-crimson/20 bg-crimson/5 p-7">
            <h2 className="text-2xl font-extrabold text-charcoal">{t.academicTitle}</h2>
            <p className="mt-3 leading-relaxed text-gray-700">{t.academicText}</p>
          </section>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.bilingualTitle}
          </h2>
          <p>{t.bilingualText}</p>
          <div className="not-prose my-8 grid gap-4">
            {t.bilingualPoints.map((point, index) => (
              <div
                key={point}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <p className="m-0 text-sm leading-relaxed text-gray-700">{point}</p>
              </div>
            ))}
          </div>
          <p className="rounded-2xl bg-charcoal p-6 font-semibold text-white">
            {t.bilingualDecision}
          </p>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.professionalsTitle}
          </h2>
          <p>{t.professionalsText}</p>

          <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">
            {t.clbTitle}
          </h2>
          <p>{t.clbText}</p>

          <div className="not-prose my-10 overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-charcoal text-white">
                  {t.table.map((heading) => (
                    <th key={heading} className="p-4 text-sm font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {clbRows.map((row) => (
                  <tr key={row[0]} className={row[0] === '9' ? 'bg-crimson/10 font-bold' : ''}>
                    {row.map((value, index) => (
                      <td key={`${row[0]}-${index}`} className="border-t border-gray-100 p-3">
                        {index === 0 ? `CLB ${value}` : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ClbCalculator locale={locale} />
          <p className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-900">
            {t.osr}
          </p>

          <div className="not-prose group relative mt-16 flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50 md:flex-row md:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-crimson/5 blur-3xl transition-colors duration-500 group-hover:bg-crimson/10" />
            <div className="relative z-10 md:w-2/3">
              <h2 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h2>
              <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
            </div>
            <Link
              href="/#intake"
              className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-8 py-4 text-center font-bold text-white shadow-soft transition-colors hover:bg-crimson md:w-auto"
            >
              {c.ctaBtn} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="mt-16">
          <ArticleTrust
            locale={locale}
            slug="ielts-vs-toefl-canada"
            title={c.title}
            description={description}
            sources={[
              {
                label: 'IRCC: language tests and score conversion for Express Entry',
                href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html',
              },
              {
                label: 'IRCC: Comprehensive Ranking System criteria',
                href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html',
              },
              {
                label: 'IRCC: current category-based selection',
                href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html',
              },
              {
                label: 'British Council Algeria: IELTS booking and fees',
                href: 'https://www.britishcouncil.dz/en/exam/ielts/book-test',
              },
              {
                label: 'Institut français d’Algérie: TCF registration',
                href: 'https://www.algerie.campusfrance.org/faq-concernant-le-tcf-mise-en-place-par-l-ifa',
              },
              {
                label: 'CELPIP: current test locations',
                href: 'https://www.celpip.ca/take-celpip/where-do-we-test/',
              },
              {
                label: 'Pearson PTE: test centres and live availability',
                href: 'https://www.pearsonpte.com/test-centers-and-fees/',
              },
            ]}
          />
        </div>
      </article>
      <ArticleMobileCta />
    </>
  );
}
