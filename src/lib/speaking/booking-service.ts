import 'server-only';

import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { speakingConfig } from './config';
import { canManageSpeakingAppointment } from './permissions';
import { canCancelAppointment, generateSpeakingSlots, localDateKey, type SpeakingSlot } from './scheduling';

export type SpeakingAppointmentMode = 'ONLINE' | 'IN_PERSON';

export async function availableSlots(examinerId: string, date: string, deliveryMode: SpeakingAppointmentMode) {
  const rules = await prisma.speakingAvailabilityRule.findMany({
    where: { examinerId, active: true, weekday: new Date(`${date}T00:00:00Z`).getUTCDay(), deliveryMode },
  });
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start.getTime() + 86_400_000);
  const overrides = await prisma.speakingAvailabilityOverride.findMany({
    where: {
      examinerId,
      date: { gte: start, lt: end },
      OR: [{ kind: 'BLACKOUT' }, { kind: 'AVAILABLE', deliveryMode }],
    },
  });
  const occupied = await prisma.speakingAppointment.findMany({
    where: {
      examinerId,
      status: 'BOOKED',
      scheduledStartAt: { lt: new Date(end.getTime() + 86_400_000) },
      scheduledEndAt: { gt: new Date(start.getTime() - 86_400_000) },
    },
    select: { scheduledStartAt: true, scheduledEndAt: true },
  });
  return generateSpeakingSlots({
    date,
    deliveryMode,
    rules,
    overrides,
    occupied: occupied.map((item) => ({ start: item.scheduledStartAt, end: item.scheduledEndAt })),
  });
}

async function examinerSlots(date: string, deliveryMode: SpeakingAppointmentMode) {
  const examiners = await prisma.user.findMany({
    where: { role: { in: ['TEACHER', 'ADMIN'] }, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const results = await Promise.all(examiners.map(async ({ id }) => ({
    examinerId: id,
    slots: await availableSlots(id, date, deliveryMode),
  })));
  return results;
}

export async function pooledAvailableSlots(date: string, deliveryMode: SpeakingAppointmentMode) {
  const pooled = new Map<string, SpeakingSlot>();
  for (const result of await examinerSlots(date, deliveryMode)) {
    for (const slot of result.slots) pooled.set(`${slot.start.toISOString()}|${slot.end.toISOString()}`, slot);
  }
  return [...pooled.values()].sort((left, right) => left.start.getTime() - right.start.getTime());
}

function dateKeysInRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 92) throw new Error('INVALID_DATE_RANGE');
  return Array.from({ length: dayCount }, (_, index) => new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10));
}

export async function pooledAvailableDates(from: string, to: string, deliveryMode: SpeakingAppointmentMode) {
  const dates = dateKeysInRange(from, to);
  const rangeStart = new Date(`${from}T00:00:00Z`);
  const rangeEnd = new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000);
  const examiners = await prisma.user.findMany({
    where: { role: { in: ['TEACHER', 'ADMIN'] }, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (!examiners.length) return [];
  const examinerIds = examiners.map(({ id }) => id);
  const [rules, overrides, occupied] = await Promise.all([
    prisma.speakingAvailabilityRule.findMany({
      where: { examinerId: { in: examinerIds }, active: true, deliveryMode },
    }),
    prisma.speakingAvailabilityOverride.findMany({
      where: {
        examinerId: { in: examinerIds },
        date: { gte: rangeStart, lt: rangeEnd },
        OR: [{ kind: 'BLACKOUT' }, { kind: 'AVAILABLE', deliveryMode }],
      },
    }),
    prisma.speakingAppointment.findMany({
      where: {
        examinerId: { in: examinerIds },
        status: 'BOOKED',
        scheduledStartAt: { lt: rangeEnd },
        scheduledEndAt: { gt: rangeStart },
      },
      select: { examinerId: true, scheduledStartAt: true, scheduledEndAt: true },
    }),
  ]);
  const now = new Date();
  const rulesByExaminer = new Map(examinerIds.map((id) => [id, rules.filter((item) => item.examinerId === id)]));
  const overridesByExaminer = new Map(examinerIds.map((id) => [id, overrides.filter((item) => item.examinerId === id)]));
  const occupiedByExaminer = new Map(examinerIds.map((id) => [id, occupied.filter((item) => item.examinerId === id).map((item) => ({ start: item.scheduledStartAt, end: item.scheduledEndAt }))]));

  return dates.flatMap((date) => {
    const pooled = new Map<string, SpeakingSlot>();
    for (const { id: examinerId } of examiners) {
      const slots = generateSpeakingSlots({
        date,
        deliveryMode,
        rules: rulesByExaminer.get(examinerId) ?? [],
        overrides: overridesByExaminer.get(examinerId) ?? [],
        occupied: occupiedByExaminer.get(examinerId) ?? [],
        now,
      });
      for (const slot of slots) pooled.set(`${slot.start.toISOString()}|${slot.end.toISOString()}`, slot);
    }
    const slots = [...pooled.values()].sort((left, right) => left.start.getTime() - right.start.getTime());
    return slots.length ? [{ date, slotCount: slots.length, firstStartAt: slots[0].start.toISOString() }] : [];
  });
}

async function candidatesForStart(startAt: Date, deliveryMode: SpeakingAppointmentMode) {
  const date = localDateKey(startAt, speakingConfig.defaultTimezone);
  const candidates: Array<{ examinerId: string; slot: SpeakingSlot }> = [];
  for (const result of await examinerSlots(date, deliveryMode)) {
    const slot = result.slots.find((item) => item.start.getTime() === startAt.getTime());
    if (slot) candidates.push({ examinerId: result.examinerId, slot });
  }
  return candidates;
}

function isSlotRace(error: unknown) {
  const code = (error as { code?: string }).code;
  return code === 'P2002' || code === 'P2034' || code === 'P2004';
}

export async function bookSpeakingAppointment(input: {
  user: User;
  attemptId: string;
  startAt: Date;
  learnerTimezone: string;
  deliveryMode: SpeakingAppointmentMode;
}) {
  if (!speakingConfig.enabled) throw new Error('SPEAKING_NOT_CONFIGURED');
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: input.attemptId, userId: input.user.id },
    select: { id: true },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
  const previous = await prisma.speakingAppointment.findUnique({
    where: { attemptId: input.attemptId }, include: { session: { select: { id: true, state: true } } },
  });
  if (previous && !['CANCELLED_BY_LEARNER', 'CANCELLED_BY_EXAMINER'].includes(previous.status)) throw new Error('APPOINTMENT_CONFLICT');
  if (previous?.session && previous.session.state !== 'READY') throw new Error('APPOINTMENT_CONFLICT');

  const candidates = await candidatesForStart(input.startAt, input.deliveryMode);
  if (!candidates.length) throw new Error('SLOT_CONFLICT');
  for (const { examinerId, slot } of candidates) {
    try {
      return await prisma.$transaction(async (tx) => {
        const appointment = previous
          ? await tx.speakingAppointment.update({
            where: { id: previous.id },
            data: {
              examinerId,
              scheduledStartAt: slot.start,
              scheduledEndAt: slot.end,
              learnerTimezone: input.learnerTimezone,
              deliveryMode: input.deliveryMode,
              status: 'BOOKED', cancelledAt: null, cancellationNote: null,
            },
          })
          : await tx.speakingAppointment.create({ data: {
            attemptId: input.attemptId,
            learnerId: input.user.id,
            examinerId,
            scheduledStartAt: slot.start,
            scheduledEndAt: slot.end,
            learnerTimezone: input.learnerTimezone,
            deliveryMode: input.deliveryMode,
          } });
        const session = previous?.session
          ? await tx.speakingSession.update({ where: { id: previous.session.id }, data: {
            rtcProvider: speakingConfig.rtcProvider,
            rtcRoomName: `speaking-${appointment.id}-${randomUUID().slice(0, 8)}`,
            consentRecordId: null, recordingConsentAt: null, recordingPolicyVersion: null,
          } })
          : await tx.speakingSession.create({ data: {
            appointmentId: appointment.id,
            rtcProvider: speakingConfig.rtcProvider,
            rtcRoomName: `speaking-${appointment.id}-${randomUUID().slice(0, 8)}`,
          } });
        return { appointmentId: appointment.id, sessionId: session.id };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!isSlotRace(error)) throw error;
    }
  }
  throw new Error('SLOT_CONFLICT');
}

export async function cancelSpeakingAppointment(user: User, appointmentId: string, note?: string) {
  const appointment = await prisma.speakingAppointment.findUnique({
    where: { id: appointmentId },
    include: { session: { select: { state: true } } },
  });
  if (!appointment) throw new Error('APPOINTMENT_NOT_FOUND');
  const examiner = user.role === 'TEACHER' || user.role === 'ADMIN';
  if (!canManageSpeakingAppointment(user, appointment)) throw new Error('FORBIDDEN');
  if (appointment.status !== 'BOOKED') throw new Error('APPOINTMENT_CONFLICT');
  if (appointment.session && appointment.session.state !== 'READY') throw new Error('APPOINTMENT_ALREADY_STARTED');
  if (!examiner && !canCancelAppointment(appointment.scheduledStartAt, new Date(), speakingConfig.cancellationHours)) {
    throw new Error('CANCELLATION_WINDOW_CLOSED');
  }
  return prisma.speakingAppointment.update({
    where: { id: appointment.id },
    data: {
      status: examiner ? 'CANCELLED_BY_EXAMINER' : 'CANCELLED_BY_LEARNER',
      cancelledAt: new Date(),
      cancellationNote: note?.slice(0, 500),
    },
  });
}

export async function rescheduleSpeakingAppointment(input: {
  user: User;
  appointmentId: string;
  startAt: Date;
  learnerTimezone: string;
  deliveryMode: SpeakingAppointmentMode;
}) {
  const existing = await prisma.speakingAppointment.findUnique({
    where: { id: input.appointmentId },
    include: { session: { select: { id: true, state: true } } },
  });
  if (!existing) throw new Error('APPOINTMENT_NOT_FOUND');
  const examiner = input.user.role === 'TEACHER' || input.user.role === 'ADMIN';
  if (!canManageSpeakingAppointment(input.user, existing)) throw new Error('FORBIDDEN');
  if (existing.status !== 'BOOKED' || (existing.session && existing.session.state !== 'READY')) throw new Error('APPOINTMENT_ALREADY_STARTED');
  if (!examiner && !canCancelAppointment(existing.scheduledStartAt, new Date(), speakingConfig.cancellationHours)) throw new Error('CANCELLATION_WINDOW_CLOSED');

  const candidates = examiner
    ? (await candidatesForStart(input.startAt, input.deliveryMode)).filter((item) => item.examinerId === existing.examinerId)
    : await candidatesForStart(input.startAt, input.deliveryMode);
  if (!candidates.length) throw new Error('SLOT_CONFLICT');
  for (const { examinerId, slot } of candidates) {
    try {
      return await prisma.$transaction(async (tx) => {
        const appointment = await tx.speakingAppointment.update({
          where: { id: existing.id, status: 'BOOKED' },
          data: {
            examinerId,
            scheduledStartAt: slot.start,
            scheduledEndAt: slot.end,
            learnerTimezone: input.learnerTimezone,
            deliveryMode: input.deliveryMode,
          },
        });
        if (existing.session) await tx.speakingSession.update({
          where: { id: existing.session.id, state: 'READY' },
          data: {
            rtcRoomName: `speaking-${appointment.id}-${randomUUID().slice(0, 8)}`,
            consentRecordId: null, recordingConsentAt: null, recordingPolicyVersion: null,
          },
        });
        return { appointmentId: appointment.id };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!isSlotRace(error)) throw error;
    }
  }
  throw new Error('SLOT_CONFLICT');
}
