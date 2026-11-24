'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const key = 'ieltslab-founder-guide-dismissed';

export default function FounderQuickStart({ locale }: { locale: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setHidden(localStorage.getItem(key) === 'yes'); } catch { /* Storage may be unavailable. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  if (hidden) return null;
  return (
    <section aria-label="Quick start" className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Quick start</h2>
        <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100" onClick={() => {
          setHidden(true);
          try { localStorage.setItem(key, 'yes'); } catch { /* The guide is hidden for this visit. */ }
        }}>Dismiss</button>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">Add a poster placement, use its QR and review the applications it brings in.</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-crimson">
        <Link href={`/${locale}/admin/acquisition`} className="inline-flex min-h-11 items-center underline">Set up a placement</Link>
        <Link href={`/${locale}/admin/applications`} className="inline-flex min-h-11 items-center underline">Review applications</Link>
      </div>
    </section>
  );
}
