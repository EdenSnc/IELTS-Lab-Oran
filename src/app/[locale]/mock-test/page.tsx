import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import ClbCalculator from '@/components/ClbCalculator';
import { Link } from '@/i18n/routing';
import { ACADEMIC_MOCK_TEST_PRODUCT } from '@/lib/commerce/catalog';
import {
  Locale,
  SITE_NAME,
  SITE_URL,
  STANDALONE_PAGE_SEO_DESCRIPTIONS,
  STANDALONE_PAGE_SEO_TITLES,
  buildWebsitePageMetadata,
  defaultOgImageUrl,
  localizedUrl,
} from '@/lib/seo';

const MOCK_PRICE_DZD = Math.round(ACADEMIC_MOCK_TEST_PRODUCT.priceMinor / 100);

const COPY: Record<
  Locale,
  {
    metaTitle: string;
    metaDesc: string;
    breadcrumb: string;
    eyebrow: string;
    h1: string;
    lead: string;
    quickSummaryTitle: string;
    quickSummaryBody: string;
    primaryCta: string;
    sampleCta: string;
    sampleNote: string;
    featuresTitle: string;
    features: Array<{ title: string; body: string }>;
    compareTitle: string;
    compareHeaders: [string, string, string, string];
    compareRows: Array<[string, string, string, string]>;
    modulesTitle: string;
    modulesIntro: string;
    modules: Array<{ name: string; timing: string; body: string }>;
    dzAdvantageTitle: string;
    dzAdvantageBody: string;
    howItWorksTitle: string;
    steps: Array<{ title: string; body: string }>;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
    cohortTitle: string;
    cohortBody: string;
    cohortCta: string;
  }
> = {
  en: {
    metaTitle: 'Online IELTS Academic Mock Test Algeria | IELTS Lab Oran',
    metaDesc:
      'Take a timed computer-based IELTS Academic mock test in Algeria (3,900 DZD via Chargily Pay / CIB / Edahabia) or try our free 5-question Reading sample.',
    breadcrumb: 'Online Mock Test',
    eyebrow: 'Computer-Delivered IELTS Simulation · Algeria',
    h1: 'Online IELTS Academic Mock Test & Free Reading Sample',
    lead: 'Since 30 April 2026, British Council Algeria delivers IELTS exclusively on computer. Practise Listening, Reading, and Writing in one realistic timed browser simulation—payable in Algerian Dinars via CIB or Edahabia—before spending 40,000 DA on test day.',
    quickSummaryTitle: 'Quick Summary (45-Second Overview)',
    quickSummaryBody:
      'IELTS Lab Oran’s online IELTS Academic Mock Test costs 3,900 DZD (payable locally via Chargily Pay using CIB or Edahabia) and provides one complete timed attempt across Listening, Reading, and Writing with 30-day stored results. Visitors can also launch a free 5-question Reading sample immediately with no account.',
    primaryCta: 'Unlock Full Mock Test (3,900 DZD)',
    sampleCta: 'Try Free 5-Question Reading Sample',
    sampleNote: 'No account or card required for the 10-minute Reading sample · Secure DZD checkout via Chargily Pay for the full mock.',
    featuresTitle: 'Built for Algeria’s Computer-Delivered Exam Format',
    features: [
      {
        title: 'Authentic Split-Screen Interface',
        body: 'Read passages on the left while answering questions on the right, using text highlighting, notes, question-palette navigation, and an on-screen countdown clock.',
      },
      {
        title: 'Listening + Reading + Writing in One Flow',
        body: 'Complete all three computer modules back-to-back under realistic timing, including automatic word counters for Writing Task 1 and Task 2.',
      },
      {
        title: 'Local DZD Payment (CIB & Edahabia)',
        body: 'No foreign currency Visa/Mastercard needed. Checkout securely in Algerian Dinars through Chargily Pay and receive immediate account entitlement.',
      },
      {
        title: '30-Day Stored Diagnostic Report',
        body: 'Review your objective section scores and criteria-aligned Writing evaluation inside your IELTS Lab Oran dashboard for 30 days after purchase.',
      },
    ],
    compareTitle: 'Free Sample vs Full Academic Mock vs Official Exam',
    compareHeaders: ['Feature', 'Free Reading Sample', 'Full Academic Mock', 'Official BC Algeria Exam'],
    compareRows: [
      ['Price in Algeria', '0 DZD (Free)', '3,900 DZD', '40,000 DZD'],
      ['Payment Method', 'No registration needed', 'Chargily Pay (CIB / Edahabia)', 'Bank card, transfer, or HSBC cash (+1%)'],
      ['Modules Covered', 'Academic Reading (5 Qs · 10 min)', 'Full Listening, Reading & Writing', 'Listening, Reading, Writing & Speaking'],
      ['Interface Tools', 'Split-screen, highlight & timer', 'Full exam navigation, word count & timer', 'Official test-centre workstation'],
      ['Stored Results', 'Instant on-screen check', 'Stored in your account for 30 days', 'Official Test Report Form (1–2 days)'],
    ],
    modulesTitle: 'What You Will Face Inside the Full Academic Mock Test',
    modulesIntro:
      'Every full attempt replicates the timing, question transitions, and screen constraints of the computer-delivered IELTS Academic exam so you eliminate avoidable surprises before booking at British Council Algeria (Algiers or Imtiyaz El Djazair in Oran).',
    modules: [
      {
        name: '1. Listening (4 Parts · 40 Questions · ~30 Minutes)',
        timing: 'Headphone audio + 2-minute answer review',
        body: 'Progress through everyday dialogue, monologues, academic discussion, and a university lecture. Unlike the old paper exam—which gave 10 minutes to transfer answers—computer IELTS gives only 2 minutes at the end to check spelling and singular/plural accuracy directly on screen.',
      },
      {
        name: '2. Academic Reading (3 Passages · 40 Questions · 60 Minutes)',
        timing: 'Strict 60-minute clock · zero extra transfer time',
        body: 'Tackle three long journal and analytical texts using side-by-side split-screen scrolling, right-click text highlighting, and digital sticky notes across True/False/Not Given, Matching Headings, Summary Completion, and Multiple Choice.',
      },
      {
        name: '3. Academic Writing (Task 1 & Task 2 · 60 Minutes)',
        timing: 'Task 1 (150+ words · 20m) + Task 2 (250+ words · 40m)',
        body: 'Summarise visual data (charts, tables, processes, or maps) in Task 1 and draft a structured discursive essay in Task 2 with a live automatic word counter, keyboard copy/paste editing, and criteria-aligned diagnostic evaluation.',
      },
    ],
    dzAdvantageTitle: 'Why Algerian Candidates Practise Here Before Paying in USD/EUR or Booking',
    dzAdvantageBody:
      'Most international IELTS mock websites require foreign-currency Visa or Mastercard subscriptions in USD or EUR, while free PDF scans fail to train keyboard typing speed and split-screen fatigue. Paying locally in Algerian Dinars (3,900 DZD via Chargily Pay using CIB or Edahabia) lets students and Express Entry professionals across Oran, Algiers, Constantine, Annaba, Tlemcen, and all 58 wilayas benchmark their real computer band readiness first.',
    howItWorksTitle: 'How to Take Your Mock Test',
    steps: [
      {
        title: '1. Test the interface for free',
        body: 'Open our 5-question Academic Reading sample to check your computer screen workflow, highlighting tools, and question navigation.',
      },
      {
        title: '2. Sign in & pay in DZD',
        body: 'Create your IELTS Lab Oran account and complete the 3,900 DZD checkout via Chargily Pay using your CIB or Edahabia card.',
      },
      {
        title: '3. Sit the timed Listening, Reading & Writing flow',
        body: 'Set aside uninterrupted desk time on a laptop or desktop PC with headphones, submit your attempt, and review your stored results for 30 days.',
      },
    ],
    faqTitle: 'Frequently Asked Questions — Online Mock Test',
    faqs: [
      {
        q: 'How do I pay for the IELTS Lab Oran mock test in Algeria?',
        a: 'Checkout is processed in Algerian Dinars (3,900 DZD) via Chargily Pay, supporting Algerian CIB and Edahabia cards without requiring an international foreign-currency card.',
      },
      {
        q: 'Can I try the simulation interface before creating an account or paying?',
        a: 'Yes. Our 5-question, 10-minute IELTS Academic Reading sample at /sample is completely free and opens immediately in your browser without registration.',
      },
      {
        q: 'Does the 3,900 DZD Academic Mock Test include Speaking?',
        a: 'The online mock test covers the three computer-screen modules—Listening, Reading, and Writing—in one timed flow. Live Speaking sessions and appointments are managed separately.',
      },
      {
        q: 'How long can I view my mock test results?',
        a: 'Your purchase grants one complete exam attempt, and your submitted score report remains accessible inside your IELTS Lab Oran account for 30 days.',
      },
      {
        q: 'Should I take the mock test on a phone or a computer?',
        a: 'Use a desktop PC or laptop with headphones whenever possible so your screen layout, scrolling, and keyboard typing match the British Council computer-delivered test experience.',
      },
    ],
    cohortTitle: 'Prefer In-Person Coaching in Bir El Djir, Oran?',
    cohortBody:
      'Combine online mock diagnostics with our 8-seat small-group IELTS preparation cohort in Bir El Djir, Oran, led by Band 8.0 instructor Amine Senouci.',
    cohortCta: 'Explore Oran Cohort Intake',
  },
  fr: {
    metaTitle: 'Test Blanc IELTS Academic en Ligne Algérie | IELTS Lab',
    metaDesc:
      'Passez un test blanc IELTS Academic chronométré sur ordinateur en Algérie (3 900 DZD via Chargily Pay CIB/Edahabia) ou testez l’échantillon Reading gratuit.',
    breadcrumb: 'Test blanc en ligne',
    eyebrow: 'Simulateur IELTS sur Ordinateur · Algérie',
    h1: 'Test Blanc IELTS Academic en Ligne & Échantillon Gratuit',
    lead: 'Depuis le 30 avril 2026, le British Council Algérie organise l’IELTS exclusivement sur ordinateur. Entraînez-vous au Listening, Reading et Writing dans une simulation chronométrée payable en dinars (CIB / Edahabia) avant d’engager 40 000 DA pour l’examen officiel.',
    quickSummaryTitle: 'Résumé rapide (l’essentiel en 45 secondes)',
    quickSummaryBody:
      'Le test blanc IELTS Academic en ligne d’IELTS Lab Oran coûte 3 900 DZD (paiement local sécurisé via Chargily Pay par carte CIB ou Edahabia) et inclut une tentative complète chronométrée (Listening, Reading et Writing) avec résultats conservés 30 jours. Un échantillon Reading gratuit de 5 questions est accessible sans compte.',
    primaryCta: 'Accéder au test blanc complet (3 900 DZD)',
    sampleCta: 'Essayer l’échantillon Reading gratuit (5 Q)',
    sampleNote: 'Aucun compte requis pour l’extrait gratuit de 10 min · Paiement local sécurisé via Chargily Pay pour le test complet.',
    featuresTitle: 'Conçu pour le format IELTS sur ordinateur en Algérie',
    features: [
      {
        title: 'Interface authentique en écran partagé',
        body: 'Lisez les textes à gauche tout en répondant à droite avec les outils de surlignage, prise de notes, palette de navigation et compte à rebours.',
      },
      {
        title: 'Listening + Reading + Writing en un parcours',
        body: 'Enchaînez les trois épreuves informatisées dans les conditions réelles de temps, avec compteur automatique de mots pour Writing Task 1 et Task 2.',
      },
      {
        title: 'Paiement en dinars (CIB & Edahabia)',
        body: 'Aucune carte bancaire internationale en devises n’est requise : réglez 3 900 DZD via Chargily Pay et débloquez immédiatement votre accès.',
      },
      {
        title: 'Résultats conservés pendant 30 jours',
        body: 'Consultez vos scores détaillés et le bilan Writing aligné sur les critères officiels dans votre espace candidat pendant 30 jours.',
      },
    ],
    compareTitle: 'Comparatif : Échantillon gratuit, Test blanc complet et Examen officiel',
    compareHeaders: ['Critère', 'Échantillon gratuit', 'Test blanc complet', 'Examen officiel BC Algérie'],
    compareRows: [
      ['Tarif en Algérie', '0 DZD (Gratuit)', '3 900 DZD', '40 000 DZD'],
      ['Moyen de paiement', 'Sans inscription', 'Chargily Pay (CIB / Edahabia)', 'Carte, virement ou espèces HSBC (+1 %)'],
      ['Épreuves incluses', 'Academic Reading (5 Q · 10 min)', 'Listening, Reading & Writing complets', 'Listening, Reading, Writing & Speaking'],
      ['Outils à l’écran', 'Écran partagé, surlignage & chrono', 'Navigation complète, compteur mots & chrono', 'Poste informatique officiel en centre'],
      ['Accès aux résultats', 'Correction immédiate à l’écran', 'Conservés 30 jours dans votre compte', 'Relevé officiel TRF sous 1 à 2 jours'],
    ],
    modulesTitle: 'Détail des 3 épreuves informatisées du test blanc Academic',
    modulesIntro:
      'Chaque tentative reproduit fidèlement le minutage, l’enchaînement des sections et les contraintes d’écran de l’IELTS Academic sur ordinateur afin d’éviter toute mauvaise surprise le jour de l’examen officiel à Oran (Imtiyaz El Djazair) ou à Alger.',
    modules: [
      {
        name: '1. Listening (4 parties · 40 questions · ~30 minutes)',
        timing: 'Écoute au casque + 2 minutes de vérification finale',
        body: 'Enchaînez dialogues courants, échanges universitaires et conférence académique. Contrairement à l’ancien format papier qui laissait 10 minutes de report, la version sur ordinateur n’accorde que 2 minutes finales pour contrôler l’orthographe directement à l’écran.',
      },
      {
        name: '2. Academic Reading (3 textes · 40 questions · 60 minutes)',
        timing: '60 minutes strictes · aucun temps supplémentaire',
        body: 'Analysez trois longs articles académiques grâce au défilement indépendant en écran partagé, au surlignage rapide et aux notes numériques sur les questions True/False/Not Given, Matching Headings et Summary Completion.',
      },
      {
        name: '3. Academic Writing (Task 1 & Task 2 · 60 minutes)',
        timing: 'Task 1 (150+ mots · 20 min) + Task 2 (250+ mots · 40 min)',
        body: 'Synthétisez un graphique, tableau ou processus en Task 1 puis rédigez un essai argumenté en Task 2 au clavier, avec compteur automatique de mots en temps réel et bilan diagnostique aligné sur les critères officiels.',
      },
    ],
    dzAdvantageTitle: 'Pourquoi les candidats algériens choisissent une simulation payable en dinars',
    dzAdvantageBody:
      'La plupart des plateformes internationales facturent leurs tests blancs en euros ou en dollars sur carte Visa/Mastercard, tandis que les PDF imprimés ne préparent ni à la vitesse de frappe ni à la fatigue visuelle sur écran. Le règlement local à 3 900 DZD via Chargily Pay (CIB et Edahabia) permet aux étudiants et professionnels d’Oran, Alger, Constantine, Annaba, Tlemcen et des 58 wilayas de mesurer leur niveau réel avant d’engager 40 000 DA.',
    howItWorksTitle: 'Comment passer votre test blanc en 3 étapes',
    steps: [
      {
        title: '1. Testez l’interface gratuitement',
        body: 'Lancez l’extrait Academic Reading de 5 questions pour découvrir le surlignage, le défilement en écran partagé et le chronomètre.',
      },
      {
        title: '2. Créez votre compte et payez en DZD',
        body: 'Connectez-vous à votre espace IELTS Lab Oran et réglez 3 900 DZD en toute sécurité par carte CIB ou Edahabia via Chargily Pay.',
      },
      {
        title: '3. Passez l’examen dans les conditions du jour J',
        body: 'Installez-vous devant un PC ou ordinateur portable avec un casque audio, validez votre tentative et consultez vos résultats pendant 30 jours.',
      },
    ],
    faqTitle: 'Questions fréquentes — Test blanc IELTS en ligne',
    faqs: [
      {
        q: 'Comment payer le test blanc IELTS en Algérie sans carte Visa internationale ?',
        a: 'Le règlement s’effectue directement en dinars algériens (3 900 DZD) via Chargily Pay avec une carte CIB ou Edahabia.',
      },
      {
        q: 'Puis-je essayer le simulateur gratuitement avant de payer ?',
        a: 'Oui. L’échantillon Academic Reading de 5 questions (10 minutes) disponible sur /sample est entièrement gratuit et sans création de compte.',
      },
      {
        q: 'L’épreuve orale (Speaking) est-elle incluse dans le test blanc à 3 900 DZD ?',
        a: 'Le test blanc en ligne couvre les trois modules sur écran (Listening, Reading et Writing) dans un flux chronométré. Les sessions Speaking sont gérées séparément.',
      },
      {
        q: 'Combien de temps mes résultats restent-ils disponibles ?',
        a: 'L’accès comprend une tentative complète et vos résultats détaillés restent consultables dans votre compte IELTS Lab Oran pendant 30 jours.',
      },
      {
        q: 'Faut-il passer la simulation sur ordinateur ou sur téléphone ?',
        a: 'Privilégiez un ordinateur portable ou de bureau avec casque audio afin de reproduire fidèlement la frappe clavier et l’affichage partagé du jour de l’examen.',
      },
    ],
    cohortTitle: 'Vous préférez un accompagnement en présentiel à Bir El Djir, Oran ?',
    cohortBody:
      'Complétez votre diagnostic en ligne avec notre préparation intensive en petit groupe de 8 places à Oran, encadrée par Amine Senouci (Band 8.0).',
    cohortCta: 'Voir le programme présentiel à Oran',
  },
  ar: {
    metaTitle: 'اختبار IELTS Academic تجريبي بالجزائر | IELTS Lab Oran',
    metaDesc:
      'اجتز اختبار IELTS Academic تجريبياً محدداً بالوقت على الكمبيوتر في الجزائر (3,900 دج عبر Chargily Pay والذهبية/CIB) أو جرّب عينة القراءة المجانية.',
    breadcrumb: 'الاختبار التجريبي عبر الإنترنت',
    eyebrow: 'محاكي اختبار IELTS على الكمبيوتر · الجزائر',
    h1: 'اختبار IELTS Academic التجريبي عبر الإنترنت وعينة القراءة المجانية',
    lead: 'منذ 30 أبريل 2026 تُجرى اختبارات IELTS لدى المجلس الثقافي البريطاني في الجزائر حصرياً على الكمبيوتر. تدرّب على الاستماع والقراءة والكتابة ضمن محاكاة موقوتة واقعية بالدينار الجزائري (البطاقة الذهبية أو CIB) قبل دفع 40,000 دج للامتحان الرسمي.',
    quickSummaryTitle: 'ملخص سريع (في 45 ثانية)',
    quickSummaryBody:
      'يبلغ سعر اختبار IELTS Academic التجريبي عبر الإنترنت من IELTS Lab Oran مبلغ 3,900 دج (يُدفع محلياً عبر Chargily Pay بالبطاقة الذهبية أو CIB)، ويمنحك محاولة كاملة محددة بالوقت لأقسام الاستماع والقراءة والكتابة مع حفظ النتائج لمدة 30 يوماً، إضافة إلى عينة قراءة مجانية من 5 أسئلة دون حساب.',
    primaryCta: 'احصل على الاختبار التجريبي الكامل (3,900 دج)',
    sampleCta: 'جرّب عينة القراءة المجانية (5 أسئلة)',
    sampleNote: 'لا يلزم إنشاء حساب لتجربة عينة القراءة (10 دقائق) · دفع محلي آمن عبر Chargily Pay للاختبار الكامل.',
    featuresTitle: 'مصمم خصيصاً لصيغة اختبار الكمبيوتر المعتمدة في الجزائر',
    features: [
      {
        title: 'واجهة شاشة مقسمة تحاكي الامتحان الفعلي',
        body: 'اقرأ النصوص في جانب وأجب عن الأسئلة في الجانب المقابل مع أدوات التظليل وتدوين الملاحظات وشريط التنقل ومؤقت العد التنازلي.',
      },
      {
        title: 'الاستماع والقراءة والكتابة في مسار واحد',
        body: 'أكمل الأقسام الثلاثة المحوسبة بالتتابع تحت ضغط الوقت الحقيقي، مع عداد كلمات تلقائي لمهمتي الكتابة Task 1 وTask 2.',
      },
      {
        title: 'دفع محلي بالدينار (الذهبية وCIB)',
        body: 'لا حاجة لبطاقة بنكية دولية بالعملة الصعبة؛ ادفع 3,900 دج بأمان عبر بوابة Chargily Pay وفعّل صلاحية الاختبار فوراً.',
      },
      {
        title: 'نتائج محفوظة لمدة 30 يوماً',
        body: 'راجع درجاتك التفصيلية وتقييم الكتابة المبني على المعايير الرسمية داخل حسابك في المنصة طوال 30 يوماً.',
      },
    ],
    compareTitle: 'مقارنة بين العينة المجانية والاختبار التجريبي والامتحان الرسمي',
    compareHeaders: ['المعيار', 'عينة القراءة المجانية', 'الاختبار التجريبي الكامل', 'الامتحان الرسمي بالجزائر'],
    compareRows: [
      ['السعر في الجزائر', '0 دج (مجاناً)', '3,900 دج', '40,000 دج'],
      ['طريقة الدفع', 'دون تسجيل حساب', 'Chargily Pay (الذهبية / CIB)', 'بطاقة بنكية، تحويل، أو نقداً HSBC (+1%)'],
      ['الأقسام المشمولة', 'قراءة أكاديمية (5 أسئلة · 10 دقائق)', 'الاستماع والقراءة والكتابة كاملة', 'الاستماع والقراءة والكتابة والمحادثة'],
      ['أدوات الواجهة', 'شاشة مقسمة، تظليل ومؤقت', 'تنقل كامل، عداد كلمات ومؤقت رسمي', 'حاسوب مركز الاختبار المعتمد'],
      ['حفظ النتائج', 'تصحيح فوري على الشاشة', 'محفوظة في حسابك لمدة 30 يوماً', 'شهادة رسمية خلال يوم إلى يومين'],
    ],
    modulesTitle: 'تفصيل الأقسام الثلاثة داخل الاختبار التجريبي الكامل',
    modulesIntro:
      'تحاكي كل محاولة كاملة التوقيت الدقيق وتسلسل المهام وبيئة الشاشة المعتمدة في امتحان IELTS Academic على الكمبيوتر، مما يمنحك قراءة واقعية لجاهزيتك قبل حجز موعدك الرسمي في وهران (مركز امتياز الجزائر) أو الجزائر العاصمة.',
    modules: [
      {
        name: '1. قسم الاستماع Listening (4 أجزاء · 40 سؤالاً · نحو 30 دقيقة)',
        timing: 'تسجيل صوتي عبر السماعات + دقيقتان للمراجعة النهائية',
        body: 'تدرّب على المحادثات اليومية والنقاشات الجامعية والمحاضرات الأكاديمية مباشرة على الشاشة. بخلاف الامتحان الورقي القديم الذي كان يمنح 10 دقائق لنقل الإجابات، يمنحك اختبار الكمبيوتر دقيقتين فقط في النهاية لمراجعة الإملاء وصيغ المفرد والجمع.',
      },
      {
        name: '2. القراءة الأكاديمية Academic Reading (3 نصوص · 40 سؤالاً · 60 دقيقة)',
        timing: '60 دقيقة صارمة دون أي وقت إضافي',
        body: 'تعامل مع ثلاثة نصوص أكاديمية وتحليلية طويلة باستخدام التمرير المستقل في الشاشة المقسمة، وأدوات التظليل وتدوين الملاحظات الرقمية عبر أنماط True/False/Not Given وMatching Headings وإكمال الملخصات.',
      },
      {
        name: '3. الكتابة الأكاديمية Academic Writing (مهمتان · 60 دقيقة)',
        timing: 'المهمة 1 (150+ كلمة · 20 د) + المهمة 2 (250+ كلمة · 40 د)',
        body: 'اكتب تلخيصاً دقيقاً للبيانات البصرية (الرسوم البيانية أو الجداول أو المخططات) في المهمة الأولى، ومقالاً تحليلياً متماسكاً في المهمة الثانية باستخدام لوحة المفاتيح وعداد الكلمات التلقائي، مع تقرير تقييمي مبني على المعايير الرسمية الأربعة.',
      },
    ],
    dzAdvantageTitle: 'لماذا يفضّل المرشحون في الجزائر المحاكاة المحلية بالدينار قبل حجز الامتحان؟',
    dzAdvantageBody:
      'تشترط أغلب المنصات الأجنبية بطاقات دفع دولية بالعملة الصعبة (الدولار أو اليورو)، في حين لا تدرّبك ملفات PDF المطبوعة على سرعة الطباعة على لوحة المفاتيح أو التركيز البصري أمام الشاشة المقسمة. يتيح الدفع المحلي بمبلغ 3,900 دج عبر بوابة Chargily Pay (بالبطاقة الذهبية أو بطاقة CIB) للطلبة والمهنيين في وهران والجزائر العاصمة وقسنطينة وعنابة وتلمسان وكافة الولايات الثماني والخمسين قياس مستواهم الفعلي بأمان قبل استثمار 40,000 دج في الاختبار الرسمي.',
    howItWorksTitle: 'كيف تبدأ اختبارك التجريبي في 3 خطوات؟',
    steps: [
      {
        title: '1. جرّب الواجهة مجاناً أولاً',
        body: 'افتح عينة القراءة الأكاديمية المكونة من 5 أسئلة للتعود على تقسيم الشاشة والتظليل ومؤقت الوقت.',
      },
      {
        title: '2. أنشئ حسابك وادفع بالدينار',
        body: 'سجّل الدخول إلى حسابك في IELTS Lab Oran وأتمم دفع 3,900 دج عبر Chargily Pay باستخدام البطاقة الذهبية أو CIB.',
      },
      {
        title: '3. اجتز الاختبار على حاسوب مع سماعات',
        body: 'اجلس أمام حاسوب مكتبي أو محمول في بيئة هادئة، أرسل محاولتك الكاملة، وراجع نتائجك المحفوظة لمدة 30 يوماً.',
      },
    ],
    faqTitle: 'الأسئلة الشائعة حول الاختبار التجريبي عبر الإنترنت',
    faqs: [
      {
        q: 'كيف أدفع رسوم الاختبار التجريبي في الجزائر؟',
        a: 'يتم الدفع بالدينار الجزائري (3,900 دج) عبر بوابة Chargily Pay باستخدام البطاقة الذهبية لبريد الجزائر أو بطاقة CIB البنكية دون الحاجة لبطاقة عملة صعبة.',
      },
      {
        q: 'هل يمكنني تجربة المنصة مجاناً قبل الشراء؟',
        a: 'نعم، عينة القراءة الأكاديمية المكونة من 5 أسئلة (10 دقائق) عبر الرابط /sample مجانية بالكامل وتعمل مباشرة في المتصفح دون تسجيل حساب.',
      },
      {
        q: 'هل يشمل الاختبار التجريبي قسم المحادثة (Speaking)؟',
        a: 'يغطي الاختبار التجريبي عبر الإنترنت الأقسام الثلاثة التي تُجرى على شاشة الكمبيوتر (الاستماع والقراءة والكتابة) في جلسة واحدة، بينما تُدار مواعيد المحادثة بشكل منفصل.',
      },
      {
        q: 'كم تبقى نتائجي متاحة للمراجعة؟',
        a: 'يمنحك الشراء محاولة اختبار كاملة واحدة، وتظل النتائج محفوظة وقابلة للمراجعة داخل حسابك لمدة 30 يوماً.',
      },
      {
        q: 'هل الأفضل إجراء الاختبار على الهاتف أم الحاسوب؟',
        a: 'ننصح بشدة باستخدام حاسوب محمول أو مكتبي مع سماعات رأس لمحاكاة لوحة المفاتيح والشاشة المقسمة ليوم الاختبار الفعلي.',
      },
    ],
    cohortTitle: 'هل تفضّل التدريب الحضوري في بئر الجير، وهران؟',
    cohortBody:
      'اجمع بين التشخيص الرقمي ودورتنا الحضورية المصغرة (8 مقاعد) في بئر الجير، وهران بإشراف المدرب أمين سنوسي (الحاصل على Band 8.0).',
    cohortCta: 'استكشف التسجيل في دورة وهران',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: 'mock-test',
    title: STANDALONE_PAGE_SEO_TITLES['mock-test'][safeLocale],
    description: STANDALONE_PAGE_SEO_DESCRIPTIONS['mock-test'][safeLocale],
  });
}

export default async function MockTestLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = COPY[safeLocale];
  const isRtl = safeLocale === 'ar';
  const pageUrl = localizedUrl(safeLocale, 'mock-test');
  const organizationId = `${SITE_URL}/#organization`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo_rounded.png`,
          width: 512,
          height: 512,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bir El Djir',
          addressRegion: 'Oran',
          postalCode: '31130',
          addressCountry: 'DZ',
        },
        email: 'ieltslab.oran@gmail.com',
        telephone: '+213780343103',
      },
      {
        '@type': ['Product', 'SoftwareApplication'],
        '@id': `${pageUrl}#product`,
        name: c.h1,
        description: c.metaDesc,
        image: defaultOgImageUrl(),
        url: pageUrl,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web browser',
        inLanguage: 'en',
        brand: {
          '@type': 'Brand',
          name: SITE_NAME,
        },
        provider: {
          '@id': organizationId,
        },
        offers: {
          '@type': 'Offer',
          url: pageUrl,
          price: String(MOCK_PRICE_DZD),
          priceCurrency: 'DZD',
          availability: 'https://schema.org/InStock',
          seller: {
            '@id': organizationId,
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: SITE_NAME,
            item: localizedUrl(safeLocale),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: c.breadcrumb,
            item: pageUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        inLanguage: safeLocale,
        mainEntity: c.faqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <main
        id="main-content"
        className={`mx-auto max-w-4xl px-6 pb-24 pt-32 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <Link href="/" className="hover:text-[#b81428] underline-offset-4 hover:underline">
            {SITE_NAME}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-charcoal">{c.breadcrumb}</span>
        </nav>

        <header className="rounded-[2.5rem] bg-charcoal p-8 text-white shadow-2xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff7a8a]">{c.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight">{c.h1}</h1>
          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-gray-300">{c.lead}</p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
            <Link
              href="/account"
              rel="nofollow"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c4162c] px-7 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-red-800"
            >
              {c.primaryCta}
            </Link>
            <a
              href={`/sample?locale=${safeLocale}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
            >
              {c.sampleCta}
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-300">{c.sampleNote}</p>
        </header>

        {/* Answer-First Summary */}
        <section className="mt-10 rounded-2xl border-s-4 border-crimson bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-charcoal">{c.quickSummaryTitle}</h2>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-gray-700">{c.quickSummaryBody}</p>
        </section>

        {/* Features */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{c.featuresTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {c.features.map((feat) => (
              <div key={feat.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-charcoal">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feat.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{c.compareTitle}</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-start text-sm">
              <thead>
                <tr className="bg-charcoal text-white">
                  {c.compareHeaders.map((h) => (
                    <th key={h} className="p-4 font-bold border-b border-white/10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {c.compareRows.map((row) => (
                  <tr key={row[0]}>
                    <td className="p-4 font-bold text-charcoal bg-gray-50">{row[0]}</td>
                    <td className="p-4 text-gray-700">{row[1]}</td>
                    <td className="p-4 font-semibold text-charcoal bg-crimson/[0.03]">{row[2]}</td>
                    <td className="p-4 text-gray-700">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Module-by-Module Computer Format Breakdown */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{c.modulesTitle}</h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-700">{c.modulesIntro}</p>
          <div className="mt-6 space-y-4">
            {c.modules.map((mod) => (
              <div key={mod.name} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-charcoal">{mod.name}</h3>
                  <span className="inline-flex w-fit rounded-full bg-crimson/10 px-3 py-1 text-xs font-bold text-[#b81428]">
                    {mod.timing}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{mod.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl border border-gray-200 bg-[#faf9f6] p-6">
            <h3 className="text-base font-extrabold text-charcoal">{c.dzAdvantageTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{c.dzAdvantageBody}</p>
          </div>
        </section>

        {/* Steps */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{c.howItWorksTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {c.steps.map((s) => (
              <div key={s.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-[#b81428]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive CLB Calculator */}
        <ClbCalculator locale={safeLocale} />

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{c.faqTitle}</h2>
          <div className="mt-6 space-y-4">
            {c.faqs.map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-charcoal">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* In-Person Cohort Cross-CTA */}
        <section className="mt-14 rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="md:w-2/3">
            <h2 className="text-2xl font-extrabold text-charcoal">{c.cohortTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.cohortBody}</p>
          </div>
          <Link
            href="/#intake"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-charcoal px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c4162c]"
          >
            {c.cohortCta}
          </Link>
        </section>
      </main>
      <SiteFooter locale={safeLocale} />
    </>
  );
}
