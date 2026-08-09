import { getLocale } from 'next-intl/server';
import { buildAlternates, Locale } from '@/lib/seo';
import WaitlistUI from '@/components/WaitlistUI';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return {
    title: 'Join the Waitlist | IELTS Lab Oran',
    description:
      'The founding cohort is full. Join the waitlist for the next rigorous, computer-based IELTS Lab Oran preparation program.',
    alternates: buildAlternates(locale, 'waitlist'),
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistPage() {
  const locale = await getLocale();
  return <WaitlistUI locale={locale} />;
}
