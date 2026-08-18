'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { speakingApi } from '@/lib/speaking/client-api';

type Mode = 'ONLINE' | 'IN_PERSON';
type Slot = { startAt: string; endAt: string; timezone: string };
type AvailableDate = { date: string; slotCount: number; firstStartAt: string };
type Attempt = { id: string; createdAt: string; submittedAt: string | null; blueprint: { name: string; version: number } };
type Appointment = {
  id: string; status: string; scheduledStartAt: string; scheduledEndAt: string; deliveryMode: Mode;
  attempt: { blueprint: { name: string; version: number } };
  session: { id: string; state: string } | null;
};
type BookingConfig = { timezone: string; slotMinutes: number; centreName: string; centreAddress: string };

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function offsetDateKey(base: string, days: number) {
  const value = new Date(`${base}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDateKey(value);
}

function dateKeyInTimezone(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export default function SpeakingBookingDashboard({ initialToday, initialDate }: { initialToday: string; initialDate: string }) {
  const search = useSearchParams();
  const queryAttemptId = search.get('attemptId') ?? '';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [eligibleAttempts, setEligibleAttempts] = useState<Attempt[]>([]);
  const [attemptId, setAttemptId] = useState(queryAttemptId);
  const [booking, setBooking] = useState<BookingConfig>({ timezone: 'Africa/Algiers', slotMinutes: 20, centreName: 'IELTS Lab Oran centre', centreAddress: 'Oran, Algeria' });
  const [mode, setMode] = useState<Mode>('ONLINE');
  const minimumDate = initialToday;
  const maximumDate = useMemo(() => offsetDateKey(initialToday, 90), [initialToday]);
  const [date, setDate] = useState('');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [visibleDateCount, setVisibleDateCount] = useState(8);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const learnerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const refresh = useCallback(async () => {
    const data = await speakingApi<{ appointments: Appointment[]; eligibleAttempts: Attempt[]; booking: BookingConfig }>('/api/speaking/appointments');
    setAppointments(data.appointments);
    setEligibleAttempts(data.eligibleAttempts);
    setBooking(data.booking);
    setAttemptId((current) => current || queryAttemptId || data.eligibleAttempts[0]?.id || '');
  }, [queryAttemptId]);

  useEffect(() => {
    const id = window.setTimeout(() => void refresh().catch((error) => setMessage(error.message)), 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    void speakingApi<{ availableDates: AvailableDate[] }>(`/api/speaking/slots?from=${minimumDate}&to=${maximumDate}&mode=${mode}`)
      .then((data) => {
        if (!active) return;
        setAvailableDates(data.availableDates);
        setVisibleDateCount(8);
        setDate((current) => data.availableDates.some((item) => item.date === current) ? current : (data.availableDates[0]?.date ?? ''));
      })
      .catch((error) => {
        if (!active) return;
        setAvailableDates([]);
        setDate('');
        setMessage(error.message);
      })
      .finally(() => { if (active) setLoadingDates(false); });
    return () => { active = false; };
  }, [availabilityRevision, maximumDate, minimumDate, mode]);

  useEffect(() => {
    if (!date) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingSlots(true);
      void speakingApi<{ slots: Slot[] }>(`/api/speaking/slots?date=${date}&mode=${mode}`)
        .then((data) => { if (active) setSlots(data.slots); })
        .catch((error) => { if (active) { setSlots([]); setMessage(error.message); } })
        .finally(() => { if (active) setLoadingSlots(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [date, mode]);

  async function confirmSlot() {
    if (!selectedSlot) return;
    if (!rescheduleId && !attemptId) return setMessage('No eligible completed test attempt was found.');
    setSaving(true);
    setMessage(rescheduleId ? 'Rescheduling appointment…' : 'Reserving appointment…');
    try {
      if (rescheduleId) {
        await speakingApi(`/api/speaking/appointments/${rescheduleId}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'reschedule', startAt: selectedSlot.startAt, learnerTimezone, deliveryMode: mode }),
        });
      } else {
        await speakingApi('/api/speaking/appointments', {
          method: 'POST',
          body: JSON.stringify({ attemptId, startAt: selectedSlot.startAt, learnerTimezone, deliveryMode: mode }),
        });
      }
      setMessage(rescheduleId ? 'Appointment rescheduled.' : 'Appointment confirmed.');
      setRescheduleId(null);
      setSelectedSlot(null);
      await refresh();
      invalidateAvailability();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Booking failed'); }
    finally { setSaving(false); }
  }

  async function cancel(id: string) {
    if (!window.confirm('Cancel this Speaking appointment?')) return;
    try {
      await speakingApi(`/api/speaking/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) });
      setMessage('Appointment cancelled.');
      if (rescheduleId === id) setRescheduleId(null);
      await refresh();
      invalidateAvailability();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Cancellation failed'); }
  }

  function chooseMode(value: Mode) {
    if (value === mode) return;
    setLoadingDates(true);
    setAvailableDates([]);
    setDate('');
    setSlots([]);
    setSelectedSlot(null);
    setMode(value);
  }

  function invalidateAvailability() {
    setLoadingDates(true);
    setAvailableDates([]);
    setDate('');
    setSlots([]);
    setSelectedSlot(null);
    setAvailabilityRevision((revision) => revision + 1);
  }

  function startReschedule(appointment: Appointment) {
    setRescheduleId(appointment.id);
    const modeChanged = appointment.deliveryMode !== mode;
    chooseMode(appointment.deliveryMode);
    const existingDate = dateKeyInTimezone(new Date(appointment.scheduledStartAt), booking.timezone);
    const nextDate = existingDate >= minimumDate ? existingDate : initialDate;
    setDate(modeChanged ? '' : (availableDates.some((item) => item.date === nextDate) ? nextDate : (availableDates[0]?.date ?? '')));
    setSelectedSlot(null);
    setMessage('Choose a new date and available time slot.');
    document.getElementById('speaking-slot-picker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const appointmentFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', timeZone: booking.timezone });
  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: booking.timezone });
  const activeAppointments = appointments.filter((item) => item.status === 'BOOKED');

  return <main className="speaking-premium-shell">
    <header className="speaking-premium-header px-4 py-3 sm:px-7"><TestBrand responsive href="/en" /></header>
    <div className="speaking-premium-container max-w-6xl">
      <section className="speaking-premium-hero">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#c11221]">IELTS Lab Oran · Speaking</p>
        <h1 className="mt-5">Choose your speaking appointment.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#62615e] sm:text-lg">Select an available 20-minute appointment. Your examiner is assigned privately after confirmation.</p>
      </section>
      {message && <p role="status" className="mt-5 rounded-xl border border-[#dfdeda] bg-white px-4 py-3 text-sm">{message}</p>}

      <section className="speaking-premium-card mt-8 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold">Your appointments</h2><p className="mt-1 text-sm text-[#666]">Upcoming and previous Speaking bookings.</p></div><span className="rounded-full bg-[#f1efea] px-3 py-1 text-sm font-bold">{activeAppointments.length} upcoming</span></div>
        {!appointments.length && <p className="mt-4 rounded-xl bg-[#f7f6f3] p-4 text-[#666]">No Speaking appointment booked.</p>}
        <div className="mt-5 grid gap-3">{appointments.map((appointment) => <article key={appointment.id} className="speaking-premium-list-row grid gap-4 rounded-2xl border p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{appointmentFormatter.format(new Date(appointment.scheduledStartAt))}</strong><span className="rounded-full bg-[#f1efea] px-2.5 py-1 text-xs font-bold">{appointment.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-sm text-[#666]">{appointment.deliveryMode === 'ONLINE' ? 'Online interview' : `In-centre · ${booking.centreName}, ${booking.centreAddress}`}</p></div>
          <div className="flex flex-wrap gap-2">{appointment.status === 'BOOKED' && appointment.deliveryMode === 'ONLINE' && appointment.session && <Link className="rounded-lg bg-black px-4 py-2 text-center font-bold text-white" href={`/speaking/session/${appointment.session.id}`}>Device check</Link>}{appointment.status === 'BOOKED' && <button className="rounded-lg border border-[#777] px-4 py-2 font-bold" onClick={() => startReschedule(appointment)}>Reschedule</button>}{appointment.status === 'BOOKED' && <button className="rounded-lg border border-[#aaa] px-4 py-2 font-bold" onClick={() => cancel(appointment.id)}>Cancel</button>}</div>
        </article>)}</div>
      </section>

      <section id="speaking-slot-picker" className="speaking-premium-card mt-7 scroll-mt-24 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{rescheduleId ? 'Choose a new appointment' : 'Book an appointment'}</h2>{rescheduleId && <button className="text-sm font-bold underline" onClick={() => { setRescheduleId(null); setSelectedSlot(null); }}>Stop rescheduling</button>}</div>
        {eligibleAttempts.length > 1 && !rescheduleId && <label className="mt-5 grid max-w-xl gap-1 text-sm font-bold">Test result<select value={attemptId} onChange={(event) => setAttemptId(event.target.value)} className="rounded-lg border border-[#999] bg-white px-3 py-2.5 font-normal">{eligibleAttempts.map((attempt) => <option key={attempt.id} value={attempt.id}>{attempt.blueprint.name} · {new Date(attempt.submittedAt ?? attempt.createdAt).toLocaleDateString()}</option>)}</select></label>}

        <fieldset className="mt-5"><legend className="text-sm font-bold">1. Appointment type</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{(['ONLINE', 'IN_PERSON'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => chooseMode(value)} className={`rounded-xl border p-4 text-left ${mode === value ? 'border-black bg-black text-white' : 'border-[#c9c8c3] bg-white'}`}><strong className="block">{value === 'ONLINE' ? 'Online' : 'In centre'}</strong><span className={`mt-1 block text-sm ${mode === value ? 'text-white/75' : 'text-[#666]'}`}>{value === 'ONLINE' ? 'Join securely from your device' : `${booking.centreName} · ${booking.centreAddress}`}</span></button>)}</div></fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-bold">2. Available days</legend>
          <p className="mt-1 text-sm text-[#666]">Only days with at least one open appointment are shown.</p>
          {loadingDates && <p className="mt-4 text-sm text-[#666]">Finding available days…</p>}
          {!loadingDates && !availableDates.length && <p className="mt-4 rounded-xl bg-[#f7f6f3] p-4 text-sm text-[#666]">No appointments are currently available for this type. Try the other appointment type or check again later.</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {availableDates.slice(0, visibleDateCount).map((availableDay) => {
              const selected = availableDay.date === date;
              const value = new Date(`${availableDay.date}T12:00:00`);
              return <button key={availableDay.date} type="button" aria-pressed={selected} onClick={() => { setDate(availableDay.date); setSelectedSlot(null); }} className={`rounded-xl border p-3 text-left ${selected ? 'border-black bg-black text-white shadow-md' : 'border-[#d8d7d2] bg-white hover:border-[#999]'}`}>
                <span className={`block text-xs font-bold uppercase tracking-[.1em] ${selected ? 'text-white/65' : 'text-[#777]'}`}>{value.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <strong className="mt-1 block text-base">{value.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</strong>
                <span className={`mt-1 block text-xs ${selected ? 'text-white/70' : 'text-[#666]'}`}>{availableDay.slotCount} {availableDay.slotCount === 1 ? 'time' : 'times'}</span>
              </button>;
            })}
          </div>
          {visibleDateCount < availableDates.length && <button type="button" className="mt-4 rounded-xl border border-[#ccc] bg-white px-4 py-2.5 text-sm font-bold" onClick={() => setVisibleDateCount((count) => count + 8)}>Show later dates</button>}
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-sm font-bold">3. Choose an available time</legend>
          <p className="mt-1 text-sm text-[#666]">Times use {booking.timezone}. The last appointment starts at 19:40.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{slots.map((slot) => <button key={slot.startAt} type="button" aria-pressed={selectedSlot?.startAt === slot.startAt} onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-3 py-3 font-bold ${selectedSlot?.startAt === slot.startAt ? 'border-[#c8102e] bg-[#c8102e] text-white' : 'border-[#b9b8b3] bg-white hover:border-black'}`}>{timeFormatter.format(new Date(slot.startAt))}</button>)}</div>
          {loadingSlots && <p className="mt-3 text-sm text-[#666]">Loading available times…</p>}
          {!loadingSlots && Boolean(date) && !slots.length && <p className="mt-3 rounded-xl bg-[#f7f6f3] p-3 text-sm text-[#666]">Those times were just taken. Choose another available day.</p>}
        </fieldset>

        <div className="mt-8 rounded-2xl border border-[#deddd8] bg-[#f7f6f3] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#777]">Appointment summary</p>{selectedSlot ? <><p className="mt-3 text-xl font-bold tracking-[-.02em]">{appointmentFormatter.format(new Date(selectedSlot.startAt))}</p><p className="mt-1 text-sm text-[#666]">{mode === 'ONLINE' ? 'Online interview' : `In-centre at ${booking.centreName}`} · {booking.slotMinutes} minutes · {booking.timezone}</p></> : <p className="mt-3 text-sm text-[#666]">Select a specific time to continue.</p>}<button type="button" disabled={!selectedSlot || saving} onClick={confirmSlot} className="mt-5 w-full rounded-xl bg-black px-6 py-3.5 font-bold text-white shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:bg-[#aaa] sm:w-auto">{saving ? 'Saving…' : rescheduleId ? 'Confirm new appointment' : 'Confirm appointment'}</button></div>
      </section>
    </div>
  </main>;
}
