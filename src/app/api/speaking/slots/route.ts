import { z } from 'zod';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import { pooledAvailableDates, pooledAvailableSlots } from '@/lib/speaking/booking-service';

const modeSchema = z.enum(['ONLINE', 'IN_PERSON']);
const querySchema = z.union([
  z.object({ date: z.iso.date(), mode: modeSchema }),
  z.object({ from: z.iso.date(), to: z.iso.date(), mode: modeSchema })
    .refine((value) => value.to >= value.from, 'Invalid date range')
    .refine((value) => (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000 <= 91, 'Date range is too large'),
]);

export async function GET(request: Request) {
  try {
    await requireRequestUser(request);
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    if ('date' in input) {
      const slots = await pooledAvailableSlots(input.date, input.mode);
      return noStoreJson({ slots: slots.map((slot) => ({ startAt: slot.start.toISOString(), endAt: slot.end.toISOString(), timezone: slot.timezone })) });
    }
    return noStoreJson({ availableDates: await pooledAvailableDates(input.from, input.to, input.mode) });
  } catch (error) {
    return apiError(error, 'SPEAKING_SLOTS_FAILED');
  }
}
