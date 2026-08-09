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
      formatIntro: 'Both tests assess all four language skills - Listening, Reading, Writing, and Speaking. The <strong>Listening and Speaking sections are exactly the same</strong> for both tests. The differences lie entirely in the Reading and Writing sections.',
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
      scoringText: 'The Band 0-to-9 scale is the same. Official guidance indicates that General Training Reading usually requires more correct answers for the same band because its texts are generally less complex. Exact raw-score boundaries can vary slightly between test versions.',
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
        '<strong>General Training Reading :</strong> Des extraits de livres, magazines, journaux, annonces, manuels d\'entreprise et directives - des documents que vous pourriez rencontrer au quotidien dans un pays anglophone.',
      ],
      writingTitle: 'La section Writing',
      writingBullets: [
        '<strong>Academic Writing :</strong><br/>- <em>Tâche 1 :</em> Vous décrivez, résumez ou expliquez un graphique, tableau, diagramme ou schéma dans vos propres mots.<br/>- <em>Tâche 2 :</em> Rédigez un essai formel en réponse à un point de vue, un argument ou un problème.',
        '<strong>General Training Writing :</strong><br/>- <em>Tâche 1 :</em> Vous rédigez une lettre pour demander des informations ou expliquer une situation.<br/>- <em>Tâche 2 :</em> Rédigez un essai légèrement plus personnel en réponse à un point de vue ou un problème.',
      ],
      h2_3: '3. Notation et difficulté',
      scoringText: 'L\'échelle de 0 à 9 est identique. Les indications officielles montrent que General Training Reading demande généralement plus de bonnes réponses pour une même bande, car les textes sont moins complexes. Les seuils exacts peuvent varier légèrement selon la version.',
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
        '<strong>قراءة التدريب العام:</strong> مقاطع من كتب ومجلات وإعلانات وأدلة شركات - مواد قد تصادفها يومياً في بيئة ناطقة بالإنجليزية.',
      ],
      writingTitle: 'قسم الكتابة',
      writingBullets: [
        '<strong>الكتابة الأكاديمية:</strong><br/>- <em>المهمة الأولى:</em> وصف رسم بياني أو جدول أو مخطط بكلماتك الخاصة.<br/>- <em>المهمة الثانية:</em> كتابة مقال رسمي للرد على وجهة نظر أو جدل.',
        '<strong>كتابة التدريب العام:</strong><br/>- <em>المهمة الأولى:</em> كتابة رسالة لطلب معلومات أو شرح موقف.<br/>- <em>المهمة الثانية:</em> مقال شبه شخصي للرد على وجهة نظر أو مشكلة.',
      ],
      h2_3: '٣. التنقيط والصعوبة',
      scoringText: 'مقياس الدرجات من 0 إلى 9 واحد. تشير الإرشادات الرسمية إلى أن General Training Reading يتطلب عادة إجابات صحيحة أكثر للدرجة نفسها لأن النصوص أقل تعقيداً. وقد تختلف الحدود الدقيقة قليلاً بين نسخ الاختبار.',
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
      alertText: 'The British Council Algeria states that from <strong>30 April 2026</strong>, its IELTS tests are delivered exclusively on computer. The test format, questions, and scoring remain the same.',
      lead: 'The era of the paper-based IELTS is officially ending. As the test transitions to a fully digital format, understanding the new system is no longer optional - it is mandatory.',
      h2_1: 'The New Advantages of Computer-Delivered IELTS',
      bullets: [
        '<strong>Faster results:</strong> Typically receive your results in just 1-2 days instead of two weeks.',
        '<strong>Faster booking:</strong> Book your test as late as one day before registration closes.',
        '<strong>More test dates:</strong> More choice and flexibility for your scheduling needs.',
        '<strong>One Skill Retake:</strong> Where available and accepted by your receiving organisation, retake one skill within 60 days of the original computer test. It is not accepted for Canada Express Entry.',
        '<strong>Writing Capabilities:</strong> Copy, paste, edit freely, and rely on an automatic word counter.',
      ],
      h2_2: 'Official IDP & British Council Q&A',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'The official test in Algeria is computer-delivered. Train the interface and the assessed skills in our intensive lab.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Le Passage Officiel à l\'IELTS sur Ordinateur (2026)',
      alertTitle: 'Annonce Officielle :',
      alertText: 'Le British Council Algérie indique qu\'à partir du <strong>30 avril 2026</strong>, ses tests IELTS sont exclusivement sur ordinateur. Le format, les questions et la notation restent identiques.',
      lead: 'L\'ère de l\'IELTS sur papier prend officiellement fin. Comprendre le nouveau système numérique n\'est plus optionnel - c\'est obligatoire.',
      h2_1: 'Les Nouveaux Avantages de l\'IELTS sur Ordinateur',
      bullets: [
        '<strong>Résultats plus rapides :</strong> Obtenez vos résultats en 1 à 2 jours au lieu de deux semaines.',
        '<strong>Réservation plus rapide :</strong> Réservez votre test jusqu\'à un jour avant la clôture des inscriptions.',
        '<strong>Plus de dates de test :</strong> Plus de flexibilité pour votre planning.',
        '<strong>Repasser une seule compétence :</strong> Si l\'option est disponible et acceptée par l\'organisme destinataire, repassez une compétence sous 60 jours. Elle n\'est pas acceptée pour Entrée express au Canada.',
        '<strong>Outils d\'écriture :</strong> Copiez, collez, éditez librement et profitez du comptage automatique des mots.',
      ],
      h2_2: 'Questions-Réponses IDP & British Council',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'En Algérie, le test est sur ordinateur. Entraînez l’interface et les compétences évaluées dans notre laboratoire intensif.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'التحول الرسمي للايلتس على الكمبيوتر (2026)',
      alertTitle: 'إعلان رسمي:',
      alertText: 'يذكر المجلس الثقافي البريطاني في الجزائر أن اختباراته تُقدَّم حصرياً على الكمبيوتر ابتداءً من <strong>30 أبريل 2026</strong>. يبقى تنسيق الاختبار والأسئلة والتقييم كما هو.',
      lead: 'عصر الايلتس الورقي ينتهي رسمياً. فهم النظام الرقمي الجديد لم يعد اختيارياً - بل أصبح إلزامياً.',
      h2_1: 'المزايا الجديدة للايلتس على الكمبيوتر',
      bullets: [
        '<strong>نتائج أسرع:</strong> احصل على نتائجك في 1-2 يوم بدلاً من أسبوعين.',
        '<strong>حجز أسرع:</strong> احجز اختبارك حتى يوم واحد قبل إغلاق التسجيل.',
        '<strong>تواريخ أكثر:</strong> مرونة أكبر في تحديد موعد اختبارك.',
        '<strong>إعادة مهارة واحدة:</strong> عند توفرها وقبولها من الجهة المستلمة، يمكنك إعادة مهارة واحدة خلال 60 يوماً من الاختبار الأصلي على الكمبيوتر. لا تقبلها كندا في Express Entry.',
        '<strong>أدوات الكتابة:</strong> نسخ، لصق، تحرير حر، وعداد كلمات تلقائي.',
      ],
      h2_2: 'أسئلة وأجوبة IDP والمجلس الثقافي البريطاني',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'الاختبار الرسمي في الجزائر على الكمبيوتر. تدرّب على الواجهة والمهارات المقيمة في مختبرنا المكثف.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getFreeResourcesContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'The Best Free IELTS Practice Tests (And Why Cambridge PDFs Aren\'t Enough)',
      lead: 'Licensed Cambridge IELTS books can provide useful practice questions, but paper-only practice does not train the navigation, typing, highlighting, and timing habits needed for Algeria’s computer-delivered test.',
      h2_1: 'The Trap of Paper Handouts',
      p1: 'From 30 April 2026, British Council IELTS tests in Algeria are delivered on computer. Paper practice can still build language and question skills, but your weekly plan should also include timed practice on a monitor.',
      h2_2: 'Where to Find Authentic Digital Practice',
      bullets: [
        '<strong>British Council IELTS Ready:</strong> Free preparation materials, practice activities, webinars, and familiarisation resources from an official IELTS test partner.',
        '<strong>IELTS.org sample questions:</strong> Official sample tasks and answer materials for Academic and General Training.',
        '<strong>IDP computer familiarisation:</strong> Official practice for learning the computer-delivered workflow before test day.',
      ],
      h2_3: 'Why You Need Feedback',
      p2: 'Reading and Listening practice can be checked against answer keys. Writing and Speaking require judgement against published criteria, so self-review alone can miss recurring problems. Use official descriptors, record your evidence, and seek calibrated feedback when possible.',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'Combine official practice with timed computer work and criteria-based feedback in our Oran lab.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Les Meilleures Ressources Gratuites pour l\'IELTS (Et Pourquoi les PDFs Cambridge ne Suffisent Pas)',
      lead: 'Les ouvrages Cambridge IELTS obtenus légalement peuvent fournir de bons exercices, mais le papier seul ne développe pas la navigation, la frappe, le surlignage et la gestion du temps nécessaires au test sur ordinateur en Algérie.',
      h2_1: 'Le Piège des Supports Papier',
      p1: 'À partir du 30 avril 2026, les tests IELTS du British Council en Algérie sont sur ordinateur. Le papier reste utile pour la langue et les types de questions, mais votre programme hebdomadaire doit aussi inclure des exercices chronométrés sur écran.',
      h2_2: 'Où Trouver une Pratique Numérique Authentique',
      bullets: [
        '<strong>British Council IELTS Ready :</strong> Ressources gratuites, activités, webinaires et outils de familiarisation proposés par un partenaire officiel IELTS.',
        '<strong>Questions d\'exemple sur IELTS.org :</strong> Exercices et corrigés officiels pour Academic et General Training.',
        '<strong>Familiarisation informatique IDP :</strong> Entraînement officiel au déroulement du test sur ordinateur.',
      ],
      h2_3: 'Pourquoi Vous Avez Besoin de Retours',
      p2: 'Les réponses de Reading et Listening se vérifient avec un corrigé. Writing et Speaking exigent un jugement selon les critères publiés ; l\'auto-évaluation peut donc manquer des erreurs récurrentes. Utilisez les descripteurs officiels et cherchez un retour calibré si possible.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Combinez les ressources officielles, la pratique chronométrée sur ordinateur et un retour fondé sur les critères dans notre laboratoire à Oran.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'أفضل موارد الايلتس المجانية (ولماذا ملفات PDF كامبريدج لا تكفي)',
      lead: 'يمكن أن توفر كتب Cambridge IELTS المرخصة تدريباً مفيداً، لكن التدريب الورقي وحده لا يطوّر مهارات التنقل والكتابة والتظليل وإدارة الوقت اللازمة للاختبار على الكمبيوتر في الجزائر.',
      h2_1: 'فخ الأوراق المطبوعة',
      p1: 'ابتداءً من 30 أبريل 2026، تُقدَّم اختبارات IELTS التابعة للمجلس الثقافي البريطاني في الجزائر على الكمبيوتر. يبقى الورق مفيداً لتطوير اللغة وفهم أنواع الأسئلة، لكن خطتك الأسبوعية يجب أن تشمل تدريباً موقوتاً على الشاشة.',
      h2_2: 'أين تجد تدريباً رقمياً أصيلاً',
      bullets: [
        '<strong>British Council IELTS Ready:</strong> مواد وأنشطة وندوات وموارد تعريفية مجانية من شريك رسمي لاختبار IELTS.',
        '<strong>نماذج IELTS.org:</strong> أسئلة وأجوبة رسمية للنوعين Academic وGeneral Training.',
        '<strong>تجربة IDP على الكمبيوتر:</strong> تدريب رسمي للتعرف على طريقة إجراء الاختبار الرقمي.',
      ],
      h2_3: 'لماذا تحتاج إلى تغذية راجعة',
      p2: 'يمكن تصحيح Reading وListening باستخدام مفاتيح الإجابة. أما Writing وSpeaking فيتطلبان حكماً وفق المعايير المنشورة، لذلك قد يفوتك الخطأ المتكرر عند التقييم الذاتي. استخدم الواصفات الرسمية واطلب ملاحظات معايرة عندما يكون ذلك ممكناً.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'اجمع بين الموارد الرسمية والتدريب الموقوت على الكمبيوتر والملاحظات المبنية على المعايير في مختبرنا بوهران.',
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
      summaryText: 'The standard Academic or General Training fee is currently <strong>40,000 DA</strong>. Book through the official <strong>British Council Algeria portal</strong> and complete payment within <strong>72 hours</strong>. The official page lists online bank-card payment, digital banking, bank transfer, and cash options.',
      intro: 'Registering for the IELTS in Algeria can seem daunting, but the British Council has streamlined the process significantly in recent years. Here is exactly what you need to know to secure your test date without issues.',
      h2_1: 'Step-by-Step Registration',
      steps: [
        { title: 'Create a British Council Account', desc: 'Go to the official British Council Algeria website. You will need to create a profile using exactly the same name and details that appear on your valid Passport or National ID card.' },
        { title: 'Choose the Test and Available Location', desc: 'Select <strong>Academic</strong> or <strong>General Training</strong>, then choose from the dates and locations currently shown in the official booking portal. From 30 April 2026, British Council IELTS tests in Algeria are delivered on computer.' },
        { title: 'Upload ID Document', desc: 'You must upload a clear, color scan of your ID. <strong>Crucial Rule:</strong> The ID you use to register is the exact same ID you must bring on the day of the test. If you register with your passport, do not bring your national ID card to the test center.' },
        { title: 'Pay Within 72 Hours', desc: 'Follow the payment instructions in your booking confirmation. The official Algeria page lists a valid bank card online, a digital banking platform or app, bank transfer, or cash. Send proof of payment when instructed; unpaid bookings can be cancelled after 72 hours.' },
      ],
      h2_2: 'What the Computer Test Changes',
      compIntro: 'British Council IELTS in Algeria is computer-delivered from 30 April 2026, with results typically available in <strong>one to two days</strong>. The test content and scoring stay the same, but the working method changes:',
      compBullets: [
        '<strong>Word Count:</strong> The screen automatically counts your words in the Writing section.',
        '<strong>Editing:</strong> You can copy, paste, and rewrite sentences instantly without messy erasers.',
        '<strong>Timers:</strong> A persistent on-screen clock flashes red when you are low on time.',
        '<strong>Screen workflow:</strong> Practise reading beside questions, highlighting, scrolling, and checking answers before test day.',
      ],
      ctaTitle: 'Prepare Before You Pay',
      ctaDesc: '40,000 DA is a significant investment. Do not book your test date until you are consistently hitting your target band scores in realistic, timed, computer-based practice sessions.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Comment s\'inscrire à l\'IELTS du British Council en Algérie',
      summaryTitle: 'Résumé :',
      summaryText: 'Les frais actuels pour Academic ou General Training sont de <strong>40 000 DA</strong>. Réservez sur le <strong>portail officiel du British Council Algérie</strong> et payez sous <strong>72 heures</strong>. La page officielle indique le paiement par carte bancaire en ligne, banque numérique, virement ou espèces.',
      intro: 'S\'inscrire à l\'IELTS en Algérie peut sembler intimidant, mais le British Council a simplifié le processus ces dernières années. Voici exactement ce que vous devez savoir.',
      h2_1: 'Inscription Étape par Étape',
      steps: [
        { title: 'Créer un compte British Council', desc: 'Rendez-vous sur le site officiel du British Council Algérie. Créez un profil avec exactement les mêmes nom et prénom que sur votre passeport ou carte nationale.' },
        { title: 'Choisir le test et le lieu disponible', desc: 'Sélectionnez <strong>Academic</strong> ou <strong>General Training</strong>, puis une date et un lieu proposés par le portail officiel. À partir du 30 avril 2026, les tests British Council IELTS en Algérie sont sur ordinateur.' },
        { title: 'Télécharger une pièce d\'identité', desc: 'Téléchargez un scan couleur clair de votre pièce d\'identité. <strong>Règle cruciale :</strong> La pièce utilisée à l\'inscription doit être la même apportée le jour de l\'examen.' },
        { title: 'Payer sous 72 heures', desc: 'Suivez les instructions de votre confirmation. La page officielle indique la carte bancaire en ligne, une plateforme ou application bancaire, le virement ou les espèces. Envoyez la preuve de paiement si demandé ; une réservation impayée peut être annulée après 72 heures.' },
      ],
      h2_2: 'Ce que Change le Test sur Ordinateur',
      compIntro: 'À partir du 30 avril 2026, le British Council propose l\'IELTS en Algérie sur ordinateur, avec des résultats généralement disponibles en <strong>un à deux jours</strong>. Le contenu et la notation restent identiques, mais la méthode de travail change :',
      compBullets: [
        '<strong>Comptage automatique :</strong> L\'écran compte automatiquement vos mots en Writing.',
        '<strong>Édition :</strong> Copiez, collez et reformulez instantanément sans ratures.',
        '<strong>Minuterie :</strong> Une horloge persistante clignote en rouge quand le temps est limité.',
        '<strong>Travail à l\'écran :</strong> Entraînez-vous à lire à côté des questions, surligner, faire défiler et vérifier vos réponses.',
      ],
      ctaTitle: 'Préparez-vous Avant de Payer',
      ctaDesc: '40 000 DA est un investissement important. Ne réservez pas votre date avant d\'atteindre régulièrement vos scores cibles lors de sessions réalistes sur ordinateur.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'كيفية التسجيل في اختبار الايلتس التابع للمجلس الثقافي البريطاني في الجزائر',
      summaryTitle: 'ملخص سريع:',
      summaryText: 'رسوم Academic أوGeneral Training حالياً <strong>40,000 دج</strong>. احجز عبر <strong>بوابة المجلس الثقافي البريطاني في الجزائر</strong> وأكمل الدفع خلال <strong>72 ساعة</strong>. تذكر الصفحة الرسمية الدفع بالبطاقة البنكية عبر الإنترنت أو الخدمات البنكية الرقمية أو التحويل أو النقد.',
      intro: 'قد يبدو التسجيل في اختبار الايلتس بالجزائر أمراً معقداً، لكن المجلس البريطاني بسّط العملية كثيراً في السنوات الأخيرة. إليك بالضبط ما تحتاج معرفته.',
      h2_1: 'التسجيل خطوة بخطوة',
      steps: [
        { title: 'إنشاء حساب في المجلس الثقافي البريطاني', desc: 'انتقل إلى الموقع الرسمي للمجلس الثقافي البريطاني - الجزائر. أنشئ ملفاً شخصياً بنفس الاسم والبيانات الواردة في جواز سفرك أو بطاقة هويتك الوطنية.' },
        { title: 'اختيار الاختبار والموقع المتاح', desc: 'اختر <strong>Academic</strong> أو <strong>General Training</strong>، ثم تاريخاً وموقعاً متاحين في بوابة الحجز الرسمية. ابتداءً من 30 أبريل 2026، تُقدَّم اختبارات British Council IELTS في الجزائر على الكمبيوتر.' },
        { title: 'رفع وثيقة الهوية', desc: 'ارفع نسخة ملونة واضحة من هويتك. <strong>قاعدة أساسية:</strong> الهوية المستخدمة في التسجيل هي نفسها التي يجب إحضارها يوم الاختبار.' },
        { title: 'الدفع خلال 72 ساعة', desc: 'اتبع تعليمات تأكيد الحجز. تذكر الصفحة الرسمية الدفع بالبطاقة البنكية عبر الإنترنت أو التطبيق البنكي أو التحويل أو النقد. أرسل إثبات الدفع عند الطلب؛ قد يُلغى الحجز غير المدفوع بعد 72 ساعة.' },
      ],
      h2_2: 'ما الذي يتغير في الاختبار على الكمبيوتر',
      compIntro: 'ابتداءً من 30 أبريل 2026، يُقدَّم British Council IELTS في الجزائر على الكمبيوتر، وتظهر النتائج عادة خلال <strong>يوم أو يومين</strong>. يبقى المحتوى والتقييم كما هما، لكن طريقة العمل تتغير:',
      compBullets: [
        '<strong>عداد الكلمات:</strong> الشاشة تحسب كلماتك تلقائياً في قسم الكتابة.',
        '<strong>التحرير:</strong> نسخ ولصق وإعادة صياغة فورية بلا طمس.',
        '<strong>المؤقتات:</strong> ساعة على الشاشة تومض بالأحمر عند اقتراب انتهاء الوقت.',
        '<strong>العمل على الشاشة:</strong> تدرّب على القراءة بجانب الأسئلة والتظليل والتمرير ومراجعة الإجابات.',
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
      title: 'IELTS for Canada Express Entry: Accepted Tests and CLB Scores',
      keyTakeawayTitle: 'Key Takeaway:',
      keyTakeawayText: 'For <strong>Express Entry</strong>, IRCC accepts CELPIP-General, IELTS General Training, or PTE Core in English, and TEF Canada or TCF Canada in French. TOEFL is not accepted for Express Entry, although an individual university may accept it for admission. Always check the institution separately.',
      intro: 'Choosing the right language test is the first major hurdle for Algerian candidates looking to immigrate to Canada via Express Entry or apply for a study permit. Wasting time and money (over 40,000 DA) on the wrong test can delay your application by months.',
      ctaTitle: 'Train Toward CLB 9',
      ctaDesc: 'If IELTS General Training matches your route, train every skill against the official score requirements in our computer-based lab in Oran.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'IELTS pour Entrée express Canada : tests acceptés et scores CLB',
      keyTakeawayTitle: 'Point Clé :',
      keyTakeawayText: 'Pour <strong>Entrée express</strong>, IRCC accepte CELPIP-General, IELTS General Training ou PTE Core en anglais, et TEF Canada ou TCF Canada en français. Le TOEFL n\'est pas accepté pour Entrée express, même si une université peut l\'accepter pour l\'admission. Vérifiez chaque établissement.',
      intro: 'Choisir le bon test de langue est le premier obstacle majeur pour les candidats algériens qui souhaitent immigrer au Canada via Entrée express ou obtenir un permis d\'études. Perdre du temps et de l\'argent (plus de 40 000 DA) sur le mauvais test peut retarder votre dossier de plusieurs mois.',
      ctaTitle: 'Préparez votre objectif CLB 9',
      ctaDesc: 'Si IELTS General Training correspond à votre parcours, entraînez chaque compétence selon les seuils officiels dans notre laboratoire informatique à Oran.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'IELTS للهجرة إلى كندا: الاختبارات المقبولة ودرجات CLB',
      keyTakeawayTitle: 'الخلاصة الجوهرية:',
      keyTakeawayText: 'بالنسبة إلى <strong>Express Entry</strong>، تقبل IRCC اختبارات CELPIP-General أوIELTS General Training أوPTE Core للإنجليزية، وTEF Canada أوTCF Canada للفرنسية. لا يُقبل TOEFL في Express Entry، لكن قد تقبله جامعة معينة للقبول. تحقق من كل مؤسسة بشكل منفصل.',
      intro: 'اختيار الاختبار اللغوي الصحيح هو أول عقبة رئيسية للمرشحين الجزائريين الراغبين في الهجرة إلى كندا. إهدار الوقت والمال (أكثر من 40,000 دج) على الاختبار الخاطئ قد يؤخر ملفك بأشهر.',
      ctaTitle: 'تدرّب لهدف CLB 9',
      ctaDesc: 'إذا كان IELTS General Training مناسباً لمسارك، فتدرّب على كل مهارة وفق الحدود الرسمية في مختبرنا على الكمبيوتر بوهران.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getTlscontactContent(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'UK & France Student Visas: When Do You Need IELTS for UKVI?',
      warningTitle: 'Check Before You Book:',
      warningText: 'A UK <strong>Student visa</strong> does not automatically require IELTS for UKVI. Your sponsor and course level determine how English can be proven. If your route specifically requires a Secure English Language Test, use an approved SELT such as <strong>IELTS for UKVI</strong>. Check your CAS and official GOV.UK guidance before paying.',
      ctaTitle: 'Don\'t Miss Your Intake Deadline',
      ctaDesc: 'Confirm the exact evidence your institution and visa route require, then prepare for the correct IELTS test without relying on assumptions.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Visas Étudiants UK & France : Quand Faut-il IELTS for UKVI ?',
      warningTitle: 'Vérifiez Avant de Réserver :',
      warningText: 'Un <strong>Student visa</strong> britannique n\'exige pas automatiquement IELTS for UKVI. La façon de prouver l\'anglais dépend du sponsor et du niveau d\'études. Si votre parcours exige spécifiquement un Secure English Language Test, utilisez un SELT approuvé comme <strong>IELTS for UKVI</strong>. Vérifiez votre CAS et GOV.UK avant de payer.',
      ctaTitle: 'Ne Ratez Pas Votre Date d\'Inscription',
      ctaDesc: 'Confirmez les preuves exactes exigées par votre établissement et votre parcours de visa, puis préparez le bon test IELTS.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'تأشيرات الدراسة لبريطانيا وفرنسا: متى تحتاج IELTS for UKVI؟',
      warningTitle: 'تحقق قبل الحجز:',
      warningText: 'لا تشترط <strong>تأشيرة Student البريطانية</strong> تلقائياً اختبار IELTS for UKVI. تحدد الجهة الراعية ومستوى الدراسة طرق إثبات الإنجليزية. إذا كان مسارك يشترط Secure English Language Test، استخدم اختبار SELT معتمداً مثل <strong>IELTS for UKVI</strong>. تحقق من CAS وإرشادات GOV.UK الرسمية قبل الدفع.',
      ctaTitle: 'لا تفوّت موعد تسجيلك',
      ctaDesc: 'تأكد من الوثيقة التي تشترطها مؤسستك ومسار التأشيرة، ثم استعد لاختبار IELTS الصحيح دون افتراضات.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getWritingTask2Content(locale: ArticleLocale) {
  const content = {
    en: {
      title: 'How to Crack IELTS Writing Task 2 (From a Band 8.0 Scorer)',
      lead: 'Strong English alone does not guarantee a strong Writing Task 2 score. You must answer the exact prompt, organise ideas clearly, and demonstrate language control under time pressure.',
      ctaTitle: 'Stop Training on Paper',
      ctaDesc: 'Build a repeatable planning method and receive criteria-based feedback in our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Comment Réussir l\'IELTS Writing Task 2 (Par un Scorer 8.0)',
      lead: 'Un bon niveau d\'anglais ne garantit pas un bon score en Writing Task 2. Il faut répondre précisément à la consigne, organiser les idées et contrôler la langue sous pression.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Construisez une méthode de planification répétable et recevez un retour fondé sur les critères dans notre formation sur ordinateur.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'كيف تتقن كتابة المهمة الثانية في الايلتس (من حاصل على 8.0)',
      lead: 'لا يضمن مستوى الإنجليزية القوي درجة عالية في Writing Task 2. يجب أن تجيب عن المطلوب بدقة وتنظم الأفكار وتتحكم في اللغة تحت ضغط الوقت.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'ابنِ طريقة تخطيط قابلة للتكرار واحصل على ملاحظات مبنية على المعايير في تدريبنا على الكمبيوتر.',
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
      ctaDesc: 'Practise under realistic timing and receive criteria-based feedback in our computer-based intensive training.',
      ctaBtn: 'Book a Seat',
    },
    fr: {
      title: 'Surmonter l\'Anxiété à l\'IELTS Speaking : Guide pour les Candidats Algériens',
      lead: 'Le test Speaking de l\'IELTS est une expérience intimidante. Être face à face avec un examinateur peut provoquer une anxiété qui ruine même la performance d\'un locuteur fluent.',
      ctaTitle: 'Arrêtez de vous Entraîner sur Papier',
      ctaDesc: 'Entraînez-vous avec un chronométrage réaliste et recevez un retour fondé sur les critères.',
      ctaBtn: 'Réserver une Place',
    },
    ar: {
      title: 'التغلب على القلق في محادثة الايلتس: دليل للمرشحين الجزائريين',
      lead: 'اختبار المحادثة في الايلتس تجربة مرهبة. الجلوس وجهاً لوجه أمام محكم قد يسبب قلقاً يدمر أداء حتى المتحدثين الطلاقة.',
      ctaTitle: 'توقف عن التدريب على الورق',
      ctaDesc: 'تدرّب بتوقيت واقعي واحصل على ملاحظات مبنية على المعايير في تدريبنا على الكمبيوتر.',
      ctaBtn: 'احجز مقعداً',
    },
  };
  return content[locale] || content.en;
}

export function getArticlesListContent(locale: ArticleLocale) {
  const content = {
    en: {
      pageTitle: 'IELTS Algeria Guides',
      pageSubtitle: 'Fact-checked IELTS registration, test-choice, visa, immigration, and preparation guides for candidates in Oran and across Algeria.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'Student Visas', title: 'UK & France Student Visas: When Do You Need IELTS for UKVI?', desc: 'A verified decision guide to UK English evidence and France application processing from Algeria.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'Immigration', title: 'IELTS for Canada Express Entry: Tests and CLB', desc: 'Check IRCC-accepted tests, understand the less familiar alternatives, and convert IELTS General scores to CLB.' },
        { href: '/articles/how-to-register-algeria', category: 'Logistics', title: 'How to Register for IELTS in Algeria (2026)', desc: 'Current fee, ID rules, payment methods, 72-hour deadline, and computer-delivery information.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'Test Format', title: 'The Official Switch to Computer-Based IELTS (2026)', desc: 'Understand the crucial differences between taking the IELTS on a computer versus on paper, and the new 2026 official transition.' },
        { href: '/articles/academic-vs-general', category: 'Test Format', title: 'IELTS Academic vs. General Training', desc: 'Learn the differences between IELTS Academic and General Training to choose the right test for your university or immigration goals.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'Preparation', title: 'Free IELTS Resources in Algeria', desc: 'Discover the best free IELTS practice tests and resources available to candidates in Algeria, and learn why Cambridge PDFs aren\'t enough.' },
        { href: '/articles/writing-task-2-tactics', category: 'Writing Section', title: 'IELTS Writing Task 2: A Reliable Planning Method', desc: 'Plan and check Task 2 against the official criteria without relying on band-guarantee templates.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'Speaking Section', title: 'Overcoming IELTS Speaking Anxiety', desc: 'A tactical guide for Algerian candidates to overcome nervousness and perform confidently in the IELTS Speaking test.' },
      ],
    },
    fr: {
      pageTitle: 'Guides IELTS Algérie',
      pageSubtitle: 'Guides vérifiés sur l’inscription, le choix du test, les visas, l’immigration et la préparation à Oran et en Algérie.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'Visas Étudiants', title: 'Visas UK & France : Quand Faut-il IELTS for UKVI ?', desc: 'Guide vérifié sur la preuve d’anglais au Royaume-Uni et le traitement des demandes France depuis l’Algérie.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'Immigration', title: 'IELTS pour Entrée express Canada : tests et CLB', desc: 'Vérifiez les tests acceptés par IRCC, découvrez les alternatives et convertissez IELTS General en CLB.' },
        { href: '/articles/how-to-register-algeria', category: 'Logistique', title: 'Comment s’inscrire à l’IELTS en Algérie (2026)', desc: 'Frais, identité, moyens de paiement, délai de 72 heures et passage sur ordinateur.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'Format du Test', title: 'Le Passage Officiel à l\'IELTS sur Ordinateur (2026)', desc: 'Comprenez les différences cruciales entre l\'IELTS sur ordinateur et sur papier, et la nouvelle transition officielle de 2026.' },
        { href: '/articles/academic-vs-general', category: 'Format du Test', title: 'IELTS Academic vs. General Training', desc: 'Apprenez les différences entre l\'IELTS Academic et le General Training pour choisir le bon test.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'Préparation', title: 'Ressources IELTS Gratuites en Algérie', desc: 'Découvrez les meilleures ressources gratuites disponibles en Algérie, et pourquoi les PDFs Cambridge ne suffisent pas.' },
        { href: '/articles/writing-task-2-tactics', category: 'Section Écriture', title: 'IELTS Writing Task 2 : Méthode de Planification', desc: 'Planifiez selon les critères officiels sans dépendre de modèles qui promettent une bande.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'Section Orale', title: 'Surmonter l\'Anxiété au Speaking IELTS', desc: 'Un guide tactique pour les candidats algériens afin de surmonter le stress et performer avec confiance.' },
      ],
    },
    ar: {
      pageTitle: 'أدلة IELTS في الجزائر',
      pageSubtitle: 'أدلة موثقة للتسجيل واختيار الاختبار والتأشيرات والهجرة والتحضير في وهران والجزائر.',
      articles: [
        { href: '/articles/tlscontact-capago', category: 'تأشيرات الطلاب', title: 'تأشيرات بريطانيا وفرنسا: متى تحتاج IELTS for UKVI؟', desc: 'دليل موثق لإثبات الإنجليزية في بريطانيا وإجراءات طلب فرنسا من الجزائر.' },
        { href: '/articles/ielts-vs-toefl-canada', category: 'الهجرة', title: 'IELTS للهجرة إلى كندا: الاختبارات وCLB', desc: 'تحقق من اختبارات IRCC المقبولة وتعرّف على البدائل وحوّل درجات IELTS General إلى CLB.' },
        { href: '/articles/how-to-register-algeria', category: 'اللوجستيات', title: 'كيفية التسجيل في IELTS بالجزائر (2026)', desc: 'الرسوم والهوية وطرق الدفع ومهلة 72 ساعة والاختبار على الكمبيوتر.' },
        { href: '/articles/computer-vs-paper-ielts', category: 'صيغة الاختبار', title: 'التحول الرسمي للايلتس على الكمبيوتر (2026)', desc: 'افهم الفروق الجوهرية بين الاختبار على الكمبيوتر والورق والتحول الرسمي لعام 2026.' },
        { href: '/articles/academic-vs-general', category: 'صيغة الاختبار', title: 'الايلتس الأكاديمي مقابل التدريب العام', desc: 'تعلّم الفروق بين الإصدارين لاختيار الاختبار المناسب لأهدافك.' },
        { href: '/articles/free-ielts-resources-algeria', category: 'التحضير', title: 'موارد الايلتس المجانية في الجزائر', desc: 'اكتشف أفضل موارد الممارسة المجانية المتاحة في الجزائر.' },
        { href: '/articles/writing-task-2-tactics', category: 'قسم الكتابة', title: 'IELTS Writing Task 2: طريقة تخطيط موثوقة', desc: 'خطط وفق المعايير الرسمية دون الاعتماد على قوالب تعدك بدرجة محددة.' },
        { href: '/articles/overcoming-speaking-anxiety', category: 'قسم المحادثة', title: 'التغلب على قلق محادثة الايلتس', desc: 'دليل تكتيكي للمرشحين الجزائريين للتغلب على التوتر والأداء بثقة في اختبار المحادثة.' },
      ],
    },
  };
  return content[locale] || content.en;
}
