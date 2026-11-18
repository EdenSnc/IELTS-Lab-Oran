import { getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import { getFoundingCohortStatus } from '@/lib/cohort';
import {
  COHORT_APPLICATION_DEADLINE,
  COHORT_ARTICLE_PATH,
  COHORT_DEADLINE_ISO,
  COHORT_FORM_URL,
  cohortLaunch,
  isCohortDeadlinePassed,
} from '@/lib/cohort-launch';
import {
  COURSE_PRICE_DZD,
  NEXT_COHORT_PRICE_DZD,
  SITE_NAME,
  SITE_URL,
  buildArticleMetadata,
  localizedUrl,
  type Locale,
} from '@/lib/seo';

const COHORT_PAGE_BODY: Record<
  Locale,
  {
    summaryTitle: string;
    summaryText: string;
    factsHeading: string;
    facts: Array<[string, string]>;
    whyTitle: string;
    whyParagraphs: string[];
    syllabusTitle: string;
    weeks: Array<{ week: string; title: string; body: string }>;
    pricingTitle: string;
    pricingHeaders: [string, string, string, string];
    pricingRows: Array<[string, string, string, string]>;
    logisticsTitle: string;
    logisticsParagraphs: string[];
    rulesTitle: string;
    rulesBullets: string[];
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
    homeCta: string;
    mockCta: string;
  }
> = {
  en: {
    summaryTitle: 'Quick Answer — First Oran IELTS Cohort (2026)',
    summaryText:
      'IELTS Lab Oran’s first in-person preparation cohort in Bir El Djir, Oran (31130) is an intensive ~4-week small-group course strictly capped at 8 seats and priced at 5,000 DA (introductory classroom edition; regular PC-lab rate from Cohort 2 is 29,500 DA). Applications close on 20 November 2026, and applying is free without locking a seat.',
    factsHeading: 'Cohort 1 Key Facts — Bir El Djir, Oran',
    facts: [
      ['Location', 'Bir El Djir, Oran 31130, Algeria'],
      ['Class Size', 'Strictly 8 participants maximum'],
      ['Duration & Skills', '~4 weeks (Listening, Reading, Writing & Speaking)'],
      ['Minimum Entry Level', 'Intermediate English (CEFR B1 / B2+) — not for beginners'],
      ['Introductory Cohort 1 Fee', '5,000 DA (Classroom Edition · Regular from Cohort 2: 29,500 DA)'],
      ['Payment Options', 'Cash or Baridimob (only after timetable confirmation)'],
    ],
    whyTitle: 'Why We Built an 8-Seat Intensive Cohort in Oran',
    whyParagraphs: [
      'Since 30 April 2026, British Council Algeria delivers IELTS exclusively on computer—including official Oran sittings at Imtiyaz El Djazair (Hai Ibn Sina)—at a standard registration fee of 40,000 DA. Walking into a 40,000 DA computer exam after studying only general grammar in a 25-student classroom is one of the costliest mistakes Algerian candidates make.',
      'Led by founder Amine Senouci (Official IELTS Overall Band 8.0, Listening 9.0, TEFL certified), IELTS Lab Oran caps every cohort at 8 seats so every participant receives direct, criteria-calibrated feedback on Writing Task 1, Writing Task 2, and live Speaking Parts 1–3. For this introductory Cohort 1 (5,000 DA), sessions run in a focused traditional classroom setting in Bir El Djir while pairing homework and timed diagnostics with our online computer simulation tools.',
    ],
    syllabusTitle: '4-Week Curriculum & Diagnostic Progression',
    weeks: [
      {
        week: 'Week 1',
        title: 'Baseline Diagnostic, Listening & Screen Reading',
        body: 'Establish your starting band profile across all four modules. Master Reading question families (True/False/Not Given, Matching Headings, Summary Completion), skimming vs scanning pacing, and Listening distractor traps.',
      },
      {
        week: 'Week 2',
        title: 'Writing Task 2 Argument Architecture & Band Criteria',
        body: 'Break down Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range. Replace memorized essay templates with a repeatable 40-minute planning and self-editing workflow, with line-by-line instructor marking.',
      },
      {
        week: 'Week 3',
        title: 'Writing Task 1 & Speaking Parts 1–3 Under Time Pressure',
        body: 'Practise Academic data overviews (charts, processes, comparisons) or General Training tone control alongside timed 1-minute Speaking Part 2 topic maps and Part 3 analytical follow-ups.',
      },
      {
        week: 'Week 4',
        title: 'Timed Full-Section Drills, Error Logs & Exam-Day Readiness',
        body: 'Consolidate weak sub-skills, review recurring grammar and lexical slips, calibrate target band readiness (whether aiming for Band 6.5 university entry or CLB 9 Express Entry), and finalize your official booking checklist.',
      },
    ],
    pricingTitle: 'Transparent DZD Pricing Comparison',
    pricingHeaders: ['Option', 'Format', 'Price (DZD)', 'Best For'],
    pricingRows: [
      ['Cohort 1 (Founding Launch)', 'In-person 8-seat classroom · Bir El Djir', '5,000 DA', 'Oran candidates applying before 20 Nov 2026'],
      ['Standard Cohort (Cohort 2+)', 'In-person 8-seat PC lab · Bir El Djir', '29,500 DA', 'Full computer-workstation small-group training'],
      ['Online Academic Mock Test', 'Web simulator (L + R + W · 30d results)', '3,900 DA', 'Candidates across Algeria via Chargily Pay (CIB/Edahabia)'],
      ['Official IELTS Exam (BC Algeria)', 'Official test centre (Oran / Algiers)', '40,000 DA', 'Official certification once mock scores hit target'],
    ],
    logisticsTitle: 'Bir El Djir Location & Western Algeria Access',
    logisticsParagraphs: [
      'Classes take place in Bir El Djir (31130), on Oran’s eastern university and residential corridor—conveniently reachable from USTO, Akid Lotfi, Canastel, Millenium, Hai Yasmine, Sidi Chahmi, and Es-Senia, as well as weekend commuters from Tlemcen, Mostaganem, Sidi Bel Abbès, Mascara, and Aïn Témouchent.',
      'Instead of imposing a rigid timetable before knowing applicants’ university or work commitments, we collect weekly availability through the application form, group compatible B1/B2+ candidates, and confirm exact session days and hours via WhatsApp before any payment is requested.',
    ],
    rulesTitle: 'How Application, Selection & Enrolment Work',
    rulesBullets: [
      'Submitting the availability or intake form is 100% free and does not automatically reserve a seat.',
      'Applicants should hold at least an intermediate English foundation (CEFR B1/B2); complete beginners (A1/A2) are advised to build core English before exam prep.',
      'Once the timetable is proposed via WhatsApp, seats are confirmed in order of enrolment completion (Cash or Baridimob).',
      'If Cohort 1 is full or past the 20 November 2026 deadline, applicants receive priority notification when Cohort 2 opens.',
    ],
    faqTitle: 'Frequently Asked Questions — Oran IELTS Cohort',
    faqs: [
      {
        q: 'What does the 5,000 DA first-cohort fee include?',
        a: 'It covers approximately one month of in-person 8-seat IELTS preparation in Bir El Djir, Oran, spanning Listening, Reading, Writing, and Speaking in a traditional classroom setting for Cohort 1, with individual Writing and Speaking feedback from Amine Senouci.',
      },
      {
        q: 'Why is Cohort 1 priced at 5,000 DA instead of 29,500 DA?',
        a: '5,000 DA is a one-time founding rate for our introductory classroom cohort in Bir El Djir while we finalize scheduling and local student case studies. Subsequent PC-lab cohorts return to the regular 29,500 DA tuition.',
      },
      {
        q: 'Does submitting the online form reserve my seat?',
        a: 'No. Applying is free and carries zero obligation. We review your current level and weekly availability first, then share the confirmed schedule so you can decide whether to enrol.',
      },
      {
        q: 'Can both IELTS Academic and General Training candidates join?',
        a: 'Yes. Listening and Speaking are identical across both versions, Task 2 essay fundamentals overlap closely, and Reading / Writing Task 1 tasks are differentiated according to whether you need Academic (study/visas) or General Training (Canada Express Entry).',
      },
      {
        q: 'What if I live outside Oran or cannot attend in person?',
        a: 'Candidates anywhere in Algeria can practise immediately using our free 5-question Reading sample (/sample) or full online IELTS Academic Mock Test (3,900 DZD via Chargily Pay), or message on WhatsApp for private 1-on-1 options.',
      },
    ],
    homeCta: 'Apply on Homepage Intake',
    mockCta: 'Explore Online Mock Test (3,900 DA)',
  },
  fr: {
    summaryTitle: 'Réponse rapide — 1re Cohorte IELTS à Oran (2026)',
    summaryText:
      'Le premier groupe présentiel d’IELTS Lab Oran à Bir El Djir, Oran (31130) est une formation intensive d’environ 4 semaines strictement limitée à 8 places au tarif exceptionnel de lancement de 5 000 DA (édition en salle de cours ; tarif standard des prochaines cohortes : 29 500 DA). Candidatures gratuites jusqu’au 20 novembre 2026.',
    factsHeading: 'Repères clés — Cohorte 1 (Bir El Djir, Oran)',
    facts: [
      ['Localisation', 'Bir El Djir, Oran 31130, Algérie'],
      ['Effectif maximum', 'Strictement 8 participants par groupe'],
      ['Durée & Compétences', 'Environ 4 semaines (Listening, Reading, Writing & Speaking)'],
      ['Niveau minimum requis', 'Anglais intermédiaire (CECR B1 / B2+) — non-débutants'],
      ['Tarif exceptionnel Cohorte 1', '5 000 DA (édition en salle · Tarif normal dès Cohorte 2 : 29 500 DA)'],
      ['Modes de règlement', 'Espèces ou Baridimob (uniquement après confirmation des horaires)'],
    ],
    whyTitle: 'Pourquoi un groupe limité à 8 places à Oran ?',
    whyParagraphs: [
      'Depuis le 30 avril 2026, le British Council Algérie organise l’examen IELTS exclusivement sur ordinateur — y compris à Oran au centre partenaire Imtiyaz El Djazair (Hai Ibn Sina) — au tarif officiel de 40 000 DA. Se présenter à un examen numérique de 40 000 DA après des cours génériques en classe de 25 élèves est l’erreur la plus coûteuse.',
      'Encadré par Amine Senouci (score officiel IELTS Band 8.0 global, 9.0 en Listening, certifié TEFL), chaque groupe d’IELTS Lab Oran est plafonné à 8 places afin de garantir des corrections écrites ligne par ligne et des simulations orales individuelles. Pour cette première cohorte de lancement à 5 000 DA, les séances se déroulent en salle de cours traditionnelle à Bir El Djir tout en intégrant nos outils numériques d’entraînement.',
    ],
    syllabusTitle: 'Programme structuré sur 4 semaines',
    weeks: [
      {
        week: 'Semaine 1',
        title: 'Diagnostic initial, Listening & stratégies Reading',
        body: 'Évaluation de départ sur les 4 compétences. Maîtrise des types de questions Reading (True/False/Not Given, Matching Headings), gestion du chronomètre et pièges courants en Listening.',
      },
      {
        week: 'Semaine 2',
        title: 'Architecture Writing Task 2 & critères officiels',
        body: 'Travail approfondi sur Task Response, Coherence & Cohesion, Lexical Resource et grammaire. Méthode de planification en 40 minutes sans modèles appris par cœur, avec corrections détaillées.',
      },
      {
        week: 'Semaine 3',
        title: 'Writing Task 1 & simulations Speaking Parties 1 à 3',
        body: 'Synthèse de graphiques/processus (Academic) ou lettres structurées (General Training), prise de notes en 1 minute pour la Partie 2 orale et argumentation en Partie 3.',
      },
      {
        week: 'Semaine 4',
        title: 'Entraînements chronométrés, bilan d’erreurs & préparation Jour J',
        body: 'Consolidation des points faibles individuels, calibration finale selon votre objectif (visa étudiant B2/6.5 ou CLB 9 Entrée express) et vérification des démarches d’inscription officielle.',
      },
    ],
    pricingTitle: 'Comparatif transparent des tarifs en dinars (DZD)',
    pricingHeaders: ['Formule', 'Format', 'Tarif (DZD)', 'Public visé'],
    pricingRows: [
      ['Cohorte 1 (Lancement)', 'Présentiel 8 places en salle · Bir El Djir', '5 000 DA', 'Candidats d’Oran postulant avant le 20 nov. 2026'],
      ['Cohorte Standard (Cohorte 2+)', 'Présentiel 8 places sur PC · Bir El Djir', '29 500 DA', 'Formation complète sur postes informatiques'],
      ['Test blanc Academic en ligne', 'Simulateur web (L + R + W · accès 30 j)', '3 900 DA', 'Toute l’Algérie via Chargily Pay (CIB / Edahabia)'],
      ['Examen officiel (BC Algérie)', 'Centre officiel (Oran / Alger)', '40 000 DA', 'Certification officielle une fois le niveau atteint'],
    ],
    logisticsTitle: 'Accès à Bir El Djir & bassin de l’Ouest algérien',
    logisticsParagraphs: [
      'Les séances ont lieu à Bir El Djir (31130), pôle universitaire et résidentiel à l’est d’Oran, facilement accessible depuis l’USTO, Akid Lotfi, Canastel, Millenium, Hai Yasmine, Sidi Chahmi et Es-Senia, ainsi que pour les candidats de Tlemcen, Mostaganem, Sidi Bel Abbès, Mascara et Aïn Témouchent.',
      'Afin de construire un emploi du temps réaliste pour les étudiants et salariés, nous recueillons d’abord vos créneaux de disponibilité hebdomadaire, puis nous confirmons le planning exact sur WhatsApp avant tout règlement.',
    ],
    rulesTitle: 'Modalités de candidature et d’inscription',
    rulesBullets: [
      'L’envoi du formulaire de disponibilités ou de candidature est 100 % gratuit et ne réserve pas automatiquement une place.',
      'Un niveau intermédiaire minimum (CECR B1/B2) est requis ; ce programme intensif ne remplace pas des cours d’anglais débutant (A1/A2).',
      'Une fois l’emploi du temps validé avec vous sur WhatsApp, l’inscription définitive s’effectue par espèces ou Baridimob dans la limite des 8 places.',
      'Après la clôture du 20 novembre 2026 (ou si les 8 places sont complètes), votre dossier est prioritaire pour l’ouverture de la Cohorte 2.',
    ],
    faqTitle: 'Questions fréquentes — Cohorte IELTS à Oran',
    faqs: [
      {
        q: 'Que comprend exactement le tarif de lancement de 5 000 DA ?',
        a: 'Il couvre environ un mois de préparation en présentiel à Bir El Djir (Oran) en groupe limité à 8 personnes (édition en salle de cours pour ce 1er groupe), couvrant les 4 épreuves avec corrections individuelles en Writing et Speaking par Amine Senouci.',
      },
      {
        q: 'Pourquoi le 1er groupe coûte-t-il 5 000 DA au lieu de 29 500 DA ?',
        a: 'Il s’agit d’un tarif exceptionnel réservé à la toute première cohorte en salle à Oran. Les cohortes suivantes sur postes PC reviendront au tarif normal de 29 500 DA.',
      },
      {
        q: 'Le formulaire en ligne engage-t-il un paiement ?',
        a: 'Non. Postuler est entièrement gratuit et sans engagement. Vous ne réglez les frais qu’après avoir reçu et accepté le planning confirmé.',
      },
      {
        q: 'Puis-je rejoindre le groupe pour l’IELTS Academic comme pour le General Training ?',
        a: 'Oui. Le Listening, le Speaking et la méthodologie Writing Task 2 sont communs, et les exercices Reading et Task 1 sont adaptés selon votre objectif (études/visas ou Entrée express Canada).',
      },
      {
        q: 'Comment s’entraîner si j’habite hors d’Oran ?',
        a: 'Vous pouvez tester gratuitement notre échantillon Reading sur /sample ou passer le test blanc IELTS Academic complet en ligne (3 900 DZD via Chargily Pay CIB/Edahabia).',
      },
    ],
    homeCta: 'Postuler depuis la page d’accueil',
    mockCta: 'Voir le test blanc en ligne (3 900 DA)',
  },
  ar: {
    summaryTitle: 'إجابة سريعة — المجموعة الأولى لتحضير IELTS في وهران (2026)',
    summaryText:
      'تُطلق IELTS Lab Oran أول دورة تحضيرية حضورية في بئر الجير، وهران (31130) ضمن مجموعة مصغرة لا تتجاوز 8 مقاعد ولمدة تقارب 4 أسابيع، بسعر إطلاق استثنائي قدره 5,000 دج (نسخة قاعة التدريس للمجموعة الأولى؛ السعر العادي بدءاً من الدفعة الثانية 29,500 دج). يُغلق التقديم في 20 نوفمبر 2026 والتقديم مجاني.',
    factsHeading: 'أهم تفاصيل المجموعة الأولى — بئر الجير، وهران',
    facts: [
      ['الموقع الجغرافي', 'بئر الجير، وهران 31130، الجزائر'],
      ['عدد المقاعد', '8 مشاركين كحد أقصى لضمان المتابعة الفردية'],
      ['المدة والمهارات', 'نحو 4 أسابيع (الاستماع، القراءة، الكتابة، والمحادثة)'],
      ['المستوى الأدنى للقبول', 'مستوى متوسط B1 / B2 فما فوق (غير مخصصة للمبتدئين)'],
      ['رسوم المجموعة الأولى', '5,000 دج (دورة صفية تمهيدية · السعر العادي لاحقاً: 29,500 دج)'],
      ['طرق الدفع المتاحة', 'نقداً أو عبر Baridimob (فقط بعد تأكيد الجدول الزمني)'],
    ],
    whyTitle: 'لماذا صممنا دورة من 8 مقاعد فقط في وهران؟',
    whyParagraphs: [
      'ابتداءً من 30 أبريل 2026، أصبحت امتحانات IELTS التابعة للمجلس الثقافي البريطاني في الجزائر تُجرى حصرياً على الكمبيوتر — بما في ذلك جلسات وهران بمركز امتياز الجزائر في حي ابن سينا — برسوم تسجيل تبلغ 40,000 دج. دخول اختبار رقمي بهذه التكلفة بعد دروس عامة في أقسام تضم 25 طالباً يُعرّض المترشح لخسارة الوقت والمال.',
      'تحت إشراف المؤسس أمين سنوسي (الحاصل على Band 8.0 رسمية و9.0 كاملة في الاستماع، ومدرب معتمد TEFL)، نحدد سقف كل دفعة بـ 8 مقاعد فقط لضمان تصحيح مقالات الكتابة سطراً بسطر وتقييم المحادثة فردياً وفق معايير المصححين. تُقدَّم هذه الدفعة الأولى (5,000 دج) في قاعة تدريس تقليدية هادئة ببئر الجير مع ربط التدريب المنزلي بأدوات المحاكاة الرقمية.',
    ],
    syllabusTitle: 'البرنامج التدريبي المقترح على مدار 4 أسابيع',
    weeks: [
      {
        week: 'الأسبوع 1',
        title: 'التشخيص الأولي واستراتيجيات الاستماع والقراءة',
        body: 'تحديد نقاط القوة والضعف في المهارات الأربع، والتدرب على أنماط أسئلة القراءة (True/False/Not Given وMatching Headings) وإدارة الوقت وتجنب المشتتات الصوتية.',
      },
      {
        week: 'الأسبوع 2',
        title: 'بناء مقال Writing Task 2 ومعايير التصحيح الأربعة',
        body: 'فهم معايير Task Response والترابط والمفردات والقواعد عملياً، وبناء خطة كتابة ومراجعة خلال 40 دقيقة دون قوالب محفوظة، مع تصحيح فردي مفصل.',
      },
      {
        week: 'الأسبوع 3',
        title: 'المهمة الأولى للكتابة ومقابلات المحادثة (الأجزاء 1–3)',
        body: 'التدرب على وصف الرسوم البيانية (Academic) أو الرسائل الرسمية (General Training)، واستغلال دقيقة التحضير في الجزء الثاني من المحادثة ومناقشة الأسئلة التحليلية.',
      },
      {
        week: 'الأسبوع 4',
        title: 'تدريبات موقوتة شاملة ومعالجة الأخطاء المتكررة',
        body: 'مراجعة سجل الأخطاء الفردية لكل متدرب، قياس الجاهزية للدرجة المستهدفة (سواء للقبول الجامعي أو CLB 9 للهجرة إلى كندا)، وتأكيد إجراءات حجز الامتحان الرسمي.',
      },
    ],
    pricingTitle: 'مقارنة شفافة للأسعار بالدينار الجزائري',
    pricingHeaders: ['الخيار', 'الصيغة', 'السعر (دج)', 'الفئة المناسبة'],
    pricingRows: [
      ['المجموعة الأولى (إطلاق)', 'حضوري 8 مقاعد في القسم · بئر الجير', '5,000 دج', 'مرشحو وهران المتقدمون قبل 20 نوفمبر 2026'],
      ['الدورة القياسية (الدفعة 2+)', 'حضوري 8 مقاعد في قاعة PC · بئر الجير', '29,500 دج', 'تدريب حضوري متكامل على أجهزة الكمبيوتر'],
      ['الاختبار التجريبي عبر الإنترنت', 'محاكاة ويب (استماع+قراءة+كتابة · 30 يوماً)', '3,900 دج', 'لجميع الولايات عبر Chargily Pay (الذهبية/CIB)'],
      ['الامتحان الرسمي (المجلس البريطاني)', 'مركز معتمد (وهران / الجزائر العاصمة)', '40,000 دج', 'للحصول على الشهادة الرسمية بعد الجاهزية'],
    ],
    logisticsTitle: 'موقع بئر الجير وسهولة الوصول في وهران والغرب الجزائري',
    logisticsParagraphs: [
      'تُقام الحصص في بلدية بئر الجير (31130) شرق مدينة وهران، بموقع قريب من القطب الجامعي إيسطو (USTO) وأحياء عقيد لطفي وكانستال وميلينيوم والياسمين وسيدي الشحمي والسانية، ومناسب أيضاً للمترشحين القادمين من تلمسان ومستغانم وسيدي بلعباس ومعسكر وعين تموشنت.',
      'بدلاً من فرض توقيت جامد مسبقاً، نجمع أوقات التفرغ الأسبوعية للمتقدمين عبر الاستمارة لتنسيق جدول متوافق للطلبة والموظفين، ثم نرسله عبر واتساب قبل طلب أي دفع.',
    ],
    rulesTitle: 'ضوابط التقديم والقبول والتسجيل النهائي',
    rulesBullets: [
      'إرسال استمارة التفرغ أو طلب الالتحاق مجاني تماماً ولا يحجز مقعداً بشكل تلقائي.',
      'تستهدف الدورة المترشحين ذوي المستوى المتوسط فما فوق (B1/B2)؛ ولا تغني عن تأسيس اللغة للمبتدئين (A1/A2).',
      'بعد مشاركة الجدول المؤكد عبر واتساب، يُثبّت المقعد عند إتمام التسجيل (نقداً أو عبر Baridimob) ضمن حدود المقاعد الثمانية.',
      'بعد انتهاء مهلة 20 نوفمبر 2026 أو اكتمال العدد، يحصل المتقدمون على أولوية الإشعار فور فتح الدفعة الثانية.',
    ],
    faqTitle: 'الأسئلة الشائعة حول دورة وهران الحضورية',
    faqs: [
      {
        q: 'ماذا يشمل سعر إطلاق المجموعة الأولى البالغ 5,000 دج؟',
        a: 'يشمل نحو شهر من التحضير الحضوري في بئر الجير، وهران ضمن مجموعة لا تتعدى 8 متدربين في قاعة تدريس تقليدية لهذه الدفعة الأولى، ويغطي المهارات الأربع مع تصحيح فردي للكتابة والمحادثة بإشراف أمين سنوسي.',
      },
      {
        q: 'لماذا يبلغ السعر 5,000 دج بدلاً من 29,500 دج؟',
        a: '5,000 دج هو سعر تأسيسي خاص بالدفعة التمهيدية الأولى في القسم ببئر الجير، بينما تعود الدفعات اللاحقة المقامة على حواسيب المخبر إلى السعر العادي البالغ 29,500 دج.',
      },
      {
        q: 'هل يُلزم التقديم الإلكتروني بدفع الرسوم فوراً؟',
        a: 'لا. التقديم مجاني وغير ملزم؛ نتواصل معك أولاً بالجدول الزمني المقترح عبر واتساب لتقرر تثبيت تسجيلك من عدمه.',
      },
      {
        q: 'هل تناسب الدورة مرشحي Academic وGeneral Training معاً؟',
        a: 'نعم، لأن الاستماع والمحادثة ومنهجية مقال Task 2 مشتركة بالكامل، مع تخصيص تدريبات القراءة والمهمة الأولى للكتابة حسب مسارك الدراسي أو الهجرة.',
      },
      {
        q: 'ماذا لو كنت أقيم خارج ولاية وهران؟',
        a: 'يمكنك البدء فوراً بعينة القراءة المجانية (/sample) أو شراء اختبار IELTS Academic التجريبي الكامل عبر الإنترنت (3,900 دج عبر البطاقة الذهبية أو CIB)، أو مراسلتنا عبر واتساب للحصص الفردية.',
      },
    ],
    homeCta: 'قدّم عبر نموذج الصفحة الرئيسية',
    mockCta: 'استكشف الاختبار التجريبي (3,900 دج)',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const copy = cohortLaunch[safeLocale];
  return buildArticleMetadata({
    locale: safeLocale,
    slug: COHORT_ARTICLE_PATH.slice('/articles/'.length),
    title: copy.title,
    description: copy.desc,
    publishedTime: '2026-11-16',
    modifiedTime: '2026-11-18',
  });
}

export default async function FirstCohortArticle() {
  const rawLocale = await getLocale();
  const locale: Locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const copy = cohortLaunch[locale];
  const body = COHORT_PAGE_BODY[locale];
  const isRtl = locale === 'ar';
  const cohortStatus = getFoundingCohortStatus();
  const deadlinePassed = isCohortDeadlinePassed() || cohortStatus.isFull;
  const slug = COHORT_ARTICLE_PATH.slice('/articles/'.length);
  const pageUrl = localizedUrl(locale, `articles/${slug}`);

  const courseAndFaqJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${pageUrl}#course`,
        name: copy.title,
        description: copy.desc,
        inLanguage: locale,
        provider: {
          '@type': 'EducationalOrganization',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'Onsite',
          instructor: {
            '@id': `${SITE_URL}/#instructor`,
          },
          location: {
            '@type': 'Place',
            name: SITE_NAME,
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Bir El Djir',
              addressRegion: 'Oran',
              postalCode: '31130',
              addressCountry: 'DZ',
            },
          },
        },
        offers: {
          '@type': 'Offer',
          url: pageUrl,
          price: String(deadlinePassed ? NEXT_COHORT_PRICE_DZD : COURSE_PRICE_DZD),
          priceCurrency: 'DZD',
          availability: deadlinePassed
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/LimitedAvailability',
          ...(!deadlinePassed ? { validThrough: COHORT_DEADLINE_ISO } : {}),
        },
      },
      {
        '@type': 'FAQPage',
        inLanguage: locale,
        mainEntity: body.faqs.map((item) => ({
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
          __html: JSON.stringify(courseAndFaqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <main id="main-content" className={`mx-auto max-w-3xl px-6 pb-24 pt-32 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <ArticleBreadcrumb locale={locale} title={copy.title} />
          <p className="mb-3 text-sm font-bold text-[#b81428]">{copy.category}</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-700">{copy.desc}</p>

          {/* Answer-First Summary */}
          <div className="mt-8 rounded-e-2xl border-s-4 border-crimson bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-charcoal">{body.summaryTitle}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-gray-700">{body.summaryText}</p>
          </div>

          {/* Deadline / Status Callout */}
          <div className="mt-7 rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6">
            {deadlinePassed ? (
              <>
                <p className="text-sm font-bold text-amber-900">{copy.closedTitle}</p>
                <p className="mt-2 text-base leading-relaxed text-gray-700">{copy.closedDesc}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#b81428]">{copy.deadlineLabel}</p>
                <time className="mt-1 block text-2xl font-extrabold text-charcoal" dateTime={COHORT_APPLICATION_DEADLINE}>
                  {copy.deadline}
                </time>
                <p className="mt-2 text-sm text-gray-700">{copy.next}</p>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={COHORT_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-[#c4162c] px-6 py-3 text-sm font-bold text-white hover:bg-red-800"
              >
                {deadlinePassed ? copy.closedCta : copy.apply}
              </a>
              <Link
                href="/#intake"
                className="inline-flex rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-charcoal hover:border-crimson hover:text-[#b81428]"
              >
                {body.homeCta}
              </Link>
            </div>
          </div>

          {/* Key Facts DL */}
          <section aria-labelledby="cohort-facts-heading" className="mt-10 rounded-2xl border border-gray-200 bg-[#faf9f6] p-6">
            <h2 id="cohort-facts-heading" className="text-xl font-extrabold text-charcoal mb-4">
              {body.factsHeading}
            </h2>
            <dl className="divide-y divide-gray-200 text-sm">
              {body.facts.map(([label, value]) => (
                <div key={label} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                  <dt className="font-semibold text-gray-600">{label}</dt>
                  <dd className="font-bold text-charcoal">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Why 8 seats */}
          <section className="mt-12 space-y-4 text-base leading-relaxed text-gray-700">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{body.whyTitle}</h2>
            {body.whyParagraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>

          {/* 4-Week Syllabus */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{body.syllabusTitle}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {body.weeks.map((w) => (
                <div key={w.week} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <span className="inline-block rounded-full bg-crimson/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#b81428]">
                    {w.week}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-charcoal">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{w.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* DZD Pricing Table */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{body.pricingTitle}</h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full border-collapse text-start text-sm">
                <thead>
                  <tr className="bg-charcoal text-white">
                    {body.pricingHeaders.map((h) => (
                      <th key={h} className="p-4 font-bold border-b border-white/10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {body.pricingRows.map((row, idx) => (
                    <tr key={row[0]} className={idx === 0 ? 'bg-crimson/[0.04]' : ''}>
                      <td className="p-4 font-bold text-charcoal">{row[0]}</td>
                      <td className="p-4 text-gray-700">{row[1]}</td>
                      <td className="p-4 font-extrabold text-[#b81428] whitespace-nowrap">{row[2]}</td>
                      <td className="p-4 text-gray-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bir El Djir Logistics */}
          <section className="mt-12 space-y-4 text-base leading-relaxed text-gray-700">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{body.logisticsTitle}</h2>
            {body.logisticsParagraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>

          {/* Rules */}
          <section className="mt-12 rounded-3xl bg-charcoal p-7 text-white">
            <h2 className="text-xl font-extrabold">{body.rulesTitle}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-200">
              {body.rulesBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="font-bold text-[#ff7a8a]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link
                href="/mock-test"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
              >
                {body.mockCta}
              </Link>
            </div>
          </section>

          {/* FAQs */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">{body.faqTitle}</h2>
            <div className="mt-5 space-y-4">
              {body.faqs.map((item) => (
                <div key={item.q} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-charcoal">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug={slug}
              title={copy.title}
              description={copy.desc}
              publishedAt="2026-11-16"
              reviewedAt="2026-11-18"
              sources={[
                {
                  label:
                    locale === 'fr'
                      ? 'IELTS Lab Oran : formulaire de disponibilité (Google Forms)'
                      : locale === 'ar'
                        ? 'IELTS Lab Oran: استمارة أوقات التفرغ'
                        : 'IELTS Lab Oran: weekly availability form',
                  href: COHORT_FORM_URL,
                },
                {
                  label:
                    locale === 'fr'
                      ? 'British Council Algérie : dates, tarifs (40 000 DA) et passage sur ordinateur'
                      : locale === 'ar'
                        ? 'المجلس الثقافي البريطاني الجزائر: المواعيد والرسوم (40,000 دج) والاختبار المحوسب'
                        : 'British Council Algeria: dates, fees (40,000 DA), and computer delivery',
                  href: 'https://www.britishcouncil.dz/exam/ielts/dates-fees-locations',
                },
                {
                  label:
                    locale === 'fr'
                      ? 'IELTS.org : fiche officielle du centre Imtiyaz El Djazair (Oran)'
                      : locale === 'ar'
                        ? 'IELTS.org: صفحة مركز اختبار امتياز الجزائر في وهران'
                        : 'IELTS.org: official Oran test centre (Imtiyaz El Djazair)',
                  href: 'https://ielts.org/test-centres/british-council-imtiyaz-el-djazair',
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
