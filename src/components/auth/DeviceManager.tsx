'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type DeviceSlot = {
  id: string;
  slotNumber: number;
  label: string | null;
  enrolledAt: string;
  lastSeenAt: string;
  lastReplacedAt: string | null;
};

type DevicePayload = { slots: DeviceSlot[]; currentSlotId: string | null };

export default function DeviceManager({
  autoEnrollEligible,
  onTrustChange,
}: {
  autoEnrollEligible: boolean;
  onTrustChange?: (trusted: boolean) => void;
}) {
  const [slots, setSlots] = useState<DeviceSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>();
  const attemptedAutomaticEnrollment = useRef(false);

  const applyPayload = useCallback((payload: DevicePayload) => {
    setSlots(payload.slots);
    setCurrentSlotId(payload.currentSlotId);
    onTrustChange?.(Boolean(payload.currentSlotId));
  }, [onTrustChange]);

  const fetchPayload = useCallback(async () => {
    const response = await fetch('/api/devices', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return response.json() as Promise<DevicePayload>;
  }, []);

  const load = useCallback(async (allowAutomaticEnrollment = true) => {
    const payload = await fetchPayload();
    if (!payload) {
      setLoading(false);
      onTrustChange?.(false);
      return;
    }
    applyPayload(payload);

    if (
      allowAutomaticEnrollment
      && autoEnrollEligible
      && payload.slots.length === 0
      && !payload.currentSlotId
      && !attemptedAutomaticEnrollment.current
    ) {
      attemptedAutomaticEnrollment.current = true;
      const enrollment = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Primary browser', automatic: true }),
      });
      if (!enrollment.ok && enrollment.status !== 409) {
        const result = await enrollment.json() as { error?: string };
        setMessage(result.error ?? 'Automatic device setup failed.');
      }
      const refreshed = await fetchPayload();
      if (refreshed) applyPayload(refreshed);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [applyPayload, autoEnrollEligible, fetchPayload, onTrustChange]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      void load().catch(() => {
        if (active) {
          setLoading(false);
          onTrustChange?.(false);
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [load, onTrustChange]);

  async function enroll() {
    setMessage(undefined);
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Secondary browser' }),
    });
    const payload = await response.json() as { error?: string };
    setMessage(response.ok ? 'This browser is now trusted.' : (payload.error ?? 'Device enrollment failed.'));
    await load(false);
  }

  async function replace(event: FormEvent<HTMLFormElement>, slotNumber: number) {
    event.preventDefault();
    setMessage(undefined);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
    setMessage(response.ok ? 'Trusted device replaced. The previous browser immediately lost test access.' : (payload.error ?? 'Device replacement failed.'));
    if (response.ok) formElement.reset();
    await load(false);
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.35)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">Security</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Trusted test devices</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
        {autoEnrollEligible
          ? 'Your first browser is registered automatically when paid test access becomes active. A second browser requires your confirmation.'
          : 'No device slot is used while your account has no active test access. Your first browser will be registered automatically after access is added.'}
      </p>

      {loading ? (
        <p className="mt-5 rounded-2xl bg-black/[0.025] p-5 text-sm text-black/50">Checking secure access…</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[1, 2].map((slotNumber) => {
            const slot = slots.find((candidate) => candidate.slotNumber === slotNumber);
            return (
              <div key={slotNumber} className="rounded-2xl bg-black/[0.025] p-5">
                <p className="font-semibold">Device {slotNumber}{slot?.id === currentSlotId ? ' · This browser' : ''}</p>
                <p className="mt-1 text-sm text-black/50">{slot?.label ?? 'Available after test access is active'}</p>
                {slot && slot.id !== currentSlotId && (
                  <form className="mt-4 grid gap-2" onSubmit={(event) => void replace(event, slotNumber)}>
                    <input name="label" aria-label={`New label for device ${slotNumber}`} placeholder="New browser name" maxLength={80} required className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm" />
                    <input name="password" aria-label="Current password" type="password" autoComplete="current-password" placeholder="Current password" minLength={8} required className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm" />
                    <button className="rounded-full border border-black/15 px-3 py-2 text-sm font-semibold transition hover:border-black/25 hover:bg-white">Replace this device</button>
                    <p className="text-xs leading-5 text-black/40">Replacement immediately revokes this slot’s old test-access token. Each slot can be replaced once every seven days.</p>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && autoEnrollEligible && !currentSlotId && slots.length === 1 && (
        <button onClick={() => void enroll()} className="mt-5 rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson">
          Trust this as my second browser
        </button>
      )}
      {!loading && currentSlotId && <p className="mt-4 text-sm font-medium text-emerald-700">This browser can access your protected tests and results.</p>}
      {message && <p role="status" className="mt-4 text-sm text-black/70">{message}</p>}
    </section>
  );
}
