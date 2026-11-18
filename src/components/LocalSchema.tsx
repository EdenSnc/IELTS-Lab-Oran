import {
  COURSE_PRICE_DZD,
  SITE_URL,
  SITE_NAME,
  Locale,
  defaultOgImageUrl,
  localizedUrl,
} from '@/lib/seo';

const DESCRIPTIONS: Record<Locale, string> = {
  en: 'Small-group in-person IELTS preparation (8 seats) in Bir El Djir, Oran, plus online mock practice, with individual Writing and Speaking feedback.',
  fr: 'Préparation IELTS en présentiel en petit groupe (8 places) à Bir El Djir, Oran, et tests blancs en ligne, avec retours personnalisés en Writing et Speaking.',
  ar: 'التحضير الحضوري لاختبار IELTS ضمن مجموعة صغيرة من 8 مقاعد في بئر الجير، وهران، مع اختبارات تجريبية عبر الإنترنت وملاحظات فردية في الكتابة والمحادثة.',
};

const COURSE_NAMES: Record<Locale, string> = {
  en: 'First Cohort — IELTS Lab Oran',
  fr: 'Premier groupe — IELTS Lab Oran',
  ar: 'المجموعة الأولى — IELTS Lab Oran',
};

const COURSE_DESCRIPTIONS: Record<Locale, string> = {
  en: 'Approximately one month of intensive, small-group in-person IELTS preparation (8 seats) in Bir El Djir, Oran, covering all four skills with individual Writing and Speaking feedback.',
  fr: 'Environ un mois de préparation intensive à l’IELTS en présentiel en petit groupe de 8 places à Bir El Djir, Oran, couvrant les 4 compétences avec suivi individuel.',
  ar: 'حوالي شهر واحد من التحضير الحضوري المكثف لاختبار IELTS ضمن مجموعة صغيرة من 8 مقاعد في بئر الجير، وهران، يشمل المهارات الأربع مع تقييم فردي للكتابة والمحادثة.',
};

export default function LocalSchema({ locale = 'en' }: { locale?: Locale }) {
  const safeLocale: Locale = locale in DESCRIPTIONS ? locale : 'en';
  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        image: defaultOgImageUrl(),
        logo: `${SITE_URL}/logo_rounded.png`,
        description: DESCRIPTIONS[safeLocale],
        founder: {
          '@type': 'Person',
          name: 'Amine Senouci',
          alternateName: 'Mr. Senouci',
          jobTitle: 'Founder & Lead IELTS Instructor',
          url: localizedUrl(safeLocale),
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bir El Djir',
          addressRegion: 'Oran',
          addressCountry: 'DZ',
        },
        areaServed: [
          {
            '@type': 'City',
            name: 'Oran',
          },
          {
            '@type': 'Country',
            name: 'Algeria',
          },
        ],
        email: 'ieltslab.oran@gmail.com',
        telephone: '+213780343103',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'IELTS Preparation Courses',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Course',
                name: COURSE_NAMES[safeLocale],
                description: COURSE_DESCRIPTIONS[safeLocale],
                inLanguage: safeLocale,
                provider: {
                  '@type': 'EducationalOrganization',
                  '@id': organizationId,
                  name: SITE_NAME,
                  url: SITE_URL,
                },
                hasCourseInstance: {
                  '@type': 'CourseInstance',
                  courseMode: 'Onsite',
                  location: {
                    '@type': 'Place',
                    name: 'IELTS Lab Oran',
                    address: {
                      '@type': 'PostalAddress',
                      addressLocality: 'Bir El Djir',
                      addressRegion: 'Oran',
                      addressCountry: 'DZ',
                    },
                  },
                },
              },
              price: String(COURSE_PRICE_DZD),
              priceCurrency: 'DZD',
              availability: 'https://schema.org/LimitedAvailability',
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
