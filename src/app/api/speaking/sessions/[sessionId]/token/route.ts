import prisma from '@/lib/prisma';
import { isExaminer, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { speakingConfig } from '@/lib/speaking/config';
import { assertSpeakingRecordingConfigured, createSpeakingRtcCredentials } from '@/lib/speaking/rtc-provider';
import { canJoinSpeakingSession } from '@/lib/speaking/permissions';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { sessionId } = await context.params;
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: { appointment: true },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    const examiner = isExaminer(user.role) && (user.role === 'ADMIN' || session.appointment.examinerId === user.id);
    const learner = session.appointment.learnerId === user.id;
    if (!canJoinSpeakingSession(user, session.appointment)) throw new Error('FORBIDDEN');
    if (session.appointment.deliveryMode !== 'ONLINE') throw new Error('IN_PERSON_APPOINTMENT');
    if (learner && !session.recordingConsentAt) throw new Error('RECORDING_CONSENT_REQUIRED');
    assertSpeakingRecordingConfigured();
    if (!['READY', 'LIVE_PART_1', 'LIVE_PART_2', 'LIVE_PART_3'].includes(session.state) || session.appointment.status !== 'BOOKED') {
      throw new Error('SESSION_CONFLICT');
    }
    const now = Date.now();
    const opens = session.appointment.scheduledStartAt.getTime() - speakingConfig.joinEarlyMinutes * 60_000;
    const closes = session.appointment.scheduledEndAt.getTime() + 45 * 60_000;
    if (!examiner && (now < opens || now > closes)) throw new Error('JOIN_WINDOW_CLOSED');
    const credentials = await createSpeakingRtcCredentials({
      roomName: session.rtcRoomName,
      sessionId: session.id,
      participantRole: examiner ? 'examiner' : 'learner',
    });
    return noStoreJson({ ...credentials, videoEnabled: speakingConfig.videoEnabled, role: examiner ? 'examiner' : 'learner' });
  } catch (error) {
    return apiError(error, 'SPEAKING_RTC_TOKEN_FAILED');
  }
}
