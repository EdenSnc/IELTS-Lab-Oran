'use client';

import { useState } from 'react';
import {
  availabilityCopy,
  formatAvailabilityHour,
  maxAvailabilityWindows,
  mergeAvailabilityWindows,
  weekdays,
  type AvailabilityWindow,
} from '@/lib/leads/availability';

const hours = Array.from({ length: 15 }, (_, index) => 8 + index);
const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 text-base text-charcoal';

export default function AvailabilityPicker({ locale, windows, onChange, onDraft }: {
  locale: keyof typeof availabilityCopy;
  windows: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
  onDraft: (pending: boolean) => void;
}) {
  const t = availabilityCopy[locale];
  const [day, setDay] = useState<AvailabilityWindow['day']>();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  function addWindow() {
    if (!day || !start || !end || Number(start) >= Number(end) || windows.length >= maxAvailabilityWindows) return;
    const window = { day, startHour: Number(start), endHour: Number(end) };
    onChange(mergeAvailabilityWindows([...windows, window]));
    setStart('');
    setEnd('');
    onDraft(false);
  }

  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div role="group" aria-label={t.chooseDay} className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {weekdays.map((value, index) => (
          <button key={value} type="button" aria-label={t.days[index]} aria-pressed={day === value}
            onClick={() => setDay(value)}
            className={`min-h-11 min-w-0 rounded-lg border px-1 text-xs font-bold ${day === value ? 'border-crimson bg-crimson text-white' : 'border-gray-300 bg-white text-charcoal hover:border-crimson'}`}>
            {t.shortDays[index]}
          </button>
        ))}
      </div>
      {day && windows.length < maxAvailabilityWindows && (
        <div className="grid grid-cols-2 gap-2">
          <label className="grid min-w-0 gap-1 text-xs font-semibold">{t.from}
            <select name="availabilityStart" dir="ltr" className={inputClass} value={start} onChange={(event) => {
              const value = event.target.value;
              setStart(value);
              const compatibleEnd = value && Number(end) > Number(value) ? end : '';
              setEnd(compatibleEnd);
              onDraft(Boolean(value || compatibleEnd));
            }}>
              <option value="">—</option>
              {hours.slice(0, -1).map((hour) => <option key={hour} value={hour}>{formatAvailabilityHour(hour)}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-semibold">{t.to}
            <select name="availabilityEnd" dir="ltr" className={inputClass} disabled={!start} value={end} onChange={(event) => {
              setEnd(event.target.value);
              onDraft(Boolean(start || event.target.value));
            }}>
              <option value="">—</option>
              {hours.filter((hour) => hour > Number(start)).map((hour) => <option key={hour} value={hour}>{formatAvailabilityHour(hour)}</option>)}
            </select>
          </label>
          <button type="button" disabled={!start || !end} onClick={addWindow}
            className="col-span-2 min-h-11 rounded-full border border-gray-300 bg-white px-3 text-sm font-semibold text-charcoal enabled:hover:border-crimson disabled:text-gray-400">
            + {t.add}
          </button>
        </div>
      )}
      {windows.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2" aria-live="polite">
          {windows.map((window, index) => {
            const description = `${t.days[weekdays.indexOf(window.day)]} ${formatAvailabilityHour(window.startHour)}–${formatAvailabilityHour(window.endHour)}`;
            return (
              <li key={`${window.day}-${window.startHour}-${window.endHour}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white ps-2">
                <span className="text-xs font-semibold text-charcoal">{description}</span>
                <button type="button" aria-label={`${t.remove} ${description}`} className="h-11 w-11 shrink-0 text-xl text-crimson" onClick={() => onChange(windows.filter((_, i) => index !== i))}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
