import prisma from '@/lib/prisma';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError } from '@/lib/http/api';
import { fetchPrivateAsset } from '@/lib/content/private-asset-storage';
import { canReadSpeakingRecording } from '@/lib/speaking/permissions';

export async function GET(request: Request, context: { params: Promise<{ recordingId: string }> }) {
  try {
    const user = await requireRequestUser(request, ['TEACHER', 'ADMIN']);
    const { recordingId } = await context.params;
    const recording = await prisma.speakingRecording.findUnique({
      where: { id: recordingId },
      include: { session: { include: { appointment: true } } },
    });
    if (!recording || !recording.storageKey || recording.status !== 'READY') throw new Error('RECORDING_NOT_FOUND');
    if (!canReadSpeakingRecording(user, recording.session.appointment)) throw new Error('FORBIDDEN');
    const upstream = await fetchPrivateAsset(
      recording.storageKey,
      request.headers.get('range'),
      process.env.PRIVATE_SPEAKING_RECORDING_BUCKET ?? 'private-speaking-recordings',
    );
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Content-Type', recording.contentType ?? headers.get('Content-Type') ?? 'audio/ogg');
    headers.set('Content-Disposition', 'inline');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return apiError(error, 'SPEAKING_RECORDING_FAILED');
  }
}
