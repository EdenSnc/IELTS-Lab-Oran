'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AdminNav from './AdminNav';
import { useRef, useState, useTransition } from 'react';
import { FORM_DESTINATION, INTERNAL_DESTINATIONS, LEGACY_AVAILABILITY_DESTINATION } from '@/lib/acquisition/validation';

type Placement = {
  id: string;
  code: string;
  label: string;
  medium: string;
  destination: string;
  active: boolean;
  firstParty: boolean;
  url: string;
  qrDataUrl: string;
  redirectRequests: number;
  leadSubmissions: number | null;
  lastInspection: { status: string; note: string | null; checkedAt: string } | null;
};
type Campaign = { id: string; name: string; slug: string; placements: Placement[] };

const DESTINATION_OPTIONS = [
  ...INTERNAL_DESTINATIONS.map((path) => ({ value: path, label: path })),
  { value: 'instagram', label: 'Official Instagram profile' },
  { value: 'facebook', label: 'Official Facebook profile' },
];

export default function AcquisitionDashboard({ locale, campaigns, canViewApplications }: { locale: string; campaigns: Campaign[]; canViewApplications: boolean }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const busy = saving || refreshing;
  const [message, setMessage] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [search, setSearch] = useState('');

  async function save(data: Record<string, unknown>, form?: HTMLFormElement) {
    if (savingRef.current || refreshing) return;
    savingRef.current = true;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Save failed');
      form?.reset();
      setMessage('Saved.');
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const field = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? '');

  const selected = campaigns.filter((campaign) => !campaignFilter || campaign.id === campaignFilter);
  const all = campaigns.flatMap((campaign) => campaign.placements);
  const totalScans = all.reduce((sum, placement) => sum + placement.redirectRequests, 0);
  const totalApplications = all.reduce((sum, placement) => sum + (placement.leadSubmissions ?? 0), 0);
  const fieldStyle = 'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm';
  const actionStyle = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold hover:border-crimson';
  const submitStyle = 'min-h-11 rounded-lg bg-charcoal px-4 text-sm font-semibold text-white disabled:opacity-50';

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Link copied.');
    } catch {
      setMessage('Copy the URL under Manage placement.');
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 text-charcoal sm:px-6">
      {canViewApplications ? <AdminNav active="posters" locale={locale} /> : (
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-crimson underline" href={`/${locale}/account`}>Your account</Link>
      )}
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Posters & tracking</h1>
      </header>
      <dl className="grid grid-cols-3 gap-2">
        {([
          ['Active links', all.filter((placement) => placement.active).length],
          ['Link opens', totalScans],
          ['Applications', totalApplications],
        ] as const).map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <dt className="text-xs font-semibold text-gray-600 sm:text-sm">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums text-crimson">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="grid gap-1 text-sm font-semibold">Campaign
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className={fieldStyle}>
            <option value="">All campaigns</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Find a placement
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or QR code" className={fieldStyle} />
        </label>
      </div>

      <details className="rounded-xl border border-gray-200 bg-white px-4">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">New campaign</summary>
        <form className="grid gap-3 border-t border-gray-100 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => {
          event.preventDefault();
          void save({ action: 'campaign', name: field(event.currentTarget, 'name'), slug: field(event.currentTarget, 'slug') }, event.currentTarget);
        }}>
          <label className="grid gap-1 text-sm">Campaign name<input name="name" required minLength={2} maxLength={120} className={fieldStyle} /></label>
          <label className="grid gap-1 text-sm">Campaign identifier<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="oran-posters" className={fieldStyle} /></label>
          <button disabled={busy} className={submitStyle}>Add campaign</button>
        </form>
      </details>

      <p role="status" className="text-sm font-semibold text-crimson">{saving ? 'Saving…' : refreshing ? 'Refreshing…' : message}</p>
      {campaigns.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-5 text-gray-600">Add a campaign to create your first link.</p>}
      {selected.map((campaign) => {
        const term = search.trim().toLowerCase();
        const visible = campaign.placements.filter((placement) => `${placement.label} ${placement.code}`.toLowerCase().includes(term));
        if (term && visible.length === 0) return null;
        return (
          <section key={campaign.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <span className="text-sm text-gray-600">{visible.length} placements</span>
            </div>
            <details className="rounded-xl border border-gray-200 bg-white px-4">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">New placement</summary>
              <form className="grid gap-3 border-t border-gray-100 py-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end" onSubmit={(event) => {
                event.preventDefault();
                void save({ action: 'placement', campaignId: campaign.id, label: field(event.currentTarget, 'label'), medium: field(event.currentTarget, 'medium'), destination: field(event.currentTarget, 'destination') }, event.currentTarget);
              }}>
                <label className="grid gap-1 text-sm">Placement name<input name="label" required minLength={2} maxLength={120} placeholder="Library entrance" className={fieldStyle} /></label>
                <label className="grid gap-1 text-sm">Medium<select name="medium" className={fieldStyle}><option value="poster">Poster</option><option value="flyer">Flyer</option><option value="card">Card</option><option value="partner">Partner</option><option value="social">Social</option></select></label>
                <label className="grid gap-1 text-sm">Destination<select name="destination" defaultValue={FORM_DESTINATION} className={fieldStyle}>{DESTINATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                <button disabled={busy} className={submitStyle}>Add placement</button>
              </form>
            </details>
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map((placement) => {
                const destination = placement.destination === LEGACY_AVAILABILITY_DESTINATION ? FORM_DESTINATION : placement.destination;
                return (
                  <article key={placement.id} className="min-w-0 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${placement.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{placement.active ? 'Active' : 'Paused'}</span>
                        <h3 className="mt-2 break-words font-bold">{placement.label}</h3>
                        <p className="mt-1 break-all text-xs text-gray-600">{placement.medium} · {placement.code}</p>
                      </div>
                      <Image unoptimized src={placement.qrDataUrl} width={76} height={76} alt={`QR for ${placement.label}`} className="shrink-0 rounded-lg border border-gray-100" />
                    </div>
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                      <div><dt className="text-xs text-gray-600">Link opens</dt><dd className="text-xl font-bold tabular-nums">{placement.redirectRequests}</dd></div>
                      <div><dt className="text-xs text-gray-600">Applications</dt><dd className="text-xl font-bold tabular-nums">{placement.leadSubmissions ?? '—'}</dd></div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      <a href={placement.qrDataUrl} download={`ieltslab-${placement.code}.png`} className={actionStyle}>Download QR</a>
                      <button type="button" onClick={() => void copyLink(placement.url)} className={actionStyle}>Copy link</button>
                      {canViewApplications && placement.firstParty && (
                        <Link href={`/${locale}/admin/applications?placement=${encodeURIComponent(placement.code)}`} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-crimson underline">View applications</Link>
                      )}
                    </div>
                    <details className="border-t border-gray-200">
                      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Manage placement</summary>
                      <a href={placement.url} className="break-all text-sm text-crimson underline">{placement.url}</a>
                      <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(event) => {
                        event.preventDefault();
                        void save({ action: 'update_placement', placementId: placement.id, destination: field(event.currentTarget, 'destination') });
                      }}>
                        <label className="grid gap-1 text-sm">Destination<select name="destination" defaultValue={destination} className={fieldStyle}>{DESTINATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                        <button disabled={busy} className={actionStyle}>Update link</button>
                      </form>
                      <button type="button" disabled={busy} className={`${actionStyle} mt-2`} onClick={() => void save({ action: 'update_placement', placementId: placement.id, destination, active: !placement.active })}>{placement.active ? 'Pause this link' : 'Resume this link'}</button>
                      <p className="mt-4 break-words text-sm text-gray-600">Last check · {placement.lastInspection ? `${placement.lastInspection.status} · ${new Date(placement.lastInspection.checkedAt).toLocaleDateString()}${placement.lastInspection.note ? ` · ${placement.lastInspection.note}` : ''}` : 'Pending'}</p>
                      <form className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end" onSubmit={(event) => {
                        event.preventDefault();
                        void save({ action: 'inspection', placementId: placement.id, status: field(event.currentTarget, 'status'), note: field(event.currentTarget, 'note') }, event.currentTarget);
                      }}>
                        <label className="grid gap-1 text-sm">Status<select name="status" className={fieldStyle}><option value="present">Present</option><option value="missing">Missing</option><option value="damaged">Damaged</option><option value="unknown">Unknown</option></select></label>
                        <label className="grid gap-1 text-sm">Note<input name="note" maxLength={300} className={fieldStyle} /></label>
                        <button disabled={busy} className={actionStyle}>Save check</button>
                      </form>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      {search.trim() && !selected.some((campaign) => campaign.placements.some((placement) => `${placement.label} ${placement.code}`.toLowerCase().includes(search.trim().toLowerCase()))) && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600">No placements match your search.</p>
      )}
      <p className="text-xs leading-relaxed text-gray-600">Link opens can include repeat visits. Applications count website submissions carrying the placement code.</p>
    </main>
  );
}
