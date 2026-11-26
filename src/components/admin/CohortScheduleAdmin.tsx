'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { availabilityCopy, weekdays } from '@/lib/leads/availability';
import { cohortBlockSchema, formatCohortBlock } from '@/lib/leads/cohort-time-blocks';

type Block = { id: string; days: string[]; startMinutes: number; endMinutes: number; published: boolean };
const control = 'min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium';
const action = 'min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold disabled:opacity-50';

export default function CohortScheduleAdmin({ blocks }: { blocks: Block[] }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(body: object, feedback: string, form?: HTMLFormElement) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/staff/cohort-time-blocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'Withdraw a published block before adding another.'
        : response.status === 401 || response.status === 403 ? 'Sign in again to edit class times.'
          : 'The timetable could not be saved. Try again.');
      form?.reset();
      setMessage(feedback);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The timetable could not be saved.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const readTime = (key: string) => {
      const [hour, minute] = String(fields.get(key) ?? '').split(':').map(Number);
      return hour * 60 + minute;
    };
    const parsed = cohortBlockSchema.safeParse({
      days: fields.getAll('days'), startMinutes: readTime('start'), endMinutes: readTime('end'),
    });
    if (!parsed.success) { setError('Choose at least one day and a time between 08:00 and 20:00.'); return; }
    void save({ action: 'add', block: parsed.data }, 'Class time published.', form);
  }

  return <details className="rounded-2xl border border-stone-200 bg-white px-4">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">Next-camp timetable <span className="text-sm font-normal text-stone-600">· {blocks.filter(({ published }) => published).length} published</span></summary>
    <div className="space-y-4 border-t border-stone-100 py-4">
      <p className="text-sm text-stone-600">Applicants select one recurring class block. Times are local to Oran.</p>
      {blocks.length > 0 && <ul className="divide-y divide-stone-100">
        {blocks.map((block) => {
          const slot = formatCohortBlock(block, 'en');
          return <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{slot.days} · {slot.time}</p>
              <p className="text-xs text-stone-600">{block.published ? 'Published' : 'Unavailable'}</p></div>
            <button type="button" disabled={busy} className={action} onClick={() => void save({
              action: 'publish', id: block.id, published: !block.published,
            }, block.published ? 'Class time withdrawn.' : 'Class time published.')}>{block.published ? 'Withdraw' : 'Publish again'}</button>
          </li>;
        })}
      </ul>}
      <form onSubmit={add} className="grid gap-3 rounded-xl bg-stone-50 p-3 sm:p-4">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold">Days for this group</legend>
          <div className="flex flex-wrap gap-2">
            {weekdays.map((day, index) => <label key={day} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm">
              <input type="checkbox" name="days" value={day} className="size-4 accent-[#8e1826]" /> {availabilityCopy.en.shortDays[index]}
            </label>)}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <label className="grid min-w-0 gap-1 text-sm font-semibold">Start<input name="start" type="time" min="08:00" max="19:59" className={`${control} min-w-0`} required /></label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold">End<input name="end" type="time" min="08:01" max="20:00" className={`${control} min-w-0`} required /></label>
        </div>
        <button disabled={busy} className="min-h-11 w-fit rounded-full bg-charcoal px-4 text-sm font-semibold text-white disabled:opacity-50">Publish time block</button>
      </form>
      <p role="status" className="empty:hidden text-sm font-semibold text-emerald-800">{busy ? 'Saving…' : message}</p>
      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
    </div>
  </details>;
}
