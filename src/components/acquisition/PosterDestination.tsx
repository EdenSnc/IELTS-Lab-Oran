'use client';

import { useRef, useState } from 'react';
import { DESTINATION_OPTIONS, destinationOptionValue } from '@/lib/acquisition/validation';
import ConfirmAction, { type Confirmation } from '@/components/admin/ConfirmAction';

export default function PosterDestination({ placementId, destination }: { placementId: string; destination: string }) {
  const [saved, setSaved] = useState(destination);
  const [draft, setDraft] = useState(destinationOptionValue(destination));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Confirmation>();
  const pending = useRef(false);
  const current = destinationOptionValue(saved);
  const currentLabel = DESTINATION_OPTIONS.find(({ value }) => value === current)?.label ?? current;
  const draftLabel = DESTINATION_OPTIONS.find(({ value }) => value === draft)?.label ?? draft;

  async function save() {
    if (pending.current || draft === current) return;
    pending.current = true;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const response = await fetch('/api/staff/acquisition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_placement', placementId, destination: draft, expectedDestination: saved }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'The destination changed elsewhere. Reopen the poster before editing it.'
        : response.status === 401 || response.status === 403 ? 'Sign in again to change this QR destination.' : 'Could not save the destination. Try again.');
      setSaved(draft);
      setStatus('QR destination updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the destination.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details id="qr-destination" className="rounded-2xl border border-stone-200 bg-white px-4">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">QR destination <span className="ms-2 text-stone-600">· {currentLabel}</span></summary>
      <form className="flex flex-wrap items-end gap-3 border-t border-stone-100 py-3" onSubmit={(event) => {
        event.preventDefault();
        if (draft !== current && !pending.current) setConfirm({
          title: 'Change QR destination?',
          detail: `Every copy with this QR will open ${draftLabel}. The printed code and scan history stay the same.`,
          confirmLabel: 'Change destination',
          perform: () => void save(),
        });
      }}>
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">Opens when scanned
          <select disabled={busy} value={draft} onChange={(event) => { setDraft(event.target.value); setStatus(''); setError(''); }}
            className="min-h-11 min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-base">
            {!DESTINATION_OPTIONS.some(({ value }) => value === current) && <option value={current}>{current}</option>}
            {DESTINATION_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button disabled={busy || draft === current} className="min-h-11 rounded-full bg-charcoal px-4 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Save destination'}
        </button>
        <div className="w-full empty:hidden" role="status">{status && <p className="text-sm font-semibold text-emerald-800">{status}</p>}</div>
        {error && <p className="w-full text-sm text-[#8e1826]" role="alert">{error}</p>}
      </form>
      <ConfirmAction action={confirm} onDismiss={() => setConfirm(undefined)} />
    </details>
  );
}
