import { Suspense } from 'react';
import SpeakingBookingDashboard from '@/components/speaking/SpeakingBookingDashboard';
import { speakingConfig } from '@/lib/speaking/config';
import { localDateKey, zonedLocalToUtc } from '@/lib/speaking/scheduling';

export default function SpeakingPage() {
  const today = localDateKey(new Date(), speakingConfig.defaultTimezone);
  const tomorrowAtNoon = new Date(zonedLocalToUtc(today, 12 * 60, speakingConfig.defaultTimezone).getTime() + 86_400_000);
  const tomorrow = localDateKey(tomorrowAtNoon, speakingConfig.defaultTimezone);
  return <Suspense fallback={<main className="p-8">Loading Speaking appointments…</main>}><SpeakingBookingDashboard initialToday={today} initialDate={tomorrow} /></Suspense>;
}
