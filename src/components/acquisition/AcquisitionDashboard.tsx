'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

export default function AcquisitionDashboard({ locale, campaigns }: { locale: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const busy = saving || refreshing;
  const [message, setMessage] = useState('');

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

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 text-neutral-900">
      <div>
        <a className="text-sm text-blue-700 underline" href={`/${locale}/account`}>← Account</a>
        <h1 className="mt-3 text-3xl font-semibold">Acquisition placements</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">Create a link for each physical or partner placement, print its QR code, retarget destinations dynamically, and record on-site checks. Link requests exclude known crawlers but can include repeat visits and other bots. Internal lead submissions count forms carrying this code.</p>
      </div>
      <p role="status" className="min-h-6 text-sm text-blue-800">{saving ? 'Saving…' : refreshing ? 'Refreshing…' : message}</p>
      <form className="flex flex-wrap items-end gap-3 rounded-xl border p-4" onSubmit={(event) => {
        event.preventDefault();
        void save({ action: 'campaign', name: field(event.currentTarget, 'name'), slug: field(event.currentTarget, 'slug') }, event.currentTarget);
      }}>
        <label className="grid gap-1 text-sm">Campaign name<input name="name" required minLength={2} maxLength={120} className="rounded border px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="oran-posters" className="rounded border px-3 py-2" /></label>
        <button disabled={busy} className="rounded bg-blue-800 px-4 py-2 text-sm text-white disabled:opacity-50">Add campaign</button>
      </form>
      {campaigns.length === 0 && <p className="rounded-xl border p-5 text-neutral-600">No campaigns yet.</p>}
      {campaigns.map((campaign) => <section key={campaign.id} className="space-y-4 rounded-xl border p-5">
        <div><h2 className="text-xl font-semibold">{campaign.name}</h2><p className="text-xs text-neutral-500">{campaign.slug}</p></div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          void save({ action: 'placement', campaignId: campaign.id, label: field(event.currentTarget, 'label'), medium: field(event.currentTarget, 'medium'), destination: field(event.currentTarget, 'destination') }, event.currentTarget);
        }}>
          <label className="grid gap-1 text-sm">Placement label<input name="label" required minLength={2} maxLength={120} placeholder="Library entrance" className="rounded border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Medium<select name="medium" className="rounded border px-3 py-2"><option value="poster">Poster</option><option value="flyer">Flyer</option><option value="card">Card</option><option value="partner">Partner</option><option value="social">Social</option></select></label>
          <label className="grid gap-1 text-sm">Destination<select name="destination" defaultValue="/fr#intake" className="rounded border px-3 py-2">{DESTINATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
          <button disabled={busy} className="rounded bg-blue-800 px-4 py-2 text-sm text-white disabled:opacity-50">Add placement</button>
        </form>
        {campaign.placements.length === 0 && <p className="text-sm text-neutral-500">No placements yet.</p>}
        <div className="grid gap-4 lg:grid-cols-2">{campaign.placements.map((placement) => <article key={placement.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{placement.label}</h3>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${placement.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{placement.active ? 'Active' : 'Paused'}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save({
                  action: 'update_placement',
                  placementId: placement.id,
                  destination: placement.destination,
                  active: !placement.active,
                })}
                className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
              >
                {placement.active ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
          <p className="text-sm text-neutral-600">{placement.medium} · {placement.destination}</p>
          {/* QR data comes from the server-side encoder, never from user HTML. */}
          <Image unoptimized src={placement.qrDataUrl} width={240} height={240} alt={`QR code for ${placement.label}`} className="my-3 border" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <a href={placement.url} className="break-all text-blue-700 underline">{placement.url}</a>
            <a href={placement.qrDataUrl} download={`ieltslab-${placement.code}.png`} className="font-medium text-crimson underline">Download QR</a>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded bg-neutral-100 p-3"><strong className="block text-xl">{placement.redirectRequests}</strong>{placement.firstParty ? 'Landing redirect requests' : 'Outbound link requests'}</div><div className="rounded bg-neutral-100 p-3"><strong className="block text-xl">{placement.leadSubmissions ?? '—'}</strong>{placement.firstParty ? 'Matching-code lead submissions' : 'External form/social outcomes unavailable'}</div></div>
          <form className="mt-4 flex flex-wrap items-end gap-2 border-t pt-3" onSubmit={(event) => {
            event.preventDefault();
            void save({ action: 'update_placement', placementId: placement.id, destination: field(event.currentTarget, 'destination') });
          }}>
            <label className="grid flex-1 gap-1 text-xs">Retarget destination<select name="destination" defaultValue={placement.destination === LEGACY_AVAILABILITY_DESTINATION ? FORM_DESTINATION : placement.destination} className="rounded border px-2 py-2">{DESTINATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
            <button disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Update</button>
          </form>
          <p className="mt-3 text-xs text-neutral-600">Last on-site check: {placement.lastInspection ? `${placement.lastInspection.status} · ${new Date(placement.lastInspection.checkedAt).toLocaleString()}${placement.lastInspection.note ? ` · ${placement.lastInspection.note}` : ''}` : 'none recorded'}</p>
          <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            void save({ action: 'inspection', placementId: placement.id, status: field(event.currentTarget, 'status'), note: field(event.currentTarget, 'note') }, event.currentTarget);
          }}>
            <label className="grid gap-1 text-xs">Status<select name="status" className="rounded border px-2 py-2"><option value="present">Present</option><option value="missing">Missing</option><option value="damaged">Damaged</option><option value="unknown">Unknown</option></select></label>
            <label className="grid gap-1 text-xs">Note<input name="note" maxLength={300} className="rounded border px-2 py-2" /></label>
            <button disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Record check</button>
          </form>
        </article>)}</div>
      </section>)}
    </main>
  );
}
