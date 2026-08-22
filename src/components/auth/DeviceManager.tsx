'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type DeviceSlot = {
  id: string;
  slotNumber: number;
  label: string | null;
  enrolledAt: string;
  lastSeenAt: string;
};

export default function DeviceManager() {
  const [slots, setSlots] = useState<DeviceSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>();

  const load = useCallback(async () => {
    const response = await fetch('/api/devices');
    if (!response.ok) return;
    const payload = await response.json() as { slots: DeviceSlot[]; currentSlotId: string | null };
    setSlots(payload.slots);
    setCurrentSlotId(payload.currentSlotId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/devices')
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { slots: DeviceSlot[]; currentSlotId: string | null } | null) => {
        if (!cancelled && payload) {
          setSlots(payload.slots);
          setCurrentSlotId(payload.currentSlotId);
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function enroll() {
    setMessage(undefined);
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Browser' }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) setMessage(payload.error ?? 'Device enrollment failed.');
    await load();
  }

  async function replace(event: FormEvent<HTMLFormElement>, slotNumber: number) {
    event.preventDefault();
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/devices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotNumber,
        label: String(form.get('label') ?? 'Browser'),
        password: String(form.get('password') ?? ''),
      }),
    });
    const payload = await response.json() as { error?: string };
    setMessage(response.ok ? 'Trusted device replaced.' : (payload.error ?? 'Device replacement failed.'));
    if (response.ok) event.currentTarget.reset();
    await load();
  }

  return (
    <section className="mt-6 rounded-3xl border border-black/10 p-7">
      <h2 className="text-xl font-semibold">Trusted devices</h2>
      <p className="mt-2 text-sm text-black/60">You can use up to two trusted browser slots. A third slot is never added automatically.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[1, 2].map((slotNumber) => {
          const slot = slots.find((candidate) => candidate.slotNumber === slotNumber);
          return (
            <div key={slotNumber} className="rounded-2xl bg-black/[0.03] p-4">
              <p className="font-semibold">Slot {slotNumber}{slot?.id === currentSlotId ? ' · This browser' : ''}</p>
              <p className="mt-1 text-sm text-black/60">{slot?.label ?? 'Available'}</p>
              {slot && slot.id !== currentSlotId && (
                <form className="mt-4 grid gap-2" onSubmit={(event) => void replace(event, slotNumber)}>
                  <input name="label" aria-label={`New label for slot ${slotNumber}`} placeholder="Browser name" maxLength={80} required className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm" />
                  <input name="password" aria-label="Current password" type="password" placeholder="Current password" minLength={8} required className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm" />
                  <button className="rounded-full border border-black/20 px-3 py-2 text-sm font-semibold">Replace this slot</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
      {!currentSlotId && slots.length < 2 && (
        <button onClick={() => void enroll()} className="mt-5 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
          Trust this browser
        </button>
      )}
      {message && <p role="status" className="mt-4 text-sm text-black/70">{message}</p>}
    </section>
  );
}
