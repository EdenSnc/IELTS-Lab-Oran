import { getLocale } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import WaitlistUI from '@/components/WaitlistUI';

export async function generateMetadata() {
  return {
    title: 'Join the Waitlist | IELTS Lab Oran',
    description:
      "The founding cohort is full. Join the waitlist for the next IELTS Lab Oran session - Algeria's most rigorous computer-based IELTS prep program.",
    alternates: buildAlternates('waitlist'),
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistPage() {
  const locale = await getLocale();
  return <WaitlistUI locale={locale} />;
}
