'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

type Scan = { id: string; scannedAt: string; placementLabel: string; inquiry: { id: string; archivedAt: string | null } | null };
const oranTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Africa/Algiers' });

export default function PlacementScans({ locale, code, label }: { locale: string; code: string; label: string }) {
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [scans, setScans] = useState<Scan[]>();
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function read(before?: string) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ code, ...(before ? { before } : {}) });
      const response = await fetch(`/api/staff/acquisition/scans?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load scan history.');
      const result = await response.json() as { scans: Scan[]; next: string | null };
      setScans((current) => before ? [...(current ?? []), ...result.scans] : result.scans);
      setNext(result.next);
    } catch {
      setError('Could not load scan history. Try again.');
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }
  return <details className="border-t border-stone-200" onToggle={(event) => {
    if (event.currentTarget.open && !scans && !error) void read();
  }}>
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Individual scans</summary>
    <p className="mb-2 text-xs text-stone-600">Oran time. Older scans are included in the totals above.</p>
    {error && <p role="alert" className="mb-2 text-sm text-[#8e1826]">{error}</p>}
    {scans?.length === 0 && <p className="text-sm text-stone-600">No individual scans recorded yet.</p>}
    {scans && scans.length > 0 && <ul className="divide-y divide-stone-200">
      {scans.map((scan) => <li key={scan.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <div><time dateTime={scan.scannedAt}>{oranTime.format(new Date(scan.scannedAt))}</time>
          {scan.placementLabel !== label && <p className="text-xs text-stone-600">{scan.placementLabel}</p>}</div>
        {scan.inquiry
          ? <Link className="inline-flex min-h-11 items-center font-semibold text-[#8e1826] underline"
            href={`/${locale}/admin/applications?id=${scan.inquiry.id}${scan.inquiry.archivedAt ? '&view=archived' : ''}`}>View submission</Link>
          : <span className="text-stone-600">No linked submission</span>}
      </li>)}
    </ul>}
    {loading ? <p role="status" className="text-sm text-stone-600">Loading scans…</p>
      : (next || error) && <button type="button" className="min-h-11 text-sm font-semibold text-[#8e1826]"
        onClick={() => void read(next ?? undefined)}>{error ? 'Retry' : 'Load older scans'}</button>}
  </details>;
}
