'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { usePathname } from 'next/navigation';

function privatePath(pathname: string) {
  const path = pathname.replace(/^\/(?:en|fr|ar)(?=\/|$)/, '');
  return /^\/(?:admin|auth|account|speaking|attempts|checkout)(?:\/|$)/.test(path);
}

function publicEvent<Event extends { url: string }>(event: Event): Event | null {
  try {
    const url = new URL(event.url, window.location.origin);
    if (privatePath(url.pathname)) return null;
    url.searchParams.delete('il_scan');
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export default function PublicTelemetry() {
  const pathname = usePathname();
  if (privatePath(pathname)) return null;
  return <><Analytics beforeSend={publicEvent} /><SpeedInsights beforeSend={publicEvent} /></>;
}
