import { z } from 'zod';
import { isExaminer, requirePrivilegedRequestUser, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { cancelSpeakingAppointment, rescheduleSpeakingAppointment } from '@/lib/speaking/booking-service';

const timezoneSchema = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
  catch { return false; }
}, 'Invalid IANA timezone');

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel'), note: z.string().max(500).optional() }),
  z.object({
    action: z.literal('reschedule'),
    startAt: z.iso.datetime({ offset: true }),
    learnerTimezone: timezoneSchema,
    deliveryMode: z.enum(['ONLINE', 'IN_PERSON']),
  }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ appointmentId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    if (isExaminer(user.role)) await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const { appointmentId } = await context.params;
    const input = actionSchema.parse(await request.json());
    if (input.action === 'cancel') {
      const appointment = await cancelSpeakingAppointment(user, appointmentId, input.note);
      return noStoreJson({ appointmentId: appointment.id, status: appointment.status });
    }
    const result = await rescheduleSpeakingAppointment({
      user,
      appointmentId,
      startAt: new Date(input.startAt),
      learnerTimezone: input.learnerTimezone,
      deliveryMode: input.deliveryMode,
    });
    return noStoreJson(result);
  } catch (error) {
    return apiError(error, 'SPEAKING_APPOINTMENT_UPDATE_FAILED');
  }
}
