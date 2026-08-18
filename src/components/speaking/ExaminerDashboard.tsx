'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { speakingApi } from '@/lib/speaking/client-api';

type Viewer = { id: string; role: 'TEACHER' | 'ADMIN'; name: string | null };
type Examiner = { id: string; name: string | null; timezone: string };
type Rule = {
  id: string; weekday: number; startMinute: number; endMinute: number; timezone: string;
  appointmentDurationMinutes: number; deliveryMode: 'ONLINE' | 'IN_PERSON'; validFrom: string | null; validUntil: string | null; active: boolean;
};
type Override = {
  id: string; date: string; kind: 'AVAILABLE' | 'BLACKOUT'; startMinute: number | null;
  endMinute: number | null; appointmentDurationMinutes: number | null; deliveryMode: 'ONLINE' | 'IN_PERSON' | null; timezone: string; reason: string | null;
};
type Appointment = {
  id: string; scheduledStartAt: string; scheduledEndAt: string; status: string; deliveryMode: 'ONLINE' | 'IN_PERSON';
  learner: { id: string; name: string | null };
  examiner: { id: string; name: string | null };
  attempt: { blueprint: { name: string; version: number } };
  session: { id: string; state: string; startedAt: string | null; endedAt: string | null; assessments: { stage: string }[] } | null;
};

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
const fromMinutes = (value: number | null) => value === null ? '—' : `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const dateKey = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

export default function ExaminerDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [managedExaminerId, setManagedExaminerId] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'review' | 'all'>('upcoming');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('12:00');
  const [availabilityMode, setAvailabilityMode] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [timezone, setTimezone] = useState('Africa/Algiers');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const [overrideDate, setOverrideDate] = useState(dateKey());
  const [overrideKind, setOverrideKind] = useState<'AVAILABLE' | 'BLACKOUT'>('BLACKOUT');
  const [overrideStart, setOverrideStart] = useState('10:00');
  const [overrideEnd, setOverrideEnd] = useState('12:00');
  const [overrideReason, setOverrideReason] = useState('');

  const loadAppointments = useCallback(async () => {
    const data = await speakingApi<{ appointments: Appointment[]; viewer: Viewer }>('/api/speaking/appointments');
    setAppointments(data.appointments);
    setViewer(data.viewer);
    setManagedExaminerId((current) => current || data.viewer.id);
  }, []);

  const loadExaminers = useCallback(async () => {
    const data = await speakingApi<{ examiners: Examiner[] }>('/api/speaking/examiners?includeWithoutAvailability=true');
    setExaminers(data.examiners);
  }, []);

  const loadAvailability = useCallback(async (examinerId: string) => {
    if (!examinerId) return;
    const data = await speakingApi<{ rules: Rule[]; overrides: Override[] }>(`/api/speaking/availability?examinerId=${encodeURIComponent(examinerId)}`);
    setRules(data.rules);
    setSelectedRuleIds((current) => current.filter((id) => data.rules.some((rule) => rule.id === id)));
    setOverrides(data.overrides);
    setTimezone(data.rules[0]?.timezone ?? data.overrides[0]?.timezone ?? 'Africa/Algiers');
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadAppointments(), loadExaminers()]).catch((error) => setMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAppointments, loadExaminers]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAvailability(managedExaminerId).catch((error) => setMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailability, managedExaminerId]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);

  async function addAvailability() {
    if (!weekdays.length) return setMessage('Select at least one day.');
    if (toMinutes(end) <= toMinutes(start)) return setMessage('The end time must be after the start time.');
    if (toMinutes(start) < 600 || toMinutes(end) > 1200) return setMessage('Availability must be between 10:00 and 20:00.');
    setSaving(true);
    try {
      const result = await speakingApi<{ createdCount: number; skippedCount: number }>('/api/speaking/availability', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'recurring-bulk', examinerId: managedExaminerId, weekdays,
          startMinute: toMinutes(start), endMinute: toMinutes(end), timezone,
          appointmentDurationMinutes: 20, deliveryMode: availabilityMode,
          validFrom: validFrom || undefined, validUntil: validUntil || undefined,
        }),
      });
      await loadAvailability(managedExaminerId);
      await loadExaminers();
      setMessage(result.createdCount
        ? `${result.createdCount} weekly ${result.createdCount === 1 ? 'window' : 'windows'} published.`
        : 'Those weekly windows are already published.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save availability'); }
    finally { setSaving(false); }
  }

  async function addOverride() {
    if (overrideKind === 'AVAILABLE' && toMinutes(overrideEnd) <= toMinutes(overrideStart)) return setMessage('The override end time must be after its start time.');
    if (overrideKind === 'AVAILABLE' && (toMinutes(overrideStart) < 600 || toMinutes(overrideEnd) > 1200)) return setMessage('Availability must be between 10:00 and 20:00.');
    setSaving(true);
    try {
      await speakingApi('/api/speaking/availability', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'override', examinerId: managedExaminerId, date: overrideDate,
          overrideKind, timezone, appointmentDurationMinutes: 20,
          deliveryMode: overrideKind === 'AVAILABLE' ? availabilityMode : undefined,
          startMinute: overrideKind === 'AVAILABLE' ? toMinutes(overrideStart) : undefined,
          endMinute: overrideKind === 'AVAILABLE' ? toMinutes(overrideEnd) : undefined,
          reason: overrideReason || undefined,
        }),
      });
      await loadAvailability(managedExaminerId);
      setOverrideReason('');
      setMessage(overrideKind === 'BLACKOUT' ? 'Blackout date saved.' : 'Extra date availability saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save date override'); }
    finally { setSaving(false); }
  }

  async function removeAvailability(id: string, type: 'rule' | 'override') {
    if (!window.confirm('Remove this availability entry? Existing appointments will not be cancelled.')) return;
    try {
      await speakingApi(`/api/speaking/availability/${id}?type=${type}`, { method: 'DELETE' });
      await loadAvailability(managedExaminerId);
      setMessage('Availability entry removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to remove availability'); }
  }

  async function removeSelectedRules() {
    if (!selectedRuleIds.length) return;
    if (!window.confirm(`Remove ${selectedRuleIds.length} selected weekly ${selectedRuleIds.length === 1 ? 'window' : 'windows'}? Existing appointments will not be cancelled.`)) return;
    setSaving(true);
    try {
      await speakingApi('/api/speaking/availability', { method: 'DELETE', body: JSON.stringify({ examinerId: managedExaminerId, ruleIds: selectedRuleIds }) });
      setSelectedRuleIds([]);
      await loadAvailability(managedExaminerId);
      setMessage('Selected weekly availability removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to remove selected availability'); }
    finally { setSaving(false); }
  }

  function toggleWeekday(weekday: number) {
    setWeekdays((current) => current.includes(weekday) ? current.filter((item) => item !== weekday) : [...current, weekday].sort());
  }

  async function cancelAppointment(id: string) {
    const note = window.prompt('Optional cancellation reason for the learner:') ?? undefined;
    if (note === undefined) return;
    try {
      await speakingApi(`/api/speaking/appointments/${id}`, {
        method: 'PATCH', body: JSON.stringify({ action: 'cancel', note: note || undefined }),
      });
      await loadAppointments();
      setMessage('Appointment cancelled.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to cancel appointment'); }
  }

  const filteredAppointments = useMemo(() => appointments.filter((appointment) => {
    const startAt = new Date(appointment.scheduledStartAt);
    if (filter === 'all') return true;
    if (filter === 'today') return dateKey(startAt) === dateKey();
    if (filter === 'review') return ['AWAITING_HUMAN_SCORE', 'READY_FOR_REVIEW'].includes(appointment.session?.state ?? '');
    return appointment.status === 'BOOKED' && (now === null || startAt.getTime() >= now);
  }), [appointments, filter, now]);

  const reviewCount = appointments.filter((item) => ['AWAITING_HUMAN_SCORE', 'READY_FOR_REVIEW'].includes(item.session?.state ?? '')).length;
  const todayCount = appointments.filter((item) => item.status === 'BOOKED' && dateKey(new Date(item.scheduledStartAt)) === dateKey()).length;
  const upcomingCount = appointments.filter((item) => item.status === 'BOOKED' && (now === null || new Date(item.scheduledStartAt).getTime() >= now)).length;
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <main className="speaking-premium-shell">
      <header className="speaking-premium-header px-4 py-3 sm:px-7"><TestBrand responsive href="/en" /></header>
      <div className="speaking-premium-container">
        <section className="speaking-premium-hero speaking-premium-hero--dashboard">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#c11221]">Examiner workspace</p><h1 className="mt-5">Speaking operations.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#62615e] sm:text-lg">A focused workspace for availability, appointments, interviews and reviews.</p></div>
            {viewer?.role === 'ADMIN' && <label className="grid min-w-0 gap-2 text-sm font-bold sm:min-w-64">Manage examiner<select className="w-full bg-white px-3 py-2 font-normal" value={managedExaminerId} onChange={(event) => setManagedExaminerId(event.target.value)}>{examiners.map((examiner) => <option key={examiner.id} value={examiner.id}>{examiner.name ?? 'Examiner'}</option>)}</select></label>}
          </div>
        </section>
        {message && <p role="status" className="mt-4 rounded-xl border border-[#deddd8] bg-white p-3 text-sm">{message}</p>}

        <section className="speaking-premium-card speaking-premium-walkthrough mt-7 p-5 sm:p-7">
          <h2 className="text-lg font-bold">How to publish your appointment slots</h2>
          <ol className="mt-3 grid gap-3 text-sm text-[#555] md:grid-cols-3">
            <li className="rounded-2xl p-4"><strong className="mb-2 block">01 · Choose a weekly window</strong>Select the weekday, online or in-centre, and a start/end time below.</li>
            <li className="rounded-2xl p-4"><strong className="mb-2 block">02 · Save availability</strong>The window becomes bookable as fixed 20-minute slots.</li>
            <li className="rounded-2xl p-4"><strong className="mb-2 block">03 · Track assignments</strong>Confirmed candidates appear automatically under Appointments.</li>
          </ol>
        </section>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button onClick={() => setFilter('upcoming')} className={`speaking-premium-metric border p-5 text-left ${filter === 'upcoming' ? 'border-black bg-black text-white' : 'bg-white'}`}><span className="text-3xl font-bold tracking-[-.04em]">{upcomingCount}</span><span className="mt-3 block text-sm">Upcoming</span></button>
          <button onClick={() => setFilter('today')} className={`speaking-premium-metric border p-5 text-left ${filter === 'today' ? 'border-black bg-black text-white' : 'bg-white'}`}><span className="text-3xl font-bold tracking-[-.04em]">{todayCount}</span><span className="mt-3 block text-sm">Today</span></button>
          <button onClick={() => setFilter('review')} className={`speaking-premium-metric border p-5 text-left ${filter === 'review' ? 'border-black bg-black text-white' : 'bg-white'}`}><span className="text-3xl font-bold tracking-[-.04em]">{reviewCount}</span><span className="mt-3 block text-sm">Need review</span></button>
          <button onClick={() => setFilter('all')} className={`speaking-premium-metric border p-5 text-left ${filter === 'all' ? 'border-black bg-black text-white' : 'bg-white'}`}><span className="text-3xl font-bold tracking-[-.04em]">{appointments.length}</span><span className="mt-3 block text-sm">All bookings</span></button>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
          <section className="speaking-premium-card min-w-0 p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Appointments</h2><button onClick={() => void loadAppointments()} className="rounded-lg border px-3 py-2 text-sm font-bold">Refresh</button></div>
            <div className="mt-4 grid gap-3">
              {filteredAppointments.map((item) => {
                const review = ['AWAITING_HUMAN_SCORE', 'READY_FOR_REVIEW', 'FINALIZED'].includes(item.session?.state ?? '');
                return <article key={item.id} className="speaking-premium-list-row grid gap-4 rounded-2xl border p-5 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{item.learner.name ?? 'Candidate'}</strong><span className="rounded-full bg-[#f1efea] px-2.5 py-1 text-xs font-bold">{item.status.replaceAll('_', ' ')}</span><span className="rounded-full bg-[#f1efea] px-2.5 py-1 text-xs font-bold">{item.deliveryMode === 'ONLINE' ? 'ONLINE' : 'IN CENTRE'}</span></div><p className="mt-2 text-sm font-semibold">{formatter.format(new Date(item.scheduledStartAt))}</p><p className="mt-1 truncate text-xs text-[#666]">{item.attempt.blueprint.name} · {item.examiner.name ?? 'Examiner'} · {item.session?.state.replaceAll('_', ' ') ?? 'SESSION PENDING'}</p></div><div className="flex flex-wrap gap-2">{item.session && <Link className="rounded-xl bg-black px-4 py-2.5 text-center font-bold text-white" href={review ? `/speaking/review/${item.session.id}` : `/speaking/examiner/${item.session.id}`}>{review ? 'Review' : 'Open session'}</Link>}{item.status === 'BOOKED' && <button onClick={() => cancelAppointment(item.id)} className="rounded-xl border border-[#bbb] px-3 py-2.5 font-bold">Cancel</button>}</div></article>;
              })}
              {!filteredAppointments.length && <p className="rounded-xl bg-[#f7f6f3] p-4 text-[#666]">No appointments in this view.</p>}
            </div>
          </section>

          <div className="grid content-start gap-6">
            <section className="speaking-premium-card p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#c11221]">Availability</p><h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">Weekly schedule</h2><p className="mt-2 text-sm leading-6 text-[#666]">Publish 20-minute online or in-centre slots between 10:00 and 20:00. Candidates never see examiner identities.</p>
              <fieldset className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><legend className="text-sm font-bold">Days</legend><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => setWeekdays([0, 1, 2, 3, 4])} className="rounded-full border border-[#ccc] px-3 py-1.5 text-xs font-bold">Sun–Thu</button><button type="button" onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])} className="rounded-full border border-[#ccc] px-3 py-1.5 text-xs font-bold">Select all</button><button type="button" onClick={() => setWeekdays([])} className="rounded-full border border-[#ccc] px-3 py-1.5 text-xs font-bold">Clear</button></div></div>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map((day, index) => <button key={day} type="button" aria-pressed={weekdays.includes(index)} onClick={() => toggleWeekday(index)} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${weekdays.includes(index) ? 'border-black bg-black text-white' : 'border-[#d3d2cd] bg-white'}`}>{day.slice(0, 3)}</button>)}</div>
              </fieldset>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Appointment type<select className="rounded-lg border px-3 py-2 font-normal" value={availabilityMode} onChange={(event) => setAvailabilityMode(event.target.value as 'ONLINE' | 'IN_PERSON')}><option value="ONLINE">Online</option><option value="IN_PERSON">In centre</option></select></label><span className="hidden sm:block" /><label className="grid gap-1 text-sm font-bold">From<input className="rounded-lg border px-3 py-2 font-normal" min="10:00" max="19:40" step="1200" type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">To<input className="rounded-lg border px-3 py-2 font-normal" min="10:20" max="20:00" step="1200" type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Valid from <span className="font-normal text-[#777]">optional</span><input className="rounded-lg border px-3 py-2 font-normal" type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Valid until <span className="font-normal text-[#777]">optional</span><input className="rounded-lg border px-3 py-2 font-normal" type="date" value={validUntil} min={validFrom || undefined} onChange={(event) => setValidUntil(event.target.value)} /></label></div>
              <p className="mt-3 text-sm text-[#666]">20-minute slots · {timezone}</p>
              <button disabled={saving || !managedExaminerId || !weekdays.length} className="mt-5 w-full rounded-xl bg-black px-4 py-3 font-bold text-white shadow-lg shadow-black/10 disabled:bg-[#aaa]" onClick={addAvailability}>Publish {weekdays.length || 0} {weekdays.length === 1 ? 'day' : 'days'}</button>
              {!!rules.length && <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#e7e5e0] pt-5"><button type="button" onClick={() => setSelectedRuleIds(rules.map((rule) => rule.id))} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Select all</button><button type="button" onClick={() => setSelectedRuleIds([])} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Clear selection</button><button type="button" disabled={!selectedRuleIds.length || saving} onClick={removeSelectedRules} className="rounded-lg border border-[#c11221] px-3 py-2 text-xs font-bold text-[#a20e1b] disabled:border-[#ddd] disabled:text-[#aaa]">Remove selected ({selectedRuleIds.length})</button></div>}
              <div className="mt-3 grid gap-2">{rules.map((rule) => <article key={rule.id} className="flex items-center gap-3 rounded-xl bg-[#f7f6f3] p-3"><input aria-label={`Select ${days[rule.weekday]} availability`} type="checkbox" checked={selectedRuleIds.includes(rule.id)} onChange={() => setSelectedRuleIds((current) => current.includes(rule.id) ? current.filter((id) => id !== rule.id) : [...current, rule.id])} className="size-4 min-h-0 shrink-0 accent-black" /><div className="min-w-0 flex-1"><strong>{days[rule.weekday]} · {rule.deliveryMode === 'ONLINE' ? 'Online' : 'In centre'}</strong><p className="text-sm text-[#666]">{fromMinutes(rule.startMinute)}–{fromMinutes(rule.endMinute)} · {rule.appointmentDurationMinutes} min · {rule.timezone}</p></div><button aria-label={`Remove ${days[rule.weekday]} availability`} onClick={() => removeAvailability(rule.id, 'rule')} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold">Remove</button></article>)}{!rules.length && <p className="text-sm text-[#777]">No recurring availability published.</p>}</div>
            </section>

            <section className="speaking-premium-card p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#c11221]">Exceptions</p><h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">Date overrides</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Date<input className="rounded-lg border px-3 py-2 font-normal" min={dateKey()} type="date" value={overrideDate} onChange={(event) => setOverrideDate(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Type<select className="rounded-lg border px-3 py-2 font-normal" value={overrideKind} onChange={(event) => setOverrideKind(event.target.value as 'AVAILABLE' | 'BLACKOUT')}><option value="BLACKOUT">Unavailable all day</option><option value="AVAILABLE">Extra available window</option></select></label>{overrideKind === 'AVAILABLE' && <><label className="grid gap-1 text-sm font-bold">Appointment type<select className="rounded-lg border px-3 py-2 font-normal" value={availabilityMode} onChange={(event) => setAvailabilityMode(event.target.value as 'ONLINE' | 'IN_PERSON')}><option value="ONLINE">Online</option><option value="IN_PERSON">In centre</option></select></label><span /><label className="grid gap-1 text-sm font-bold">From<input className="rounded-lg border px-3 py-2 font-normal" min="10:00" max="19:40" step="1200" type="time" value={overrideStart} onChange={(event) => setOverrideStart(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">To<input className="rounded-lg border px-3 py-2 font-normal" min="10:20" max="20:00" step="1200" type="time" value={overrideEnd} onChange={(event) => setOverrideEnd(event.target.value)} /></label></>}<label className="grid gap-1 text-sm font-bold sm:col-span-2">Reason <span className="font-normal text-[#777]">optional</span><input className="rounded-lg border px-3 py-2 font-normal" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} /></label></div><button disabled={saving || !managedExaminerId} className="mt-5 w-full rounded-xl border border-black px-4 py-3 font-bold disabled:text-[#999]" onClick={addOverride}>Save date override</button>
              <div className="mt-5 grid gap-2">{overrides.map((override) => <article key={override.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f6f3] p-3"><div><strong>{new Date(`${override.date.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong><p className="text-sm text-[#666]">{override.kind === 'BLACKOUT' ? 'Unavailable all day' : `${override.deliveryMode === 'ONLINE' ? 'Online' : 'In centre'} · ${fromMinutes(override.startMinute)}–${fromMinutes(override.endMinute)}`}{override.reason ? ` · ${override.reason}` : ''}</p></div><button aria-label="Remove date override" onClick={() => removeAvailability(override.id, 'override')} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold">Remove</button></article>)}{!overrides.length && <p className="text-sm text-[#777]">No future overrides.</p>}</div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
