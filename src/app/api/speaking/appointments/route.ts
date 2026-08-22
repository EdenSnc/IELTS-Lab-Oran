import { z } from 'zod';
import prisma from '@/lib/prisma';
import { isExaminer, requirePrivilegedRequestUser, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { bookSpeakingAppointment } from '@/lib/speaking/booking-service';
import { speakingConfig } from '@/lib/speaking/config';

const timezoneSchema = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
  catch { return false; }
}, 'Invalid IANA timezone');

const bookingSchema = z.object({
  attemptId: z.uuid(),
  startAt: z.iso.datetime({ offset: true }),
  learnerTimezone: timezoneSchema,
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON']),
});

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    if (isExaminer(user.role)) await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const examiner = isExaminer(user.role);
    const url = new URL(request.url);
    const requestedExaminerId = url.searchParams.get('examinerId');
    const where = !examiner
      ? { learnerId: user.id }
      : user.role === 'ADMIN'
        ? requestedExaminerId ? { examinerId: requestedExaminerId } : {}
        : { examinerId: user.id };
    const appointments = await prisma.speakingAppointment.findMany({
      where,
      include: {
        learner: { select: { id: true, name: true } },
        examiner: { select: { id: true, name: true } },
        attempt: { select: { blueprint: { select: { name: true, version: true } } } },
        session: {
          select: {
            id: true,
            state: true,
            startedAt: true,
            endedAt: true,
            assessments: { select: { stage: true }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { scheduledStartAt: 'asc' },
      take: 250,
    });
    const eligibleAttempts = examiner ? [] : await prisma.assessmentAttempt.findMany({
      where: {
        userId: user.id,
        state: { in: ['SUBMITTED', 'GRADING', 'COMPLETED'] },
        speakingAppointment: null,
      },
      select: {
        id: true,
        createdAt: true,
        submittedAt: true,
        blueprint: { select: { name: true, version: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const safeAppointments = examiner ? appointments : appointments.map((appointment) => Object.fromEntries(
      Object.entries(appointment).filter(([key]) => key !== 'examinerId' && key !== 'examiner'),
    ));
    return noStoreJson({
      appointments: safeAppointments,
      eligibleAttempts,
      viewer: { id: user.id, role: user.role, name: user.name },
      booking: {
        timezone: speakingConfig.defaultTimezone,
        slotMinutes: speakingConfig.slotMinutes,
        centreName: speakingConfig.centreName,
        centreAddress: speakingConfig.centreAddress,
      },
    });
  } catch (error) {
    return apiError(error, 'SPEAKING_APPOINTMENTS_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    const input = bookingSchema.parse(await request.json());
    const result = await bookSpeakingAppointment({ ...input, user, startAt: new Date(input.startAt) });
    return noStoreJson(result, 201);
  } catch (error) {
    return apiError(error, 'SPEAKING_BOOKING_FAILED');
  }
}
