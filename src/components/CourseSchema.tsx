import { SITE_URL, SITE_NAME } from '@/lib/seo';

/**
 * Injects structured data (JSON-LD) into <head> for:
 * Course List Carousel - enables rich results for multiple courses/programs
 *
 * This explicitly satisfies Google's "Course List" schema guidelines.
 */
export default function CourseSchema() {
  const courseList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Course',
          url: `${SITE_URL}/#intake`,
          name: 'IELTS Success Program - Founding Cohort',
          description: '32-hour intensive, computer-based IELTS preparation program in a dedicated 8-seat PC lab. Diagnostic targeting, criteria mastery, and certified instruction.',
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
              }
            }
          }
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(courseList) }}
    />
  );
}
