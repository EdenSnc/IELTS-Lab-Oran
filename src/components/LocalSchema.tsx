import { ACADEMIC_MOCK_TEST_PRODUCT } from '@/lib/commerce/catalog';
import { getFoundingCohortStatus } from '@/lib/cohort';
import {
  COHORT_ARTICLE_PATH,
  COHORT_DEADLINE_ISO,
  isCohortDeadlinePassed,
} from '@/lib/cohort-launch';
import {
  COURSE_PRICE_DZD,
  NEXT_COHORT_PRICE_DZD,
  SITE_URL,
  SITE_NAME,
  Locale,
  defaultOgImageUrl,
  localizedUrl,
} from '@/lib/seo';

const DESCRIPTIONS: Record<Locale, string> = {
  en: 'Small-group computer-based IELTS preparation in an 8-seat physical PC lab in Bir El Djir, Oran (31130), Algeria, plus an online IELTS Academic mock test platform.',
  fr: 'Préparation IELTS sur ordinateur en petit groupe (8 places) à Bir El Djir, Oran (31130), Algérie, et plateforme de tests blancs IELTS Academic en ligne.',
  ar: 'التحضير لاختبار IELTS على الكمبيوتر ضمن مجموعة صغيرة من 8 مقاعد في بئر الجير، وهران (31130)، الجزائر، مع منصة اختبارات IELTS Academic التجريبية عبر الإنترنت.',
};

const COURSE_NAMES: Record<Locale, { open: string; next: string }> = {
  en: {
    open: 'First Cohort — IELTS Lab Oran',
    next: 'Small-Group IELTS Preparation Cohort — IELTS Lab Oran',
  },
  fr: {
    open: 'Premier groupe — IELTS Lab Oran',
    next: 'Cohorte de préparation IELTS en petit groupe — IELTS Lab Oran',
  },
  ar: {
    open: 'المجموعة الأولى — IELTS Lab Oran',
    next: 'دورة التحضير المصغرة لاختبار IELTS — IELTS Lab Oran',
  },
};

const COURSE_DESCRIPTIONS: Record<Locale, string> = {
  en: 'Approximately one month of intensive, small-group in-person IELTS preparation (8 seats) in Bir El Djir, Oran, covering all four skills with individual Writing and Speaking feedback.',
  fr: 'Environ un mois de préparation intensive à l’IELTS en présentiel en petit groupe de 8 places à Bir El Djir, Oran, couvrant les 4 compétences avec suivi individuel.',
  ar: 'حوالي شهر واحد من التحضير الحضوري المكثف لاختبار IELTS ضمن مجموعة صغيرة من 8 مقاعد في بئر الجير، وهران، يشمل المهارات الأربع مع تقييم فردي للكتابة والمحادثة.',
};

const MOCK_NAMES: Record<Locale, string> = {
  en: 'Online IELTS Academic Mock Test — IELTS Lab Oran',
  fr: 'Test blanc IELTS Academic en ligne — IELTS Lab Oran',
  ar: 'اختبار IELTS Academic التجريبي عبر الإنترنت — IELTS Lab Oran',
};

const MOCK_DESCRIPTIONS: Record<Locale, string> = {
  en: 'Full timed computer-delivered IELTS Academic simulation (Listening, Reading, and Writing) with 30-day stored results and Chargily Pay DZD checkout.',
  fr: 'Simulation complète chronométrée IELTS Academic sur ordinateur (Listening, Reading et Writing) avec résultats conservés 30 jours et paiement Chargily Pay en dinars.',
  ar: 'محاكاة كاملة ومحددة بالوقت لاختبار IELTS Academic على الكمبيوتر (الاستماع والقراءة والكتابة) مع حفظ النتائج لمدة 30 يوماً والدفع بالدينار عبر Chargily Pay.',
};

const CATALOG_NAMES: Record<Locale, string> = {
  en: 'IELTS Preparation Courses & Online Mock Tests',
  fr: 'Cours de préparation IELTS et tests blancs en ligne',
  ar: 'دورات تحضير IELTS والاختبارات التجريبية عبر الإنترنت',
};

const AREA_SERVED: Record<Locale, { city: string; country: string }> = {
  en: { city: 'Oran', country: 'Algeria' },
  fr: { city: 'Oran', country: 'Algérie' },
  ar: { city: 'وهران', country: 'الجزائر' },
};

const GOOGLE_MAPS_BIR_EL_DJIR_URL =
  'https://www.google.com/maps/search/?api=1&query=Bir+El+Djir+31130+Oran+Algeria';

export default function LocalSchema({ locale = 'en' }: { locale?: Locale }) {
  const safeLocale: Locale = locale in DESCRIPTIONS ? locale : 'en';
  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const instructorId = `${SITE_URL}/#instructor`;

  const cohortStatus = getFoundingCohortStatus();
  const cohortClosed = isCohortDeadlinePassed() || cohortStatus.isFull;
  const activeCoursePrice = cohortClosed ? NEXT_COHORT_PRICE_DZD : COURSE_PRICE_DZD;
  const activeCourseAvailability = cohortClosed
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/LimitedAvailability';
  const mockPriceDzd = Math.round(ACADEMIC_MOCK_TEST_PRODUCT.priceMinor / 100);

  const postalAddress = {
    '@type': 'PostalAddress',
    addressLocality: 'Bir El Djir',
    addressRegion: 'Oran',
    postalCode: '31130',
    addressCountry: 'DZ',
  };

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        image: defaultOgImageUrl(),
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo_rounded.png`,
          width: 512,
          height: 512,
        },
        description: DESCRIPTIONS[safeLocale],
        founder: {
          '@id': instructorId,
        },
        address: postalAddress,
        hasMap: GOOGLE_MAPS_BIR_EL_DJIR_URL,
        areaServed: [
          {
            '@type': 'City',
            name: AREA_SERVED[safeLocale].city,
          },
          {
            '@type': 'Country',
            name: AREA_SERVED[safeLocale].country,
          },
        ],
        email: 'ieltslab.oran@gmail.com',
        telephone: '+213780343103',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: CATALOG_NAMES[safeLocale],
          itemListElement: [
            {
              '@type': 'Offer',
              url: localizedUrl(safeLocale, COHORT_ARTICLE_PATH.slice(1)),
              price: String(activeCoursePrice),
              priceCurrency: 'DZD',
              availability: activeCourseAvailability,
              ...(!cohortClosed ? { validThrough: COHORT_DEADLINE_ISO } : {}),
              itemOffered: {
                '@type': 'Course',
                name: cohortClosed ? COURSE_NAMES[safeLocale].next : COURSE_NAMES[safeLocale].open,
                description: COURSE_DESCRIPTIONS[safeLocale],
                inLanguage: safeLocale,
                provider: {
                  '@id': organizationId,
                },
                hasCourseInstance: {
                  '@type': 'CourseInstance',
                  courseMode: 'Onsite',
                  instructor: {
                    '@id': instructorId,
                  },
                  location: {
                    '@type': 'Place',
                    name: SITE_NAME,
                    address: postalAddress,
                  },
                },
              },
            },
            {
              '@type': 'Offer',
              url: localizedUrl(safeLocale, 'mock-test'),
              price: String(mockPriceDzd),
              priceCurrency: 'DZD',
              availability: 'https://schema.org/InStock',
              itemOffered: {
                '@type': 'SoftwareApplication',
                name: MOCK_NAMES[safeLocale],
                description: MOCK_DESCRIPTIONS[safeLocale],
                applicationCategory: 'EducationalApplication',
                operatingSystem: 'Web browser',
                inLanguage: 'en',
                url: localizedUrl(safeLocale, 'mock-test'),
                provider: {
                  '@id': organizationId,
                },
                offers: {
                  '@type': 'Offer',
                  price: String(mockPriceDzd),
                  priceCurrency: 'DZD',
                  availability: 'https://schema.org/InStock',
                  url: localizedUrl(safeLocale, 'mock-test'),
                },
              },
            },
          ],
        },
        sameAs: [
          'https://www.facebook.com/profile.php?id=61591282143384',
          'https://www.instagram.com/ieltslab.oran/',
          'https://www.linkedin.com/company/ielts-lab-oran',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['en', 'fr', 'ar'],
        publisher: {
          '@id': organizationId,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, '\\u003c'),
      }}
    />
  );
}
