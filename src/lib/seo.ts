import type { Metadata } from 'next';

/**
 * SEO configuration – single source of truth.
 *
 * Every canonical URL, hreflang alternate, sitemap entry, robots directive,
 * JSON-LD @id, and Open Graph URL derives from CANONICAL_ORIGIN.
 *
 * This is intentionally a compile-time constant, NOT an environment variable,
 * so that preview/staging deployments can never accidentally claim production
 * canonical identity.
 */
export const CANONICAL_ORIGIN = 'https://www.ieltslab.org' as const;

/** @deprecated Use CANONICAL_ORIGIN — kept as an alias for incremental migration. */
export const SITE_URL = CANONICAL_ORIGIN;

export const SITE_NAME = 'IELTS Lab Oran';
export const COURSE_PRICE_DZD = 5_000;
export const NEXT_COHORT_PRICE_DZD = 29_500;
export const COURSE_PRICE_LABEL = '5,000 DA · first cohort';
export const CONTENT_REVIEW_DATE = '2026-07-29';
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Single source of truth for all localized indexable paths (without leading slash).
 * Used by sitemap.ts, proxy.ts (to strip Link hreflang on 404/private paths),
 * IndexNow submission, and unit tests.
 */
export const INDEXABLE_LOCALIZED_PATHS = [
  '',
  'about',
  'mock-test',
  'privacy',
  'terms',
  'articles',
  'articles/first-ielts-preparation-cohort-oran',
  'articles/ielts-one-skill-retake-algeria',
  'articles/academic-vs-general',
  'articles/computer-vs-paper-ielts',
  'articles/free-ielts-resources-algeria',
  'articles/how-to-register-algeria',
  'articles/ielts-vs-toefl-canada',
  'articles/italy-student-visa-english-tests-algeria',
  'articles/overcoming-speaking-anxiety',
  'articles/tlscontact-capago',
  'articles/writing-task-2-tactics',
] as const;

export type IndexableLocalizedPath = (typeof INDEXABLE_LOCALIZED_PATHS)[number];

const INDEXABLE_PATH_SET = new Set<string>(INDEXABLE_LOCALIZED_PATHS);

export function isIndexableLocalizedPath(subPath: string): boolean {
  const normalized = subPath.replace(/^\/+|\/+$/gu, '');
  return INDEXABLE_PATH_SET.has(normalized);
}

/** Search discovery vs model-training bot separation. */
export const ALLOW_MODEL_TRAINING_BOTS = true as const;

/** IndexNow verification key matching public/<INDEXNOW_KEY>.txt */
export const INDEXNOW_KEY = 'e4b8c2d91f0a47e69c3b58a12d7f60e3' as const;

export const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  ar: 'ar_DZ',
};

export function toAlgeriaIsoDate(dateOrIso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/u.test(dateOrIso)) {
    return `${dateOrIso}T00:00:00+01:00`;
  }
  return dateOrIso;
}

export function defaultOgImageUrl() {
  return `${CANONICAL_ORIGIN}/og-default.png`;
}

export function defaultOgImages(alt: string) {
  return [
    {
      url: defaultOgImageUrl(),
      width: 1200,
      height: 630,
      alt,
    },
  ];
}

export function alternateOgLocales(locale: Locale) {
  return LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE_MAP[l]);
}

/**
 * Generates the full hreflang alternates map for a given path.
 * Pass `path` without a leading slash (e.g. '' for homepage, 'articles/tlscontact-capago' for articles).
 */
export function buildAlternates(locale: Locale, path: string = '') {
  const normalize = (p: string) => (p ? `/${p}` : '');
  const languages: Record<string, string> = {};

  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}/${l}${normalize(path)}`;
  }

  // x-default points to the English version (canonical default for undetermined locales)
  languages['x-default'] = `${SITE_URL}/en${normalize(path)}`;

  return {
    canonical: `${SITE_URL}/${locale}${normalize(path)}`,
    languages,
  };
}

export function localizedUrl(locale: Locale, path: string = '') {
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `${SITE_URL}/${locale}${normalizedPath}`;
}

export function buildWebsitePageMetadata({
  locale,
  path = '',
  title,
  description,
}: {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
}): Metadata {
  const url = localizedUrl(locale, path);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: OG_LOCALE_MAP[locale],
      alternateLocale: alternateOgLocales(locale),
      images: defaultOgImages(title),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [defaultOgImageUrl()],
    },
  };
}

export function buildArticleMetadata({
  locale,
  slug,
  title,
  description,
  publishedTime = CONTENT_REVIEW_DATE,
  modifiedTime = CONTENT_REVIEW_DATE,
}: {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const url = localizedUrl(locale, `articles/${slug}`);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: buildAlternates(locale, `articles/${slug}`),
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: OG_LOCALE_MAP[locale],
      alternateLocale: alternateOgLocales(locale),
      publishedTime: toAlgeriaIsoDate(publishedTime),
      modifiedTime: toAlgeriaIsoDate(modifiedTime),
      images: defaultOgImages(title),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [defaultOgImageUrl()],
    },
  };
}

const ARTICLE_DESCRIPTIONS = {
  'academic-vs-general': {
    en: 'Compare IELTS Academic and General Training Reading and Writing, check visa and Express Entry rules, and choose the right test in Algeria.',
    fr: 'Comparez Reading et Writing en IELTS Academic et General Training, vérifiez les règles visas/Canada et choisissez le bon test en Algérie.',
    ar: 'قارن قسمي القراءة والكتابة في IELTS Academic وGeneral Training، وتعرّف على شروط الدراسة والهجرة لاختيار الاختبار الصحيح في الجزائر.',
  },
  'computer-vs-paper-ielts': {
    en: 'British Council Algeria delivers IELTS exclusively on computer since 30 April 2026: 1–2 day results, screen tools, One Skill Retake, and prep.',
    fr: 'Le British Council Algérie passe 100 % sur ordinateur dès le 30 avril 2026 : résultats en 1–2 jours, outils écran, One Skill Retake et prépa PC.',
    ar: 'تقديم اختبار IELTS في الجزائر حصرياً على الكمبيوتر منذ 30 أبريل 2026: النتائج خلال يومين، أدوات الشاشة، إعادة مهارة واحدة، والتدريب العملي.',
  },
  'free-ielts-resources-algeria': {
    en: 'Verified free computer IELTS resources for Algerian candidates: IELTS Ready, IELTS.org samples, IDP familiarisation, plus our free Reading sample.',
    fr: 'Ressources IELTS gratuites vérifiées en Algérie : IELTS Ready, sujets IELTS.org, test IDP sur PC et notre échantillon Reading gratuit chronométré.',
    ar: 'أفضل مصادر تحضير IELTS المجانية والموثقة في الجزائر: منصة IELTS Ready ونماذج IELTS.org وتجربة IDP مع عينتنا التفاعلية المجانية للقراءة.',
  },
  'how-to-register-algeria': {
    en: 'Official 2026 IELTS Algeria guide: 40,000 DA fee, online card/transfer/HSBC cash payment within 72h, Oran & Algiers centres, and passport rules.',
    fr: 'Guide IELTS Algérie 2026 : tarif officiel 40 000 DA, paiement sous 72 h (carte, virement, espèces HSBC), centre d’Oran et passeport obligatoire.',
    ar: 'دليل التسجيل في IELTS الجزائر 2026: الرسوم الرسمية 40,000 دج، طرق الدفع خلال 72 ساعة (بطاقة، تحويل، نقداً HSBC)، مركز وهران وشروط جواز السفر.',
  },
  'ielts-vs-toefl-canada': {
    en: 'Express Entry tests for Algerians: IELTS General Training (40,000 DA) vs TCF Canada, bilingual +50 CRS bonus, CLB 9 scores, and calculator.',
    fr: 'Tests Entrée express depuis l’Algérie : IELTS General Training vs TCF Canada, bonus bilingue +50 points CRS, seuils CLB 9 et calculateur.',
    ar: 'اختبارات الهجرة إلى كندا Express Entry للجزائريين: مقارنة IELTS General وTCF Canada، نقاط المزاوجة اللغوية (+50 CRS)، وحاسبة معادلة CLB.',
  },
  'italy-student-visa-english-tests-algeria': {
    en: 'Italy student visa English rules in Algeria (2026): B2 Embassy requirements, why IELTS beats Duolingo or EnglishScore for visas, and promo notes.',
    fr: 'Visa étudiant Italie en Algérie (2026) : exigences B2 de l’Ambassade à Alger, statut d’IELTS face à Duolingo et EnglishScore, et conseils sûrs.',
    ar: 'شروط اللغة لتأشيرة الدراسة في إيطاليا من الجزائر 2026: متطلبات شهادة B2 لدى السفارة، الفرق بين قبول الجامعة والتأشيرة، وموقف IELTS وDuolingo.',
  },
  'overcoming-speaking-anxiety': {
    en: 'Practical IELTS Speaking preparation for Algerian candidates: manage exam-day nerves, use the 1-minute Part 2 prep map, and avoid memorized scripts.',
    fr: 'Techniques concrètes pour gérer le stress à l’oral IELTS en Algérie : structurer la minute de préparation en Partie 2 sans réponses récitées par cœur.',
    ar: 'دليل عملي للمرشحين الجزائريين للتغلب على التوتر في محادثة IELTS Speaking: خطة الدقيقة الواحدة في الجزء الثاني وتجنب الإجابات المحفوظة مسبقاً.',
  },
  'tlscontact-capago': {
    en: 'Verified English test guide for Algerian student visas: when UK CAS requires IELTS for UKVI (SELT) vs standard IELTS, and Capago France rules.',
    fr: 'Guide vérifié pour les étudiants algériens : quand un Student visa UK exige IELTS for UKVI (SELT) selon votre CAS, et règles Capago pour la France.',
    ar: 'دليل موثق لطلبة الجزائر حول إثبات اللغة لتأشيرات بريطانيا وفرنسا: متى يشترط خطاب CAS اختبار IELTS for UKVI، وكيف تعالج Capago ملفات فرنسا.',
  },
  'writing-task-2-tactics': {
    en: 'A repeatable 40-minute IELTS Writing Task 2 planning workflow aligned with official Band 7–8 descriptors, computer word-count tools, and zero templates.',
    fr: 'Méthode concrète en 40 minutes pour réussir l’essai IELTS Writing Task 2 sur ordinateur selon les 4 critères officiels, sans modèles mémorisés.',
    ar: 'منهجية عملية خلال 40 دقيقة لتخطيط وكتابة مقال IELTS Writing Task 2 على الكمبيوتر وفق معايير التصحيح الرسمية الأربعة دون الاعتماد على قوالب جاهزة.',
  },
} as const;

export type ArticleSlug = keyof typeof ARTICLE_DESCRIPTIONS;

export function articleDescription(locale: Locale, slug: ArticleSlug) {
  return ARTICLE_DESCRIPTIONS[slug][locale];
}

const ARTICLE_SEO_TITLES: Record<ArticleSlug, Record<Locale, string>> = {
  'academic-vs-general': {
    en: 'IELTS Academic vs General Training: Algeria Guide',
    fr: 'IELTS Academic ou General Training : Guide Algérie',
    ar: 'الفرق بين IELTS Academic وGeneral Training بالجزائر',
  },
  'computer-vs-paper-ielts': {
    en: 'Computer IELTS in Algeria: 2026 Rules & Fast Prep',
    fr: 'IELTS sur ordinateur Algérie 2026 : règles et PC',
    ar: 'اختبار IELTS على الكمبيوتر بالجزائر: قواعد 2026',
  },
  'free-ielts-resources-algeria': {
    en: 'Free IELTS Practice & Computer Mocks in Algeria',
    fr: 'Tests blancs et ressources IELTS gratuits Algérie',
    ar: 'نماذج وموارد تدريب IELTS المجانية في الجزائر',
  },
  'how-to-register-algeria': {
    en: 'IELTS Algeria 2026: 40,000 DA Fee, Payment & Oran',
    fr: 'Prix & Inscription IELTS Algérie 2026 (40 000 DA)',
    ar: 'سعر والتسجيل في IELTS الجزائر 2026 (40,000 دج)',
  },
  'ielts-vs-toefl-canada': {
    en: 'IELTS vs TCF Canada: Express Entry & CLB Calculator',
    fr: 'IELTS & TCF Canada : Entrée express et calcul CLB',
    ar: 'اختبار IELTS وTCF للهجرة إلى كندا وحاسبة CLB',
  },
  'italy-student-visa-english-tests-algeria': {
    en: 'Italy Study Visa Algeria 2026: IELTS vs Duolingo',
    fr: 'Visa études Italie Algérie 2026 : IELTS & Duolingo',
    ar: 'تأشيرة الدراسة لإيطاليا من الجزائر 2026: IELTS وB2',
  },
  'overcoming-speaking-anxiety': {
    en: 'IELTS Speaking Anxiety: Practical Tactics & Timing',
    fr: 'Stress au Speaking IELTS : stratégies et méthode',
    ar: 'التغلب على قلق محادثة IELTS: خطوات وتقنيات عملية',
  },
  'tlscontact-capago': {
    en: 'UK & France Student Visas Algeria: IELTS & UKVI',
    fr: 'Visas étudiants UK & France Algérie : IELTS UKVI',
    ar: 'تأشيرات الدراسة لبريطانيا وفرنسا: متى تحتاج UKVI؟',
  },
  'writing-task-2-tactics': {
    en: 'IELTS Writing Task 2: Band 8.0 Planning Method',
    fr: 'IELTS Writing Task 2 : méthode de planification',
    ar: 'إتقان IELTS Writing Task 2: خطة عملية بلا قوالب',
  },
};

export function articleSeoTitle(locale: Locale, slug: ArticleSlug) {
  return ARTICLE_SEO_TITLES[slug][locale];
}

export const HOMEPAGE_SEO_TITLES: Record<Locale, string> = {
  en: 'IELTS Preparation in Oran (Computer-Based) | IELTS Lab Oran',
  fr: 'Préparation IELTS sur ordinateur à Oran | IELTS Lab Oran',
  ar: 'تحضير ايلتس IELTS على الكمبيوتر في وهران | IELTS Lab Oran',
};

export const HOMEPAGE_SEO_DESCRIPTIONS: Record<Locale, string> = {
  en: 'In-person computer-based IELTS preparation in Bir El Djir, Oran. Practise all 4 skills in an 8-seat PC lab with individual Writing & Speaking feedback.',
  fr: 'Préparation IELTS sur ordinateur en petit groupe (8 places) à Bir El Djir, Oran. Entraînez-vous aux 4 épreuves sur PC avec correction individuelle.',
  ar: 'تحضير حضوري لاختبار الايلتس IELTS على الكمبيوتر في بئر الجير، وهران (31130). تدرّب على المهارات الأربع في قاعة من 8 مقاعد مع تصحيح وملاحظات فردية.',
};

export type StandalonePageSlug = 'mock-test' | 'about' | 'privacy' | 'terms';

export const STANDALONE_PAGE_SEO_TITLES: Record<StandalonePageSlug, Record<Locale, string>> = {
  'mock-test': {
    en: 'Online IELTS Academic Mock Test Algeria | IELTS Lab Oran',
    fr: 'Test Blanc IELTS Academic en Ligne Algérie | IELTS Lab',
    ar: 'اختبار IELTS Academic تجريبي بالجزائر | IELTS Lab Oran',
  },
  about: {
    en: 'About IELTS Lab Oran & Amine Senouci (Band 8.0) | Oran',
    fr: 'À propos d’IELTS Lab Oran & Amine Senouci (Band 8.0)',
    ar: 'من نحن والمدرب أمين سنوسي (Band 8.0) | IELTS Lab Oran',
  },
  privacy: {
    en: 'Privacy Policy (Algeria Law 18-07) | IELTS Lab Oran',
    fr: 'Politique de Confidentialité (Loi 18-07) | IELTS Lab Oran',
    ar: 'سياسة الخصوصية وحماية البيانات (18-07) | IELTS Lab Oran',
  },
  terms: {
    en: 'Terms of Service & Refund Policy | IELTS Lab Oran',
    fr: 'Conditions Générales & Remboursement | IELTS Lab Oran',
    ar: 'شروط الاستخدام وسياسة الاسترجاع | IELTS Lab Oran',
  },
};

export const STANDALONE_PAGE_SEO_DESCRIPTIONS: Record<StandalonePageSlug, Record<Locale, string>> = {
  'mock-test': {
    en: 'Take a timed computer-based IELTS Academic mock test in Algeria (3,900 DZD via Chargily Pay / CIB / Edahabia) or try our free 5-question Reading sample.',
    fr: 'Passez un test blanc IELTS Academic chronométré sur ordinateur en Algérie (3 900 DZD via Chargily Pay CIB/Edahabia) ou testez l’échantillon Reading gratuit.',
    ar: 'اجتز اختبار IELTS Academic تجريبياً محدداً بالوقت على الكمبيوتر في الجزائر (3,900 دج عبر Chargily Pay والذهبية/CIB) أو جرّب عينة القراءة المجانية.',
  },
  about: {
    en: 'Meet Amine Senouci (Official IELTS Band 8.0, Listening 9.0, TEFL) and discover IELTS Lab Oran in Bir El Djir (31130): 8-seat coaching & simulation.',
    fr: 'Découvrez IELTS Lab Oran à Bir El Djir (31130) et son fondateur Amine Senouci (Band 8.0 officiel, Listening 9.0, certifié TEFL) : prépa et simulateur.',
    ar: 'تعرّف على مركز IELTS Lab Oran في بئر الجير، وهران (31130) ومؤسسه المدرب المعتمد أمين سنوسي (Band 8.0 رسمية، و9.0 في الاستماع): تدريب ومحاكاة رقمية.',
  },
  privacy: {
    en: 'How IELTS Lab Oran collects, protects, and retains cohort application data, Chargily payment records, and 30-day mock test results under Algeria Law 18-07.',
    fr: 'Comment IELTS Lab Oran collecte, protège et conserve vos données de candidature, paiements Chargily et résultats (30 jours) selon la loi algérienne 18-07.',
    ar: 'كيف يعالج مركز IELTS Lab Oran بيانات طلبات التسجيل، مدفوعات Chargily، ونتائج الاختبار التجريبي المحفوظة لمدة 30 يوماً وفق القانون الجزائري 18-07.',
  },
  terms: {
    en: 'Terms of service, cohort application rules, online IELTS Academic mock test access (30 days), and refund policy for IELTS Lab Oran in Bir El Djir, Oran.',
    fr: 'Conditions d’utilisation, règles de candidature aux cohortes d’Oran, accès au test blanc IELTS en ligne (30 jours) et politique de remboursement.',
    ar: 'شروط الاستخدام، قواعد التقديم لدورات وهران الحضورية، شروط صلاحية الاختبار التجريبي عبر الإنترنت (30 يوماً)، وسياسة الاسترجاع في IELTS Lab Oran.',
  },
};

export function buildLocaleRootMetadata(locale: string): Metadata {
  if (!LOCALES.includes(locale as Locale)) {
    return {
      metadataBase: new URL(CANONICAL_ORIGIN),
      title: '404 - Page Not Found | IELTS Lab Oran',
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
      openGraph: undefined,
      twitter: undefined,
    };
  }
  const safeLocale = locale as Locale;
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: '',
    title: HOMEPAGE_SEO_TITLES[safeLocale],
    description: HOMEPAGE_SEO_DESCRIPTIONS[safeLocale],
  });
}

export const GUIDE_POOL: ReadonlyArray<{
  slug: string;
  title: Record<Locale, string>;
}> = [
  {
    slug: 'how-to-register-algeria',
    title: {
      en: 'How to Register & Pay for IELTS in Algeria (2026)',
      fr: 'Inscription et paiement IELTS en Algérie (2026)',
      ar: 'التسجيل ودفع رسوم IELTS في الجزائر (2026)',
    },
  },
  {
    slug: 'computer-vs-paper-ielts',
    title: {
      en: 'IELTS on Computer in Algeria (Since April 2026)',
      fr: 'IELTS sur ordinateur en Algérie (depuis avril 2026)',
      ar: 'IELTS على الكمبيوتر في الجزائر (منذ أبريل 2026)',
    },
  },
  {
    slug: 'first-ielts-preparation-cohort-oran',
    title: {
      en: 'First IELTS Preparation Cohort in Oran (5,000 DA)',
      fr: 'Premier groupe de préparation IELTS à Oran (5 000 DA)',
      ar: 'أول دورة تحضيرية لاختبار IELTS في وهران (5,000 دج)',
    },
  },
  {
    slug: 'free-ielts-resources-algeria',
    title: {
      en: 'Free IELTS Resources & Mock Tests in Algeria',
      fr: 'Ressources et tests blancs IELTS gratuits en Algérie',
      ar: 'مصادر ونماذج IELTS المجانية في الجزائر',
    },
  },
  {
    slug: 'ielts-one-skill-retake-algeria',
    title: {
      en: 'IELTS One Skill Retake in Algeria (25,000 DA)',
      fr: 'One Skill Retake IELTS en Algérie (25 000 DA)',
      ar: 'إعادة مهارة واحدة One Skill Retake في الجزائر',
    },
  },
  {
    slug: 'academic-vs-general',
    title: {
      en: 'IELTS Academic vs General Training',
      fr: 'IELTS Academic vs General Training',
      ar: 'الفرق بين Academic وGeneral Training',
    },
  },
  {
    slug: 'ielts-vs-toefl-canada',
    title: {
      en: 'IELTS General Training for Canada Express Entry',
      fr: 'IELTS pour Entrée express Canada & NCLC/CLB',
      ar: 'IELTS للهجرة إلى كندا وحساب CLB',
    },
  },
  {
    slug: 'italy-student-visa-english-tests-algeria',
    title: {
      en: 'Italy Student Visa English Tests from Algeria',
      fr: 'Visa d’études Italie : tests d’anglais en Algérie',
      ar: 'تأشيرة إيطاليا واختبارات الإنجليزية للجزائريين',
    },
  },
  {
    slug: 'tlscontact-capago',
    title: {
      en: 'UK & France Visa Language Rules for Algeria',
      fr: 'Visas UK & France : règles de langue depuis l’Algérie',
      ar: 'قواعد اللغة لتأشيرات بريطانيا وفرنسا من الجزائر',
    },
  },
  {
    slug: 'overcoming-speaking-anxiety',
    title: {
      en: 'Overcoming IELTS Speaking Anxiety',
      fr: 'Gérer le stress au Speaking IELTS',
      ar: 'التغلب على قلق محادثة IELTS Speaking',
    },
  },
  {
    slug: 'writing-task-2-tactics',
    title: {
      en: 'IELTS Writing Task 2 Planning Method',
      fr: 'Méthode IELTS Writing Task 2',
      ar: 'منهجية التخطيط في IELTS Writing Task 2',
    },
  },
];
