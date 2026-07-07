// Shared translated article content for all locales.
// Each article exports a function that takes a locale and returns the content object.

export type ArticleLocale = 'en' | 'fr' | 'ar';

export function getAcademicVsGeneralContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'IELTS Academic vs. General Training: Which One Do You Need?',
      lead: 'When you register for the IELTS, you must choose between two distinct versions: <strong>IELTS Academic</strong> and <strong>IELTS General Training</strong>. Selecting the correct test is absolutely critical, as universities, employers, and immigration bodies have strict requirements on which certificate they accept.',
      h2_1: '1. Who are they for?',
      academicTitle: 'IELTS Academic',
      academicDesc: 'Designed for individuals applying for higher education or professional registration in an English-speaking environment. If you want to study at a university at the undergraduate or postgraduate level, or join a professional organization (like medical, nursing, or engineering boards), this is the test you need.',
      generalTitle: 'IELTS General Training',
      generalDesc: 'Intended for those migrating to English-speaking countries (such as Canada, Australia, New Zealand, or the UK) or applying for secondary education, training programs, and work experience. The Express Entry system for Canada, for example, strictly requires the General Training test.',
      h2_2: '2. Test Format Differences',
      formatIntro: 'Both tests assess all four language skills—Listening, Reading, Writing, and Speaking. The <strong>Listening and Speaking sections are exactly the same</strong> for both tests. The differences lie entirely in the Reading and Writing sections.',
      readingTitle: 'The Reading Section',
      readingBullets: [
        '<strong>Academic Reading:</strong> Contains three long texts which range from descriptive and factual to discursive and analytical. These are taken from books, journals, magazines, and newspapers.',
        '<strong>General Training Reading:</strong> Requires you to read extracts from books, magazines, newspapers, notices, advertisements, company handbooks, and guidelines. These are materials you are likely to encounter on a daily basis in an English-speaking environment.',
      ],
      writingTitle: 'The Writing Section',
      writingBullets: [
        '<strong>Academic Writing:</strong><br/>- <em>Task 1:</em> You will be presented with a graph, table, chart, or diagram and asked to describe, summarise, or explain the information in your own words.<br/>- <em>Task 2:</em> Write an essay in response to a point of view, argument, or problem in a formal style.',
        '<strong>General Training Writing:</strong><br/>- <em>Task 1:</em> You will be presented with a situation and asked to write a letter requesting information or explaining the situation.<br/>- <em>Task 2:</em> Write an essay in response to a point of view, argument, or problem, which can be slightly more personal in style than the Academic essay.',
      ],
      h2_3: '3. Scoring and Difficulty',
      scoringText: 'While the scoring system (Band 0 to 9) is the same, achieving a specific band score in reading requires more correct answers in the General Training test than in the Academic test. This is because the General texts are generally considered easier and more straightforward than the complex Academic texts.',
      ctaTitle: 'Prepare for Your Specific Test',
      ctaDesc: 'Our digital lab is equipped with comprehensive mock exams for both Academic and General Training. Train specifically for your path.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'IELTS Academic vs. General Training : Lequel vous faut-il ?',
      lead: 'Lorsque vous vous inscrivez à l\'IELTS, vous devez choisir entre deux versions distinctes : <strong>IELTS Academic</strong> et <strong>IELTS General Training</strong>. Choisir le bon test est absolument crucial, car les universités, les employeurs et les services d\'immigration ont des exigences strictes sur le certificat qu\'ils acceptent.',
      h2_1: '1. À qui s\'adressent-ils ?',
      academicTitle: 'IELTS Academic',
      academicDesc: 'Conçu pour les personnes qui souhaitent poursuivre des études supérieures ou s\'inscrire dans un ordre professionnel dans un environnement anglophone. Si vous visez une université en licence ou en master, ou rejoindre un ordre professionnel (médical, infirmier, ingénierie), c\'est le test qu\'il vous faut.',
      generalTitle: 'IELTS General Training',
      generalDesc: 'Destiné à ceux qui immigrent vers des pays anglophones (Canada, Australie, Nouvelle-Zélande, Royaume-Uni) ou qui postulent à des formations secondaires, des stages ou des emplois. Le programme Entrée express du Canada, par exemple, exige strictement le General Training.',
      h2_2: '2. Différences de format',
      formatIntro: 'Les deux tests évaluent les quatre compétences linguistiques : Compréhension orale, Compréhension écrite, Expression écrite et Expression orale. Les <strong>sections Listening et Speaking sont identiques</strong> dans les deux versions. Les différences se situent uniquement dans la lecture et l\'écriture.',
      readingTitle: 'La section Reading',
      readingBullets: [
        '<strong>Academic Reading :</strong> Trois longs textes allant du descriptif-factuel à l\'analytique-discursif, issus de livres, revues, magazines et journaux.',
        '<strong>General Training Reading :</strong> Des extraits de livres, magazines, journaux, annonces, manuels d\'entreprise et directives — des documents que vous pourriez rencontrer au quotidien dans un pays anglophone.',
      ],
      writingTitle: 'La section Writing',
      writingBullets: [
        '<strong>Academic Writing :</strong><br/>- <em>Tâche 1 :</em> Vous décrivez, résumez ou expliquez un graphique, tableau, diagramme ou schéma dans vos propres mots.<br/>- <em>Tâche 2 :</em> Rédigez un essai formel en réponse à un point de vue, un argument ou un problème.',
        '<strong>General Training Writing :</strong><br/>- <em>Tâche 1 :</em> Vous rédigez une lettre pour demander des informations ou expliquer une situation.<br/>- <em>Tâche 2 :</em> Rédigez un essai légèrement plus personnel en réponse à un point de vue ou un problème.',
      ],
      h2_3: '3. Notation et difficulté',
      scoringText: 'Bien que le système de notation (Bande 0 à 9) soit identique, obtenir un score précis en lecture nécessite plus de bonnes réponses en General Training qu\'en Academic. C\'est parce que les textes General sont généralement plus simples et directs que les textes Academic complexes.',
      ctaTitle: 'Préparez-vous pour votre test spécifique',
      ctaDesc: 'Notre laboratoire numérique est équipé d\'examens blancs complets pour l\'Academic et le General Training. Entraînez-vous spécifiquement pour votre parcours.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'الأكاديمي مقابل التدريب العام في الايلتس: أيهما تحتاج؟',
      lead: 'عند التسجيل في اختبار الايلتس، يجب عليك الاختيار بين نسختين مختلفتين: <strong>الايلتس الأكاديمي</strong> و<strong>التدريب العام للايلتس</strong>. اختيار الاختبار الصحيح أمر بالغ الأهمية، إذ تشترط الجامعات وجهات الهجرة شهادة محددة.',
      h2_1: '١. لمن كل اختبار؟',
      academicTitle: 'الايلتس الأكاديمي',
      academicDesc: 'مصمم للأفراد الذين يتقدمون للقبول في التعليم العالي أو التسجيل في هيئات مهنية في بيئة ناطقة بالإنجليزية. إذا كنت تريد الدراسة في جامعة (بكالوريوس أو ماجستير) أو الانضمام لهيئة مهنية (كالهيئات الطبية أو الهندسية)، فهذا هو اختبارك.',
      generalTitle: 'التدريب العام للايلتس',
      generalDesc: 'مخصص لمن يهاجرون إلى دول ناطقة بالإنجليزية (كندا، أستراليا، نيوزيلندا، المملكة المتحدة) أو يتقدمون لبرامج تدريب ثانوية أو الهجرة العملية. يشترط برنامج الدخول السريع الكندي التدريب العام تحديداً.',
      h2_2: '٢. الفروق في صيغة الاختبار',
      formatIntro: 'كلا الاختبارين يقيّمان المهارات اللغوية الأربع: الاستماع والقراءة والكتابة والمحادثة. <strong>قسما الاستماع والمحادثة متطابقان تماماً</strong> في كلا الاختبارين. الفروق تكمن في القراءة والكتابة فقط.',
      readingTitle: 'قسم القراءة',
      readingBullets: [
        '<strong>القراءة الأكاديمية:</strong> ثلاثة نصوص طويلة تتراوح بين الوصفي والتحليلي، مستخرجة من كتب ومجلات وصحف علمية.',
        '<strong>قراءة التدريب العام:</strong> مقاطع من كتب ومجلات وإعلانات وأدلة شركات — مواد قد تصادفها يومياً في بيئة ناطقة بالإنجليزية.',
      ],
      writingTitle: 'قسم الكتابة',
      writingBullets: [
        '<strong>الكتابة الأكاديمية:</strong><br/>- <em>المهمة الأولى:</em> وصف رسم بياني أو جدول أو مخطط بكلماتك الخاصة.<br/>- <em>المهمة الثانية:</em> كتابة مقال رسمي للرد على وجهة نظر أو جدل.',
        '<strong>كتابة التدريب العام:</strong><br/>- <em>المهمة الأولى:</em> كتابة رسالة لطلب معلومات أو شرح موقف.<br/>- <em>المهمة الثانية:</em> مقال شبه شخصي للرد على وجهة نظر أو مشكلة.',
      ],
      h2_3: '٣. التنقيط والصعوبة',
      scoringText: 'رغم أن نظام التنقيط (من 0 إلى 9) واحد، إلا أن الحصول على درجة معينة في القراءة يتطلب إجابات صحيحة أكثر في التدريب العام مقارنة بالأكاديمي. ذلك لأن نصوص التدريب العام تُعتبر أبسط وأكثر مباشرة.',
      ctaTitle: 'تحضّر للاختبار المناسب',
      ctaDesc: 'مخبرنا الرقمي مجهز بامتحانات تجريبية شاملة لكلا الايلتس الأكاديمي والتدريب العام. تدرّب خصيصاً لمسارك.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getComputerVsPaperContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'The Official Switch to Computer-Based IELTS (2026)',
      alertTitle: 'Official Announcement:',
      alertText: '"We are pleased to announce that from <strong>30 April 2026</strong>, all IELTS tests will be delivered exclusively on computer, providing a faster, more efficient and streamlined testing experience. IELTS on computer offers the same test format, questions and scoring as IELTS on paper." <br/><br/><em>— The British Council</em>',
      lead: 'The era of the paper-based IELTS is officially ending. As the test transitions to a fully digital format, understanding the new system is no longer optional—it is mandatory.',
      h2_1: 'The New Advantages of Computer-Delivered IELTS',
      bullets: [
        '<strong>Faster results:</strong> Typically receive your results in just 1-2 days instead of two weeks.',
        '<strong>Faster booking:</strong> Book your test as late as one day before registration closes.',
        '<strong>More test dates:</strong> More choice and flexibility for your scheduling needs.',
        '<strong>One Skill Retake:</strong> Retake just one skill (e.g., Writing or Speaking), not the whole test, if you need to improve your score.',
        '<strong>Writing Capabilities:</strong> Copy, paste, edit freely, and rely on an automatic word counter.',
      ],
      h2_2: 'Official IDP & British Council Q&A',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'The official test is going fully digital. Guarantee your score with our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Le Passage Officiel à l\'IELTS sur Ordinateur (2026)',
      alertTitle: 'Annonce Officielle :',
      alertText: '\"Nous sommes heureux d\'annoncer qu\'à partir du <strong>30 avril 2026</strong>, tous les tests IELTS seront administrés exclusivement sur ordinateur, offrant une expérience de test plus rapide, plus efficace et rationalisée.\" <br/><br/><em>— The British Council</em>',
      lead: 'L\'ère de l\'IELTS sur papier prend officiellement fin. Comprendre le nouveau système numérique n\'est plus optionnel — c\'est obligatoire.',
      h2_1: 'Les Nouveaux Avantages de l\'IELTS sur Ordinateur',
      bullets: [
        '<strong>Résultats plus rapides :</strong> Obtenez vos résultats en 1 à 2 jours au lieu de deux semaines.',
        '<strong>Réservation plus rapide :</strong> Réservez votre test jusqu\'à un jour avant la clôture des inscriptions.',
        '<strong>Plus de dates de test :</strong> Plus de flexibilité pour votre planning.',
        '<strong>Repasser une seule compétence :</strong> Repassez uniquement la compétence souhaitée (ex. : Writing ou Speaking) si vous avez besoin d\'améliorer votre score.',
        '<strong>Outils d\'écriture :</strong> Copiez, collez, éditez librement et profitez du comptage automatique des mots.',
      ],
      h2_2: 'Questions-Réponses IDP & British Council',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Le test officiel passe au tout numérique. Garantissez votre score avec notre formation intensive sur ordinateur.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'التحول الرسمي للايلتس على الكمبيوتر (2026)',
      alertTitle: 'إعلان رسمي:',
      alertText: '"يسعدنا الإعلان أنه اعتباراً من <strong>30 أبريل 2026</strong>، سيُقدَّم اختبار الايلتس حصرياً على أجهزة الكمبيوتر، مما يوفر تجربة أسرع وأكثر كفاءة." <br/><br/><em>— المجلس الثقافي البريطاني</em>',
      lead: 'عصر الايلتس الورقي ينتهي رسمياً. فهم النظام الرقمي الجديد لم يعد اختيارياً — بل أصبح إلزامياً.',
      h2_1: 'المزايا الجديدة للايلتس على الكمبيوتر',
      bullets: [
        '<strong>نتائج أسرع:</strong> احصل على نتائجك في 1-2 يوم بدلاً من أسبوعين.',
        '<strong>حجز أسرع:</strong> احجز اختبارك حتى يوم واحد قبل إغلاق التسجيل.',
        '<strong>تواريخ أكثر:</strong> مرونة أكبر في تحديد موعد اختبارك.',
        '<strong>إعادة مهارة واحدة:</strong> أعد فقط المهارة التي تحتاج تحسينها (مثلاً: الكتابة أو المحادثة) دون إعادة الاختبار كاملاً.',
        '<strong>أدوات الكتابة:</strong> نسخ، لصق، تحرير حر، وعداد كلمات تلقائي.',
      ],
      h2_2: 'أسئلة وأجوبة IDP والمجلس الثقافي البريطاني',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'الاختبار الرسمي أصبح رقمياً بالكامل. ضمن درجتك مع تدريبنا المكثف على الكمبيوتر.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getFreeResourcesContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'The Best Free IELTS Practice Tests (And Why Cambridge PDFs Aren\'t Enough)',
      lead: 'Many candidates begin their IELTS journey by downloading gigabytes of free Cambridge PDFs. While these books contain authentic past papers, practicing exclusively on printed PDFs will severely compromise your readiness for the computer-delivered exam.',
      h2_1: 'The Trap of Paper Handouts',
      p1: 'The official British Council test is digital. If you spend two months practicing reading comprehension on a printed A4 paper with a pencil, you are building the wrong muscle memory. You need to train your eyes to scan text on a monitor and use digital highlight tools.',
      h2_2: 'Where to Find Authentic Digital Practice',
      bullets: [
        '<strong>British Council Familiarisation Test:</strong> The official British Council website offers a free mock test that uses the exact same interface software as the real exam. This is mandatory practice.',
        '<strong>IELTSonComputer.com:</strong> Excellent third-party sites that replicate the side-by-side reading layout of the computer exam.',
      ],
      h2_3: 'Why You Need Feedback',
      p2: 'Free reading and listening tests are easy to grade because they are objective. Writing and Speaking, however, are subjective. You cannot evaluate your own essay for Coherence and Cohesion. This is why investing in expert feedback from a high-scorer is the fastest way to break past a Band 6.0 plateau.',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'The official British Council test is digital. Guarantee your score with our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Les Meilleures Ressources Gratuites pour l\'IELTS (Et Pourquoi les PDFs Cambridge ne Suffisent Pas)',
      lead: 'Beaucoup de candidats commencent leur préparation en téléchargeant des gigaoctets de PDFs Cambridge gratuits. Bien que ces livres contiennent d\'authentiques sujets passés, s\'entraîner uniquement sur des PDF imprimés compromettra sérieusement votre préparation pour l\'examen sur ordinateur.',
      h2_1: 'Le Piège des Supports Papier',
      p1: 'Le test officiel du British Council est numérique. Si vous passez deux mois à pratiquer la lecture sur du papier A4 avec un crayon, vous développez les mauvais réflexes. Vous devez entraîner vos yeux à scanner un texte sur écran et à utiliser les outils de surlignage numériques.',
      h2_2: 'Où Trouver une Pratique Numérique Authentique',
      bullets: [
        '<strong>Test de familiarisation du British Council :</strong> Le site officiel propose un test blanc gratuit utilisant exactement le même logiciel que l\'examen réel. C\'est une pratique obligatoire.',
        '<strong>IELTSonComputer.com :</strong> D\'excellents sites tiers qui reproduisent la mise en page côte-à-côte du test sur ordinateur.',
      ],
      h2_3: 'Pourquoi Vous Avez Besoin de Retours',
      p2: 'Les tests de lecture et d\'écoute gratuits sont faciles à évaluer car ils sont objectifs. En revanche, l\'écriture et l\'expression orale sont subjectives. Vous ne pouvez pas évaluer votre propre essai pour la cohérence. C\'est pourquoi investir dans des retours d\'un expert est le moyen le plus rapide de dépasser un plateau de Band 6.0.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Le test officiel du British Council est numérique. Garantissez votre score avec notre formation intensive.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'أفضل موارد الايلتس المجانية (ولماذا ملفات PDF كامبريدج لا تكفي)',
      lead: 'يبدأ كثير من المرشحين رحلتهم بتنزيل غيغابايتات من ملفات PDF لكامبريدج. وبينما تحتوي هذه الكتب على أسئلة أصلية، فإن التدريب حصرياً على مطبوعات ورقية سيضعف استعدادك بشكل كبير للاختبار الرقمي.',
      h2_1: 'فخ الأوراق المطبوعة',
      p1: 'اختبار المجلس الثقافي البريطاني الرسمي رقمي. إذا أمضيت شهرين تتدرب على القراءة بقلم رصاص على ورق A4، فأنت تبني ذاكرة عضلية خاطئة. تحتاج إلى تدريب عينيك على مسح النص على شاشة واستخدام أدوات التمييز الرقمية.',
      h2_2: 'أين تجد تدريباً رقمياً أصيلاً',
      bullets: [
        '<strong>اختبار التعرف من المجلس الثقافي البريطاني:</strong> يقدم الموقع الرسمي اختباراً تجريبياً مجانياً يستخدم نفس واجهة البرنامج الرسمي. هذا التدريب إلزامي.',
        '<strong>IELTSonComputer.com:</strong> مواقع ممتازة تحاكي تنسيق القراءة على الكمبيوتر.',
      ],
      h2_3: 'لماذا تحتاج إلى تغذية راجعة',
      p2: 'اختبارات القراءة والاستماع المجانية سهلة التقييم لأنها موضوعية. أما الكتابة والمحادثة فهي ذاتية. لا يمكنك تقييم مقالتك الخاصة للتماسك والترابط. لهذا السبب، الاستثمار في تغذية راجعة من خبير هو أسرع طريقة لتجاوز مستوى 6.0.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'اختبار المجلس الثقافي البريطاني الرسمي رقمي. ضمن درجتك مع تدريبنا المكثف.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getHowToRegisterContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'How to Register for the British Council IELTS in Algeria',
      summaryTitle: 'Quick Summary:',
      summaryText: 'The test fee in Algeria is currently <strong>40,000 DA</strong>. You must register through the official <strong>British Council Portal</strong>. Payment must be made offline within 3-5 days of online registration, usually via a bank transfer (CPA Bank) or at a local British Council center.',
      intro: 'Registering for the IELTS in Algeria can seem daunting, but the British Council has streamlined the process significantly in recent years. Here is exactly what you need to know to secure your test date without issues.',
      h2_1: 'Step-by-Step Registration',
      steps: [
        { title: 'Create a British Council Account', desc: 'Go to the official British Council Algeria website. You will need to create a profile using exactly the same name and details that appear on your valid Passport or National ID card.' },
        { title: 'Choose Format and Location', desc: 'You must select whether you are taking <strong>Academic</strong> or <strong>General Training</strong>. Then, select your format: <strong>Computer-delivered</strong> or <strong>Paper-based</strong>. Test centers are available in Algiers, Oran, and Constantine.' },
        { title: 'Upload ID Document', desc: 'You must upload a clear, color scan of your ID. <strong>Crucial Rule:</strong> The ID you use to register is the exact same ID you must bring on the day of the test. If you register with your passport, do not bring your national ID card to the test center.' },
        { title: 'Offline Payment', desc: 'After booking, your seat is temporarily reserved. You usually have 3 to 5 days to complete the payment. You can pay via a direct bank transfer (usually to CPA Bank) using the references provided in your confirmation email, or in cash at an authorized center.' },
      ],
      h2_2: 'Computer-Delivered vs Paper-Based',
      compIntro: 'We strongly recommend the <strong>Computer-Delivered</strong> test. Not only are the results available much faster (3-5 days instead of 13 days), but the interface provides a massive advantage for Algerian candidates:',
      compBullets: [
        '<strong>Word Count:</strong> The screen automatically counts your words in the Writing section.',
        '<strong>Editing:</strong> You can copy, paste, and rewrite sentences instantly without messy erasers.',
        '<strong>Timers:</strong> A persistent on-screen clock flashes red when you are low on time.',
        '<strong>Headphones:</strong> Everyone gets their own high-quality headphones for the Listening section (no echoey rooms).',
      ],
      ctaTitle: 'Prepare Before You Pay',
      ctaDesc: '40,000 DA is a significant investment. Do not book your test date until you are consistently hitting your target band scores in realistic, timed, computer-based practice sessions.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Comment s\'inscrire à l\'IELTS du British Council en Algérie',
      summaryTitle: 'Résumé :',
      summaryText: 'Les frais de test en Algérie sont actuellement de <strong>40 000 DA</strong>. Vous devez vous inscrire via le <strong>portail officiel du British Council</strong>. Le paiement doit être effectué hors ligne dans les 3 à 5 jours suivant l\'inscription, généralement par virement bancaire (CPA Bank) ou en personne.',
      intro: 'S\'inscrire à l\'IELTS en Algérie peut sembler intimidant, mais le British Council a simplifié le processus ces dernières années. Voici exactement ce que vous devez savoir.',
      h2_1: 'Inscription Étape par Étape',
      steps: [
        { title: 'Créer un compte British Council', desc: 'Rendez-vous sur le site officiel du British Council Algérie. Créez un profil avec exactement les mêmes nom et prénom que sur votre passeport ou carte nationale.' },
        { title: 'Choisir le format et le lieu', desc: 'Sélectionnez <strong>Academic</strong> ou <strong>General Training</strong>, puis le format : <strong>ordinateur</strong> ou <strong>papier</strong>. Des centres de test sont disponibles à Alger, Oran et Constantine.' },
        { title: 'Télécharger une pièce d\'identité', desc: 'Téléchargez un scan couleur clair de votre pièce d\'identité. <strong>Règle cruciale :</strong> La pièce utilisée à l\'inscription doit être la même apportée le jour de l\'examen.' },
        { title: 'Paiement hors ligne', desc: 'Après la réservation, votre place est temporairement réservée. Vous avez généralement 3 à 5 jours pour payer par virement bancaire (CPA Bank) ou en espèces dans un centre agréé.' },
      ],
      h2_2: 'Test sur Ordinateur vs Papier',
      compIntro: 'Nous recommandons fortement le test sur <strong>ordinateur</strong>. Non seulement les résultats sont disponibles bien plus vite (3-5 jours au lieu de 13), mais l\'interface offre un avantage considérable :',
      compBullets: [
        '<strong>Comptage automatique :</strong> L\'écran compte automatiquement vos mots en Writing.',
        '<strong>Édition :</strong> Copiez, collez et reformulez instantanément sans ratures.',
        '<strong>Minuterie :</strong> Une horloge persistante clignote en rouge quand le temps est limité.',
        '<strong>Casques audio :</strong> Chaque candidat dispose de son propre casque haute qualité pour l\'écoute.',
      ],
      ctaTitle: 'Préparez-vous Avant de Payer',
      ctaDesc: '40 000 DA est un investissement important. Ne réservez pas votre date avant d\'atteindre régulièrement vos scores cibles lors de sessions réalistes sur ordinateur.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'كيفية التسجيل في اختبار الايلتس التابع للمجلس الثقافي البريطاني في الجزائر',
      summaryTitle: 'ملخص سريع:',
      summaryText: 'رسوم الاختبار في الجزائر حالياً <strong>40,000 دج</strong>. يجب التسجيل عبر <strong>البوابة الرسمية للمجلس الثقافي البريطاني</strong>. يُدفع المبلغ خارج الإنترنت في غضون 3-5 أيام من التسجيل، عادةً عبر تحويل مصرفي (بنك CPA) أو في مركز البريطاني المحلي.',
      intro: 'قد يبدو التسجيل في اختبار الايلتس بالجزائر أمراً معقداً، لكن المجلس البريطاني بسّط العملية كثيراً في السنوات الأخيرة. إليك بالضبط ما تحتاج معرفته.',
      h2_1: 'التسجيل خطوة بخطوة',
      steps: [
        { title: 'إنشاء حساب في المجلس الثقافي البريطاني', desc: 'انتقل إلى الموقع الرسمي للمجلس الثقافي البريطاني - الجزائر. أنشئ ملفاً شخصياً بنفس الاسم والبيانات الواردة في جواز سفرك أو بطاقة هويتك الوطنية.' },
        { title: 'اختيار الصيغة والموقع', desc: 'اختر بين <strong>الأكاديمي</strong> أو <strong>التدريب العام</strong>، ثم الصيغة: <strong>كمبيوتر</strong> أو <strong>ورقي</strong>. مراكز الاختبار متاحة في الجزائر العاصمة ووهران وقسنطينة.' },
        { title: 'رفع وثيقة الهوية', desc: 'ارفع نسخة ملونة واضحة من هويتك. <strong>قاعدة أساسية:</strong> الهوية المستخدمة في التسجيل هي نفسها التي يجب إحضارها يوم الاختبار.' },
        { title: 'الدفع خارج الإنترنت', desc: 'بعد الحجز، يُحفظ مقعدك مؤقتاً. عادةً لديك 3 إلى 5 أيام للدفع عبر تحويل مصرفي (بنك CPA) أو نقداً في مركز معتمد.' },
      ],
      h2_2: 'الاختبار على الكمبيوتر مقابل الورقي',
      compIntro: 'ننصح بشدة بالاختبار على <strong>الكمبيوتر</strong>. النتائج تأتي أسرع بكثير (3-5 أيام بدلاً من 13 يوماً)، والواجهة توفر ميزة كبيرة:',
      compBullets: [
        '<strong>عداد الكلمات:</strong> الشاشة تحسب كلماتك تلقائياً في قسم الكتابة.',
        '<strong>التحرير:</strong> نسخ ولصق وإعادة صياغة فورية بلا طمس.',
        '<strong>المؤقتات:</strong> ساعة على الشاشة تومض بالأحمر عند اقتراب انتهاء الوقت.',
        '<strong>سماعات الرأس:</strong> كل مرشح لديه سماعاته الخاصة عالية الجودة للاستماع.',
      ],
      ctaTitle: 'استعد قبل أن تدفع',
      ctaDesc: '40,000 دج استثمار كبير. لا تحجز تاريخ اختبارك حتى تحقق درجاتك المستهدفة باستمرار في جلسات تجريبية واقعية على الكمبيوتر.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getIeltsVsToeflContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'IELTS vs. TOEFL vs. TCF: Which Test Do You Need for Canada?',
      keyTakeawayTitle: 'Key Takeaway:',
      keyTakeawayText: 'If you are applying for <strong>Immigration (Express Entry)</strong>, TOEFL is completely useless. You must take either the <strong>IELTS General Training</strong> or the <strong>TCF Canada</strong>. For <strong>University Admissions (Study Permits)</strong>, the Academic IELTS is universally preferred across Canadian provinces.',
      intro: 'Choosing the right language test is the first major hurdle for Algerian candidates looking to immigrate to Canada via Express Entry or apply for a study permit. Wasting time and money (over 40,000 DA) on the wrong test can delay your application by months.',
      ctaTitle: 'Secure Your CLB 9',
      ctaDesc: 'Achieving a Band 7.0+ in writing is statistically the hardest part of the IELTS for Algerian candidates. Guarantee your score with our computer-based training in Oran.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'IELTS vs. TOEFL vs. TCF : Quel Test Faut-il Passer pour le Canada ?',
      keyTakeawayTitle: 'Point Clé :',
      keyTakeawayText: 'Si vous postulez pour l\'<strong>Immigration (Entrée express)</strong>, le TOEFL est totalement inutile. Vous devez passer soit l\'<strong>IELTS General Training</strong>, soit le <strong>TCF Canada</strong>. Pour les <strong>admissions universitaires (permis d\'études)</strong>, l\'IELTS Academic est universellement préféré.',
      intro: 'Choisir le bon test de langue est le premier obstacle majeur pour les candidats algériens qui souhaitent immigrer au Canada via Entrée express ou obtenir un permis d\'études. Perdre du temps et de l\'argent (plus de 40 000 DA) sur le mauvais test peut retarder votre dossier de plusieurs mois.',
      ctaTitle: 'Atteignez votre CLB 9',
      ctaDesc: 'Obtenir un Band 7.0+ en writing est statistiquement la partie la plus difficile de l\'IELTS pour les candidats algériens. Garantissez votre score avec notre formation sur ordinateur à Oran.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'الايلتس مقابل التوفل مقابل TCF: أي اختبار تحتاجه للكندا؟',
      keyTakeawayTitle: 'الخلاصة الجوهرية:',
      keyTakeawayText: 'إذا كنت تتقدم للهجرة <strong>(الدخول السريع)</strong>، فإن التوفل عديم الفائدة تماماً. يجب أن تجتاز إما <strong>التدريب العام للايلتس</strong> أو <strong>TCF Canada</strong>. لـ<strong>القبول الجامعي (تصاريح الدراسة)</strong>، يُفضَّل الايلتس الأكاديمي على نطاق واسع.',
      intro: 'اختيار الاختبار اللغوي الصحيح هو أول عقبة رئيسية للمرشحين الجزائريين الراغبين في الهجرة إلى كندا. إهدار الوقت والمال (أكثر من 40,000 دج) على الاختبار الخاطئ قد يؤخر ملفك بأشهر.',
      ctaTitle: 'اضمن CLB 9',
      ctaDesc: 'تحقيق 7.0+ في الكتابة هو إحصائياً الجزء الأصعب في الايلتس للمرشحين الجزائريين. ضمن درجتك مع تدريبنا على الكمبيوتر في وهران.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getTlscontactContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'TLScontact & Capago: Language Requirements for UK and France Student Visas',
      warningTitle: 'Critical Warning:',
      warningText: 'If you are applying for a UK Tier 4 Visa, the standard Academic IELTS is <strong>not enough</strong>. You must explicitly book the <strong>IELTS for UKVI (Academic)</strong>. Submitting a standard IELTS certificate at TLScontact will result in an automatic visa refusal.',
      ctaTitle: 'Don\'t Miss Your Intake Deadline',
      ctaDesc: 'Visa appointments are notoriously difficult to book in Algeria. Guarantee your score with our computer-based training so you don\'t lose your slot.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'TLScontact & Capago : Exigences Linguistiques pour les Visas Étudiants UK et France',
      warningTitle: 'Avertissement Critique :',
      warningText: 'Si vous postulez pour un visa étudiant UK (Tier 4), l\'IELTS Academic standard n\'est <strong>pas suffisant</strong>. Vous devez explicitement réserver l\'<strong>IELTS for UKVI (Academic)</strong>. Soumettre un certificat IELTS standard à TLScontact entraîne un refus automatique du visa.',
      ctaTitle: 'Ne Ratez Pas Votre Date d\'Inscription',
      ctaDesc: 'Les rendez-vous de visa sont notoirement difficiles à obtenir en Algérie. Garantissez votre score avec notre formation pour ne pas perdre votre créneau.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'TLScontact وCapago: متطلبات اللغة لتأشيرات الطلاب في المملكة المتحدة وفرنسا',
      warningTitle: 'تحذير حاسم:',
      warningText: 'إذا كنت تتقدم لتأشيرة طالب في المملكة المتحدة (Tier 4)، فالايلتس الأكاديمي القياسي <strong>غير كافٍ</strong>. يجب عليك حجز <strong>IELTS for UKVI (Academic)</strong> تحديداً. تقديم شهادة الايلتس القياسية في TLScontact يؤدي إلى رفض تلقائي للتأشيرة.',
      ctaTitle: 'لا تفوّت موعد تسجيلك',
      ctaDesc: 'مواعيد التأشيرات صعبة الحصول في الجزائر. ضمن درجتك مع تدريبنا على الكمبيوتر حتى لا تخسر فرصتك.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getWritingTask2Content(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'How to Crack IELTS Writing Task 2 (From a Band 8.0 Scorer)',
      lead: 'Writing Task 2 is the hardest section of the IELTS for most Algerian candidates. Even highly fluent English speakers often score a 6.0 because they treat the task as a general English test, rather than a highly structured academic exercise.',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'The official British Council test is digital. Guarantee your score with our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Comment Réussir l\'IELTS Writing Task 2 (Par un Scorer 8.0)',
      lead: 'La Tâche 2 de Writing est la section la plus difficile de l\'IELTS pour la plupart des candidats algériens. Même des locuteurs anglais très fluents obtiennent souvent un 6.0 parce qu\'ils traitent la tâche comme un test d\'anglais général, plutôt que comme un exercice académique hautement structuré.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Le test officiel du British Council est numérique. Garantissez votre score avec notre formation intensive sur ordinateur.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'كيف تتقن كتابة المهمة الثانية في الايلتس (من حاصل على 8.0)',
      lead: 'المهمة الثانية للكتابة هي الجزء الأصعب في اختبار الايلتس لغالبية المرشحين الجزائريين. حتى الناطقين الطلاقة بالإنجليزية كثيراً ما يحصلون على 6.0 لأنهم يتعاملون مع المهمة كاختبار إنجليزي عام وليس تمريناً أكاديمياً منظماً.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'اختبار المجلس الثقافي البريطاني رقمي رسمياً. ضمن درجتك مع تدريبنا المكثف على الكمبيوتر.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getSpeakingAnxietyContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'Overcoming Speaking Anxiety: A Guide for Algerian Candidates',
      lead: 'The IELTS Speaking test is an intimidating experience. Sitting face-to-face with an examiner can induce anxiety that ruins even a fluent speaker\'s performance.',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'The official British Council test is digital. Guarantee your score with our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Surmonter l\'Anxiété à l\'IELTS Speaking : Guide pour les Candidats Algériens',
      lead: 'Le test Speaking de l\'IELTS est une expérience intimidante. Être face à face avec un examinateur peut provoquer une anxiété qui ruine même la performance d\'un locuteur fluent.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Le test officiel du British Council est numérique. Garantissez votre score avec notre formation intensive.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'التغلب على القلق في محادثة الايلتس: دليل للمرشحين الجزائريين',
      lead: 'اختبار المحادثة في الايلتس تجربة مرهبة. الجلوس وجهاً لوجه أمام محكم قد يسبب قلقاً يدمر أداء حتى المتحدثين الطلاقة.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'اختبار المجلس الثقافي البريطاني رقمي. ضمن درجتك مع تدريبنا المكثف على الكمبيوتر.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getArticlesListContent(locale: ArticleLocale) {
  const content = {
    en: {
      pageTitle: 'Visa & Test Hub',
      pageSubtitle: 'Everything you need to know about navigating the IELTS requirement for Canada, UK, and France.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'Student Visas', title: 'TLScontact & Capago: Language Requirements for UK and France', desc: 'Learn the exact English language requirements for UK and France student visas when applying through TLScontact or Capago in Algeria.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'Immigration', title: 'IELTS vs. TEF/TCF for Canada Express Entry', desc: 'Discover whether you should take the IELTS or TEF/TCF to maximize your CRS score for Canadian immigration programs.' },
        { href: '/articles/how-to-register-algeria', category: 'Logistics', title: 'How to Register for the British Council IELTS in Algeria', desc: 'A step-by-step guide to registering and paying for the British Council IELTS test in Algeria without credit card issues.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'Test Format', title: 'The Official Switch to Computer-Based IELTS (2026)', desc: 'Understand the crucial differences between taking the IELTS on a computer versus on paper, and the new 2026 official transition.' },
        { href: '/articles/academic-vs-general', category: 'Test Format', title: 'IELTS Academic vs. General Training', desc: 'Learn the differences between IELTS Academic and General Training to choose the right test for your university or immigration goals.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'Preparation', title: 'Free IELTS Resources in Algeria', desc: 'Discover the best free IELTS practice tests and resources available to candidates in Algeria, and learn why Cambridge PDFs aren\'t enough.' },
        { href: '/articles/writing-task-2-tactics', category: 'Writing Section', title: 'IELTS Writing Task 2 Tactics', desc: 'Learn exactly how to structure an IELTS Writing Task 2 essay to achieve a Band 7.0 or higher.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'Speaking Section', title: 'Overcoming IELTS Speaking Anxiety', desc: 'A tactical guide for Algerian candidates to overcome nervousness and perform confidently in the IELTS Speaking test.' },
      ],
    },
    fr: {
      pageTitle: 'Hub Visa & Test',
      pageSubtitle: 'Tout ce que vous devez savoir sur les exigences IELTS pour le Canada, le Royaume-Uni et la France.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'Visas Étudiants', title: 'TLScontact & Capago : Exigences Linguistiques pour le UK et la France', desc: 'Découvrez les exigences linguistiques exactes pour les visas étudiants UK et France via TLScontact ou Capago en Algérie.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'Immigration', title: 'IELTS vs. TEF/TCF pour le Canada (Entrée express)', desc: 'Découvrez si vous devez passer l\'IELTS ou le TEF/TCF pour maximiser votre score CRS pour les programmes d\'immigration canadienne.' },
        { href: '/articles/how-to-register-algeria', category: 'Logistique', title: 'Comment s\'inscrire à l\'IELTS du British Council en Algérie', desc: 'Guide étape par étape pour s\'inscrire et payer l\'IELTS du British Council en Algérie sans problèmes de carte bancaire.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'Format du Test', title: 'Le Passage Officiel à l\'IELTS sur Ordinateur (2026)', desc: 'Comprenez les différences cruciales entre l\'IELTS sur ordinateur et sur papier, et la nouvelle transition officielle de 2026.' },
        { href: '/articles/academic-vs-general', category: 'Format du Test', title: 'IELTS Academic vs. General Training', desc: 'Apprenez les différences entre l\'IELTS Academic et le General Training pour choisir le bon test.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'Préparation', title: 'Ressources IELTS Gratuites en Algérie', desc: 'Découvrez les meilleures ressources gratuites disponibles en Algérie, et pourquoi les PDFs Cambridge ne suffisent pas.' },
        { href: '/articles/writing-task-2-tactics', category: 'Section Écriture', title: 'Tactiques pour l\'IELTS Writing Task 2', desc: 'Apprenez exactement comment structurer un essai Writing Task 2 pour obtenir un Band 7.0 ou plus.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'Section Orale', title: 'Surmonter l\'Anxiété au Speaking IELTS', desc: 'Un guide tactique pour les candidats algériens afin de surmonter le stress et performer avec confiance.' },
      ],
    },
    ar: {
      pageTitle: 'مركز التأشيرات والاختبارات',
      pageSubtitle: 'كل ما تحتاج معرفته حول متطلبات الايلتس للكندا والمملكة المتحدة وفرنسا.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'تأشيرات الطلاب', title: 'TLScontact وCapago: متطلبات اللغة للمملكة المتحدة وفرنسا', desc: 'تعرّف على متطلبات اللغة الإنجليزية الدقيقة لتأشيرات الطلاب في المملكة المتحدة وفرنسا.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'الهجرة', title: 'الايلتس مقابل TEF/TCF للدخول السريع إلى كندا', desc: 'اكتشف ما إذا كان يجب عليك اجتياز الايلتس أو TEF/TCF لتعظيم درجة CRS الخاصة بك.' },
        { href: '/articles/how-to-register-algeria', category: 'اللوجستيات', title: 'كيفية التسجيل في الايلتس بالجزائر', desc: 'دليل خطوة بخطوة للتسجيل والدفع للاختبار في الجزائر.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'صيغة الاختبار', title: 'التحول الرسمي للايلتس على الكمبيوتر (2026)', desc: 'افهم الفروق الجوهرية بين الاختبار على الكمبيوتر والورق والتحول الرسمي لعام 2026.' },
        { href: '/articles/academic-vs-general', category: 'صيغة الاختبار', title: 'الايلتس الأكاديمي مقابل التدريب العام', desc: 'تعلّم الفروق بين الإصدارين لاختيار الاختبار المناسب لأهدافك.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'التحضير', title: 'موارد الايلتس المجانية في الجزائر', desc: 'اكتشف أفضل موارد الممارسة المجانية المتاحة في الجزائر.' },
        { href: '/articles/writing-task-2-tactics', category: 'قسم الكتابة', title: 'تكتيكات المهمة الثانية للكتابة في الايلتس', desc: 'تعلّم بالضبط كيفية هيكلة مقال المهمة الثانية للحصول على Band 7.0 أو أعلى.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'قسم المحادثة', title: 'التغلب على قلق محادثة الايلتس', desc: 'دليل تكتيكي للمرشحين الجزائريين للتغلب على التوتر والأداء بثقة في اختبار المحادثة.' },
      ],
    },
  };
  return content[locale] || content.en;
}
