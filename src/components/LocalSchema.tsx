import { COURSE_PRICE_DZD, SITE_URL, SITE_NAME } from '@/lib/seo';

/**
 * Injects structured data (JSON-LD) into <head> for:
 * 1. LocalBusiness - helps Google Surface the lab in local search results
 * 2. Course offer - describes the IELTS preparation offering
 *
 * Uses real data only. Coordinates omitted (not verified).
 * TODO: Add telephone once a public number is decided.
 */
export default function LocalSchema() {
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'A rigorous computer-based IELTS preparation course in an 8-seat physical PC lab in Bir El Djir, Oran, with practice designed around the computer-delivered format.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bir El Djir',
      addressRegion: 'Oran',
      addressCountry: 'DZ',
    },
    areaServed: {
      '@type': 'City',
      name: 'Oran',
    },
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
            name: 'Founding Cohort - IELTS Lab Oran',
            description:
              '32-hour intensive, computer-based IELTS preparation program in a dedicated 8-seat PC lab, with diagnostic targeting and criteria-based instruction.',
            provider: {
              '@type': 'EducationalOrganization',
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(localBusiness).replace(/</g, '\\u003c'),
      }}
    />
  );
}
