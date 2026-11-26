import { z } from 'zod';
import { availabilityCopy, latestAvailabilityEnd, weekdays } from './availability';

const timeFields = {
  days: z.array(z.enum(weekdays)).min(1).max(7).refine((days) => new Set(days).size === days.length),
  startMinutes: z.number().int().min(8 * 60).max(latestAvailabilityEnd * 60 - 1),
  endMinutes: z.number().int().min(8 * 60 + 1).max(latestAvailabilityEnd * 60),
};
const ordered = ({ startMinutes, endMinutes }: { startMinutes: number; endMinutes: number }) => startMinutes < endMinutes;
export const cohortBlockSchema = z.object(timeFields).strict().refine(ordered, { path: ['endMinutes'] });

export const cohortBlockSnapshotSchema = z.object({ id: z.uuid(), ...timeFields }).strict().refine(ordered, { path: ['endMinutes'] });
export type CohortBlock = z.output<typeof cohortBlockSnapshotSchema>;

export function formatCohortClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatCohortBlock(block: { days: string[]; startMinutes: number; endMinutes: number }, locale: keyof typeof availabilityCopy) {
  const days = weekdays.flatMap((day, index) => block.days.includes(day) ? [availabilityCopy[locale].days[index]] : []);
  return { days: new Intl.ListFormat(locale).format(days), time: `${formatCohortClock(block.startMinutes)}–${formatCohortClock(block.endMinutes)}` };
}
