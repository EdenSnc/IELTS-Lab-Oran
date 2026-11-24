'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import AvailabilityPicker from '@/components/AvailabilityPicker';
import ConfirmAction, { type Confirmation } from './ConfirmAction';
import { founderDetailsSchema, type FounderDetails } from '@/lib/admin/application-record';
import { availabilityCopy, formatAvailabilityHour, weekdays, type AvailabilityWindow } from '@/lib/leads/availability';

export type InboxItem = {
  id: string;
  received: string;
  archived: boolean;
  poster?: string;
  details: FounderDetails;
  override: FounderDetails | null;
  notes?: string;
  facts: { label: string; value: string }[];
};

const empty: FounderDetails = { name: '', phone: '', email: null, notes: '', availability: null };
const fieldClass = 'min-h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-base';
const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold disabled:opacity-50';
const primaryClass = 'inline-flex min-h-11 items-center justify-center rounded-full bg-charcoal px-4 text-sm font-semibold text-white disabled:opacity-50';

function ApplicationEditor({ details, pending, onSave, onCancel }: {
  details: FounderDetails;
  pending: boolean;
  onSave: (details: FounderDetails) => void;
  onCancel: () => void;
}) {
  const [windows, setWindows] = useState<AvailabilityWindow[]>(details.availability?.mode === 'windows' ? details.availability.windows : []);
  const [flexible, setFlexible] = useState(details.availability?.mode === 'flexible');
  const [draft, setDraft] = useState(false);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft && !flexible) { setError('Add the time window or clear it before saving.'); return; }
    const f = new FormData(event.currentTarget);
    const parsed = founderDetailsSchema.safeParse({
      name: f.get('name'),
      phone: f.get('phone'),
      email: String(f.get('email') ?? '').trim() || null,
      notes: f.get('notes'),
      availability: flexible ? { mode: 'flexible' } : windows.length ? { mode: 'windows', windows } : null,
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.path[0] === 'phone' ? 'Check the WhatsApp number.' : 'Check the applicant details.'); return; }
    setError('');
    onSave(parsed.data);
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4 rounded-2xl bg-[#faf9f7] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Name<input name="name" defaultValue={details.name} required minLength={2} maxLength={120} className={fieldClass} /></label>
        <label className="grid gap-1 text-sm font-semibold">WhatsApp<input name="phone" type="tel" dir="ltr" defaultValue={details.phone} required maxLength={32} className={fieldClass} /></label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Email<input name="email" type="email" defaultValue={details.email ?? ''} maxLength={320} className={fieldClass} /></label>
      </div>
      <details className="rounded-xl border border-gray-200 bg-white px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Weekly availability</summary>
        <div className="space-y-3 pb-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-crimson" checked={flexible} onChange={(event) => { setFlexible(event.target.checked); setDraft(false); }} />
            Flexible schedule
          </label>
          {!flexible && <AvailabilityPicker locale="en" windows={windows} onChange={setWindows} onDraft={setDraft} />}
        </div>
      </details>
      <label className="grid gap-1 text-sm font-semibold">Private notes<textarea name="notes" defaultValue={details.notes} rows={2} maxLength={1500} className={`${fieldClass} py-2`} /></label>
      {error && <p role="alert" className="text-sm font-medium text-crimson">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={pending} className={primaryClass}>Save application</button>
        <button type="button" disabled={pending} onClick={onCancel} className={buttonClass}>Cancel</button>
      </div>
    </form>
  );
}

export default function ApplicationsInbox({ rows, archived }: { rows: InboxItem[]; archived: boolean }) {
  const router = useRouter();
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [status, setStatus] = useState('');
  const [undo, setUndo] = useState<Record<string, unknown>>();
  const [confirmation, setConfirmation] = useState<Confirmation>();

  async function save(payload: Record<string, unknown>, reversal?: Record<string, unknown>) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setStatus('');
    try {
      const response = await fetch('/api/staff/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403
        ? 'Sign in and complete two-step verification, then retry.' : 'The application could not be saved. Refresh before retrying.');
      setStatus(payload.archived === true ? 'Application moved to Trash.' : payload.archived === false ? 'Application restored.' : 'Application saved.');
      setEditing(undefined);
      setUndo(reversal);
      router.refresh();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Could not save the application.');
    } finally {
      setPending(false);
      saving.current = false;
    }
  }

  return (
    <div className="space-y-4">
      {!archived && editing !== 'new' && <button type="button" className={primaryClass} onClick={() => setEditing('new')}>+ Add application</button>}
      {editing === 'new' && <ApplicationEditor key="new" details={empty} pending={pending} onCancel={() => setEditing(undefined)} onSave={(details) => void save({ action: 'create', details })} />}
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm font-semibold text-crimson">{pending ? 'Saving…' : status}</p>
        {undo && <button type="button" className={buttonClass} disabled={pending} onClick={() => void save(undo)}>Undo</button>}
      </div>
      {!rows.length && <p className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600">{archived ? 'Trash is empty.' : 'Applications will appear here as they arrive.'}</p>}
      {rows.map((row) => (
        <details key={row.id} className="rounded-2xl border border-gray-200 bg-white">
          <summary className="cursor-pointer px-4 py-4 sm:px-5">
            <span className="font-bold">{row.details.name || row.details.phone}</span>
            <span className="ms-2 text-sm text-gray-600">{row.received}</span>
            {row.poster && <span className="ms-2 text-sm text-crimson">{row.poster}</span>}
          </summary>
          <div className="space-y-4 border-t border-gray-100 p-4 text-sm sm:p-5">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a href={`tel:${row.details.phone}`} dir="ltr" className="font-semibold text-crimson underline">{row.details.phone}</a>
              {row.details.email && <span className="break-all">{row.details.email}</span>}
            </div>
            <div>
              <h2 className="font-bold">Availability</h2>
              {row.details.availability?.mode === 'windows' ? <ul className="mt-1 flex flex-wrap gap-2">
                {row.details.availability.windows.map((slot, index) => (
                  <li key={index} className="rounded-lg bg-[#f5f4f1] px-2 py-1">{availabilityCopy.en.days[weekdays.indexOf(slot.day)]} {formatAvailabilityHour(slot.startHour)}–{formatAvailabilityHour(slot.endHour)}</li>
                ))}
              </ul> : <p className="mt-1 text-gray-600">{row.details.availability?.mode === 'flexible' ? 'Flexible schedule' : 'Awaiting availability'}</p>}
            </div>
            {row.facts.length > 0 && <dl className="grid gap-2 sm:grid-cols-2">{row.facts.map(({ label, value }) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-gray-700">{value}</dd></div>)}</dl>}
            {row.notes && <p className="whitespace-pre-wrap break-words text-gray-700">{row.notes}</p>}
            {row.details.notes && <p className="whitespace-pre-wrap break-words rounded-lg bg-[#f5f4f1] p-3">{row.details.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {!archived && editing !== row.id && <button type="button" className={buttonClass} onClick={() => setEditing(row.id)}>Edit application</button>}
              <button type="button" disabled={pending} className={`${buttonClass} ${row.archived ? '' : 'text-[#9c1e2c]'}`}
                onClick={() => {
                  const perform = () => void save({ action: 'archive', id: row.id, archived: !row.archived }, { action: 'archive', id: row.id, archived: row.archived });
                  if (row.archived) perform();
                  else setConfirmation({
                    title: 'Delete application?', detail: `The application for “${row.details.name || row.details.phone}” will move to Trash.`,
                    confirmLabel: 'Move to Trash', perform,
                  });
                }}>
                {row.archived ? 'Restore application' : 'Delete application'}
              </button>
            </div>
            {!archived && editing === row.id && <ApplicationEditor key={row.id} details={row.details} pending={pending}
              onCancel={() => setEditing(undefined)} onSave={(details) => void save({ action: 'edit', id: row.id, details }, { action: 'edit', id: row.id, details: row.override })} />}
          </div>
        </details>
      ))}
      <ConfirmAction action={confirmation} onDismiss={() => setConfirmation(undefined)} />
    </div>
  );
}
