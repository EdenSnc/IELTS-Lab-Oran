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
export const COURSE_PRICE_LABEL = '5,000 DA · first cohort';
export const CONTENT_REVIEW_DATE = '2026-07-29';
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/** Search discovery vs model-training bot separation. */
export const ALLOW_MODEL_TRAINING_BOTS = true as const;

/** IndexNow verification key matching public/<INDEXNOW_KEY>.txt */
export const INDEXNOW_KEY = 'e4b8c2d91f0a47e69c3b58a12d7f60e3' as const;

export const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  ar: 'ar_DZ',
};

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
      publishedTime,
      modifiedTime,
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
    en: 'Compare IELTS Academic and General Training Reading and Writing, then choose the right test for study, work, or migration.',
    fr: 'Comparez Reading et Writing en IELTS Academic et General Training, puis choisissez le test adapté aux études, au travail ou à l’immigration.',
    ar: 'قارن Reading وWriting في IELTS Academic وGeneral Training واختر الاختبار المناسب للدراسة أوالعمل أوالهجرة.',
  },
  'computer-vs-paper-ielts': {
    en: 'British Council Algeria delivers IELTS on computer from 30 April 2026. Learn format rules, 1–2 day results, One Skill Retake, and screen prep.',
    fr: 'Le British Council Algérie passe à l’IELTS sur ordinateur dès le 30 avril 2026 : format, résultats en 1–2 jours, One Skill Retake et préparation sur PC.',
    ar: 'انتقال IELTS في الجزائر إلى الكمبيوتر منذ 30 أبريل 2026: الصيغة، النتائج خلال يومين، One Skill Retake، وكيفية التدرب على الشاشة.',
  },
  'free-ielts-resources-algeria': {
    en: 'Verified free IELTS computer practice in Algeria: IELTS Ready, IELTS.org samples, IDP familiarisation, plus our free Reading sample.',
    fr: 'Ressources IELTS gratuites et officielles en Algérie : IELTS Ready, exemples IELTS.org, simulateur IDP et notre échantillon Reading sur ordinateur.',
    ar: 'موارد IELTS مجانية وموثقة في الجزائر: IELTS Ready ونماذج IELTS.org وتدريب IDP وعينتنا المجانية للقراءة على الكمبيوتر.',
  },
  'how-to-register-algeria': {
    en: 'IELTS Algeria 2026 guide: 40,000 DA fee, online card/bank/HSBC cash payment within 72h, Oran & DZ test centres, and ID rules.',
    fr: 'Prix IELTS Algérie 2026 (40 000 DA), où payer (carte, virement, HSBC), inscription sous 72 h, centre d’Oran et pièces d’identité acceptées.',
    ar: 'سعر IELTS الجزائر 2026 (40,000 دج)، طرق الدفع (بطاقة بنكية، تحويل، HSBC) خلال 72 ساعة، مركز وهران ووثائق الهوية المطلوبة.',
  },
  'ielts-vs-toefl-canada': {
    en: 'Express Entry language tests for Algerians: IELTS General Training, TCF Canada, French-English CRS points, CLB conversion, and why Academic is not accepted.',
    fr: 'Tests Entrée express pour les Algériens : IELTS General Training, TCF Canada, points français-anglais, conversion CLB et règle sur Academic.',
    ar: 'اختبارات Express Entry للجزائريين: IELTS General Training وTCF Canada ونقاط الفرنسية والإنجليزية وتحويل CLB ولماذا لا يُقبل Academic.',
  },
  'italy-student-visa-english-tests-algeria': {
    en: 'Italy study visas from Algeria in 2026: what B2 means, why university acceptance differs from visa evidence, and where IELTS, Duolingo and EnglishScore stand.',
    fr: 'Visa d’études Italie depuis l’Algérie en 2026 : niveau B2, différence admission/visa, et statut d’IELTS, Duolingo et EnglishScore.',
    ar: 'تأشيرة الدراسة إلى إيطاليا من الجزائر في 2026: مستوى B2 والفرق بين القبول والتأشيرة ووضع IELTS وDuolingo وEnglishScore.',
  },
  'overcoming-speaking-anxiety': {
    en: 'Practical preparation and speaking techniques for managing IELTS Speaking anxiety without memorized answers.',
    fr: 'Préparation et techniques pratiques pour gérer le stress du Speaking IELTS sans réponses mémorisées.',
    ar: 'تحضير وتقنيات عملية للتعامل مع قلق IELTS Speaking دون إجابات محفوظة.',
  },
  'tlscontact-capago': {
    en: 'A verified decision guide to English evidence for UK Student visas and language-document checks for France applications from Algeria.',
    fr: 'Guide vérifié sur la preuve d’anglais pour le Student visa UK et les documents linguistiques des demandes France depuis l’Algérie.',
    ar: 'دليل موثق لإثبات الإنجليزية في تأشيرة Student البريطانية ووثائق اللغة لطلبات فرنسا من الجزائر.',
  },
  'writing-task-2-tactics': {
    en: 'A practical IELTS Writing Task 2 planning and paragraphing method aligned with the official scoring criteria, without band guarantees.',
    fr: 'Une méthode pratique de planification pour IELTS Writing Task 2, alignée sur les critères officiels et sans promesse de bande.',
    ar: 'طريقة عملية لتخطيط IELTS Writing Task 2 وفق معايير التقييم الرسمية دون ضمان درجة.',
  },
} as const;

export type ArticleSlug = keyof typeof ARTICLE_DESCRIPTIONS;

export function articleDescription(locale: Locale, slug: ArticleSlug) {
  return ARTICLE_DESCRIPTIONS[slug][locale];
}

const ARTICLE_SEO_TITLES: Record<ArticleSlug, Record<Locale, string>> = {
  'academic-vs-general': {
    en: 'IELTS Academic vs General Training | Oran',
    fr: 'IELTS Academic ou General Training | Oran',
    ar: 'IELTS Academic أم General Training | وهران',
  },
  'computer-vs-paper-ielts': {
    en: 'Computer IELTS in Algeria: 2026 Changes & Prep',
    fr: 'IELTS sur ordinateur en Algérie : règles et préparation 2026',
    ar: 'اختبار IELTS على الكمبيوتر في الجزائر: تغييرات 2026',
  },
  'free-ielts-resources-algeria': {
    en: 'Free IELTS Practice & Mock Tests in Algeria',
    fr: 'Ressources et tests blancs IELTS gratuits en Algérie',
    ar: 'موارد ونماذج اختبار IELTS مجانية في الجزائر',
  },
  'how-to-register-algeria': {
    en: 'IELTS Price & Registration Algeria 2026 (40,000 DA)',
    fr: 'Prix & Inscription IELTS Algérie 2026 : 40 000 DA et paiement',
    ar: 'سعر والتسجيل في اختبار IELTS الجزائر 2026 (40,000 دج)',
  },
  'ielts-vs-toefl-canada': {
    en: 'IELTS for Canada Express Entry: Tests & CLB',
    fr: 'IELTS pour Entrée express Canada : tests et CLB',
    ar: 'IELTS للهجرة إلى كندا: الاختبارات وCLB',
  },
  'italy-student-visa-english-tests-algeria': {
    en: 'Italy Student Visa English Tests: Algeria 2026',
    fr: 'Visa études Italie : tests d’anglais Algérie 2026',
    ar: 'تأشيرة إيطاليا واختبارات الإنجليزية للجزائريين',
  },
  'overcoming-speaking-anxiety': {
    en: 'IELTS Speaking Anxiety: Practical Strategies',
    fr: 'Stress au Speaking IELTS : stratégies pratiques',
    ar: 'قلق محادثة IELTS: استراتيجيات عملية',
  },
  'tlscontact-capago': {
    en: 'IELTS for UK & France Student Visas: Algeria',
    fr: 'IELTS et visas étudiants UK/France : Algérie',
    ar: 'IELTS وتأشيرات الدراسة لبريطانيا وفرنسا',
  },
  'writing-task-2-tactics': {
    en: 'IELTS Writing Task 2: A Planning Method',
    fr: 'IELTS Writing Task 2 : méthode de planification',
    ar: 'IELTS Writing Task 2: طريقة عملية للتخطيط',
  },
};

export function articleSeoTitle(locale: Locale, slug: ArticleSlug) {
  return ARTICLE_SEO_TITLES[slug][locale];
}
