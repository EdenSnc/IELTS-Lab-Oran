import { z } from 'zod';
import { availabilitySchema } from '@/lib/leads/availability';
import { normalizeLeadPhone } from '@/lib/leads/direct-intake';

export const founderDetailsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(1).max(32).transform((value, ctx) => {
    const number = normalizeLeadPhone(value);
    if (number) return number;
    ctx.addIssue({ code: 'custom', message: 'Enter a valid WhatsApp number.' });
    return z.NEVER;
  }),
  email: z.string().trim().pipe(z.email().max(320)).nullable(),
  notes: z.string().trim().max(1500),
  availability: availabilitySchema.nullable(),
}).strict();

export type FounderDetails = z.output<typeof founderDetailsSchema>;

export const founderApplicationAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), details: founderDetailsSchema }).strict(),
  z.object({ action: z.literal('edit'), id: z.uuid(), details: founderDetailsSchema.nullable() }).strict(),
  z.object({ action: z.literal('archive'), id: z.uuid(), archived: z.boolean() }).strict(),
]);
