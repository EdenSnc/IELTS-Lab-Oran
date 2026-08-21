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
export const COURSE_PRICE_DZD = 29_500;
export const COURSE_PRICE_LABEL = '29,500 DA';
export const CONTENT_REVIEW_DATE = '2026-07-29';
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Generates the full hreflang alternates map for a given path.
 * Pass `path` without a leading slash (e.g. '' for homepage, 'articles/tlscontact-capago' for articles).
 */
export function buildAlternates(locale: Locale, path: string = '') {
  const normalize = (p: string) => (p ? `/${p}` : '');
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${normalize(path)}`;
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

export function buildArticleMetadata({
  locale,
  slug,
  title,
  description,
}: {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
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
      locale,
      modifiedTime: CONTENT_REVIEW_DATE,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
    en: 'What Algeria’s 30 April 2026 move to computer-delivered IELTS changes: format, results, One Skill Retake, and preparation.',
    fr: 'Ce que le passage de l’Algérie à l’IELTS sur ordinateur le 30 avril 2026 change : format, résultats, One Skill Retake et préparation.',
    ar: 'ما الذي يغيّره انتقال الجزائر إلى IELTS على الكمبيوتر في 30 أبريل 2026: التنسيق والنتائج وOne Skill Retake والتحضير.',
  },
  'free-ielts-resources-algeria': {
    en: 'A verified list of official free IELTS practice resources for candidates in Algeria, with a practical computer-test study plan.',
    fr: 'Une liste vérifiée de ressources IELTS officielles et gratuites pour l’Algérie, avec un plan pratique pour le test sur ordinateur.',
    ar: 'قائمة موثقة بموارد IELTS الرسمية المجانية للمرشحين في الجزائر مع خطة عملية للاختبار على الكمبيوتر.',
  },
  'how-to-register-algeria': {
    en: 'Verified 2026 guide to booking IELTS in Algeria: the 40,000 DA standard fee, accepted ID, payment methods, and 72-hour deadline.',
    fr: 'Guide 2026 vérifié pour réserver l’IELTS en Algérie : frais de 40 000 DA, identité, moyens de paiement et délai de 72 heures.',
    ar: 'دليل موثق لعام 2026 لحجز IELTS في الجزائر: رسوم 40,000 دج والهوية وطرق الدفع ومهلة 72 ساعة.',
  },
  'ielts-vs-toefl-canada': {
    en: 'Express Entry language tests for Algerians: IELTS General Training, TCF Canada, French-English CRS points, CLB conversion, and why Academic is not accepted.',
    fr: 'Tests Entrée express pour les Algériens : IELTS General Training, TCF Canada, points français-anglais, conversion CLB et règle sur Academic.',
    ar: 'اختبارات Express Entry للجزائريين: IELTS General Training وTCF Canada ونقاط الفرنسية والإنجليزية وتحويل CLB ولماذا لا يُقبل Academic.',
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
    en: 'Computer IELTS in Algeria: 2026 Changes',
    fr: 'IELTS sur ordinateur en Algérie : changements 2026',
    ar: 'IELTS على الكمبيوتر في الجزائر: تغييرات 2026',
  },
  'free-ielts-resources-algeria': {
    en: 'Free IELTS Practice Resources in Algeria',
    fr: 'Ressources gratuites IELTS en Algérie',
    ar: 'موارد IELTS المجانية في الجزائر',
  },
  'how-to-register-algeria': {
    en: 'IELTS Registration Algeria 2026: Fee & Payment',
    fr: 'Inscription IELTS Algérie 2026 : prix et paiement',
    ar: 'التسجيل في IELTS الجزائر 2026: السعر والدفع',
  },
  'ielts-vs-toefl-canada': {
    en: 'IELTS for Canada Express Entry: Tests & CLB',
    fr: 'IELTS pour Entrée express Canada : tests et CLB',
    ar: 'IELTS للهجرة إلى كندا: الاختبارات وCLB',
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
