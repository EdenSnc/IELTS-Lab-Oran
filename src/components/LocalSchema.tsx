import { SITE_URL, SITE_NAME } from '@/lib/seo';

/**
 * Injects structured data (JSON-LD) into <head> for:
 * 1. LocalBusiness — helps Google Surface the lab in local search results
 * 2. Course — enables rich results for the IELTS preparation offering
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
      "Algeria's most rigorous computer-based IELTS preparation course. An 8-seat physical PC lab in Bir El Djir, Oran, replicating the official computer-delivered test environment.",
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
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'IELTS Preparation Courses',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Course',
            name: 'Founding Cohort — IELTS Lab Oran',
            description:
              '32-hour intensive, computer-based IELTS preparation program in a dedicated 8-seat PC lab. Diagnostic targeting, criteria mastery, and certified instruction.',
            provider: {
              '@type': 'EducationalOrganization',
              name: SITE_NAME,
              url: SITE_URL,
            },
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'Blended',
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
          price: '32000',
          priceCurrency: 'DZD',
          availability: 'https://schema.org/LimitedAvailability',
        },
      ],
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
    />
  );
}
