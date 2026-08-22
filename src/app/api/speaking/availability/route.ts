import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { speakingConfig } from '@/lib/speaking/config';

const timezoneSchema = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
  catch { return false; }
}, 'Invalid IANA timezone');

const ruleSchema = z.object({
  kind: z.literal('recurring'),
  examinerId: z.uuid().optional(),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(600).max(1180).multipleOf(20),
  endMinute: z.number().int().min(620).max(1200).multipleOf(20),
  timezone: timezoneSchema.default('Africa/Algiers'),
  appointmentDurationMinutes: z.literal(20).default(20),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON']),
  validFrom: z.iso.date().optional(),
  validUntil: z.iso.date().optional(),
}).superRefine((value, context) => {
  if (value.endMinute <= value.startMinute) context.addIssue({ code: 'custom', message: 'End time must be after start time.' });
  if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) context.addIssue({ code: 'custom', message: 'Valid-until must not precede valid-from.' });
});

const bulkRuleSchema = z.object({
  kind: z.literal('recurring-bulk'),
  examinerId: z.uuid().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).transform((values) => [...new Set(values)]),
  startMinute: z.number().int().min(600).max(1180).multipleOf(20),
  endMinute: z.number().int().min(620).max(1200).multipleOf(20),
  timezone: timezoneSchema.default('Africa/Algiers'),
  appointmentDurationMinutes: z.literal(20).default(20),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON']),
  validFrom: z.iso.date().optional(),
  validUntil: z.iso.date().optional(),
}).superRefine((value, context) => {
  if (value.endMinute <= value.startMinute) context.addIssue({ code: 'custom', message: 'End time must be after start time.' });
  if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) context.addIssue({ code: 'custom', message: 'Valid-until must not precede valid-from.' });
});

const overrideSchema = z.object({
  kind: z.literal('override'),
  examinerId: z.uuid().optional(),
  date: z.iso.date(),
  overrideKind: z.enum(['AVAILABLE', 'BLACKOUT']),
  startMinute: z.number().int().min(600).max(1180).multipleOf(20).optional(),
  endMinute: z.number().int().min(620).max(1200).multipleOf(20).optional(),
  timezone: timezoneSchema.default('Africa/Algiers'),
  appointmentDurationMinutes: z.literal(20).optional(),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON']).optional(),
  reason: z.string().max(300).optional(),
}).superRefine((value, context) => {
  if (value.overrideKind === 'AVAILABLE') {
    if (!value.deliveryMode) context.addIssue({ code: 'custom', message: 'Available overrides require an appointment type.' });
    if (value.startMinute === undefined || value.endMinute === undefined || value.endMinute <= value.startMinute) {
      context.addIssue({ code: 'custom', message: 'Available overrides require a valid start and end time.' });
    }
  }
});

const bulkDeleteSchema = z.object({
  examinerId: z.uuid().optional(),
  ruleIds: z.array(z.uuid()).min(1).max(100).transform((values) => [...new Set(values)]),
});

async function targetExaminerId(user: Awaited<ReturnType<typeof requirePrivilegedRequestUser>>, requested?: string) {
  const examinerId = user.role === 'ADMIN' && requested ? requested : user.id;
  if (user.role !== 'ADMIN' && requested && requested !== user.id) throw new Error('FORBIDDEN');
  const examiner = await prisma.user.findFirst({
    where: { id: examinerId, status: 'ACTIVE', role: { in: ['TEACHER', 'ADMIN'] } },
    select: { id: true },
  });
  if (!examiner) throw new Error('EXAMINER_NOT_FOUND');
  return examiner.id;
}

export async function GET(request: Request) {
  try {
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const examinerId = await targetExaminerId(user, new URL(request.url).searchParams.get('examinerId') ?? undefined);
    const [rules, overrides] = await Promise.all([
      prisma.speakingAvailabilityRule.findMany({ where: { examinerId }, orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] }),
      prisma.speakingAvailabilityOverride.findMany({ where: { examinerId, date: { gte: new Date() } }, orderBy: { date: 'asc' } }),
    ]);
    return noStoreJson({
      rules,
      overrides,
      examinerId,
      viewer: { id: user.id, role: user.role, name: user.name },
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_AVAILABILITY_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const payload = await request.json();
    const parsedBulkRule = bulkRuleSchema.safeParse(payload);
    if (parsedBulkRule.success) {
      const data = parsedBulkRule.data;
      const examinerId = await targetExaminerId(user, data.examinerId);
      const validFrom = data.validFrom ? new Date(`${data.validFrom}T00:00:00Z`) : null;
      const validUntil = data.validUntil ? new Date(`${data.validUntil}T00:00:00Z`) : null;
      const existing = await prisma.speakingAvailabilityRule.findMany({
        where: {
          examinerId,
          weekday: { in: data.weekdays },
          startMinute: data.startMinute,
          endMinute: data.endMinute,
          appointmentDurationMinutes: data.appointmentDurationMinutes,
          deliveryMode: data.deliveryMode,
          validFrom,
          validUntil,
          active: true,
        },
        select: { weekday: true },
      });
      const existingDays = new Set(existing.map((item) => item.weekday));
      const missingDays = data.weekdays.filter((weekday) => !existingDays.has(weekday));
      if (missingDays.length) await prisma.speakingAvailabilityRule.createMany({ data: missingDays.map((weekday) => ({
        examinerId,
        weekday,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        timezone: speakingConfig.defaultTimezone,
        appointmentDurationMinutes: data.appointmentDurationMinutes,
        deliveryMode: data.deliveryMode,
        validFrom,
        validUntil,
      })) });
      return noStoreJson({ createdCount: missingDays.length, skippedCount: data.weekdays.length - missingDays.length }, 201);
    }
    const parsedRule = ruleSchema.safeParse(payload);
    if (parsedRule.success) {
      const { validFrom, validUntil } = parsedRule.data;
      const examinerId = await targetExaminerId(user, parsedRule.data.examinerId);
      return noStoreJson(await prisma.speakingAvailabilityRule.create({ data: {
        examinerId,
        weekday: parsedRule.data.weekday,
        startMinute: parsedRule.data.startMinute,
        endMinute: parsedRule.data.endMinute,
        timezone: speakingConfig.defaultTimezone,
        appointmentDurationMinutes: parsedRule.data.appointmentDurationMinutes,
        deliveryMode: parsedRule.data.deliveryMode,
        validFrom: validFrom ? new Date(`${validFrom}T00:00:00Z`) : undefined,
        validUntil: validUntil ? new Date(`${validUntil}T00:00:00Z`) : undefined,
      } }), 201);
    }
    const parsedOverride = overrideSchema.parse(payload);
    const { overrideKind, date } = parsedOverride;
    const examinerId = await targetExaminerId(user, parsedOverride.examinerId);
    return noStoreJson(await prisma.speakingAvailabilityOverride.create({ data: {
      examinerId,
      kind: overrideKind,
      date: new Date(`${date}T00:00:00Z`),
      startMinute: parsedOverride.startMinute,
      endMinute: parsedOverride.endMinute,
      appointmentDurationMinutes: parsedOverride.appointmentDurationMinutes,
      deliveryMode: parsedOverride.deliveryMode,
      timezone: speakingConfig.defaultTimezone,
      reason: parsedOverride.reason,
      ...(overrideKind === 'BLACKOUT' ? { startMinute: null, endMinute: null } : {}),
    } }), 201);
  } catch (error) {
    return apiError(error, 'SPEAKING_AVAILABILITY_FAILED');
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const input = bulkDeleteSchema.parse(await request.json());
    const examinerId = await targetExaminerId(user, input.examinerId);
    const ownedCount = await prisma.speakingAvailabilityRule.count({ where: { id: { in: input.ruleIds }, examinerId } });
    if (ownedCount !== input.ruleIds.length) throw new Error('FORBIDDEN');
    const result = await prisma.speakingAvailabilityRule.deleteMany({ where: { id: { in: input.ruleIds }, examinerId } });
    return noStoreJson({ deletedCount: result.count });
  } catch (error) {
    return apiError(error, 'SPEAKING_AVAILABILITY_DELETE_FAILED');
  }
}
