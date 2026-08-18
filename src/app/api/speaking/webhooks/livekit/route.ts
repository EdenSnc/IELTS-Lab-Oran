import { EgressClient, WebhookReceiver } from 'livekit-server-sdk';
import { DirectFileOutput, S3Upload, TrackSource } from '@livekit/protocol';
import prisma from '@/lib/prisma';
import { apiError, noStoreJson } from '@/lib/http/api';

function recordingKind(filename: string) {
  const value = filename.toLowerCase();
  if (value.includes('learner') || value.includes('candidate')) return 'CANDIDATE_AUDIO' as const;
  if (value.includes('examiner')) return 'EXAMINER_AUDIO' as const;
  if (value.endsWith('.mp4') || value.endsWith('.webm')) return 'OPTIONAL_VIDEO' as const;
  return 'MIXED_AUDIO' as const;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error('SPEAKING_RTC_NOT_CONFIGURED');
    const raw = await request.text();
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(raw, request.headers.get('authorization') ?? request.headers.get('authorize') ?? undefined);
    const roomName = event.room?.name ?? event.egressInfo?.roomName;
    if (!roomName) return noStoreJson({ received: true });
    const session = await prisma.speakingSession.findUnique({ where: { rtcRoomName: roomName }, select: { id: true, state: true } });
    if (!session) return noStoreJson({ received: true });

    if (event.event === 'track_published' && event.track?.source === TrackSource.MICROPHONE && event.participant) {
      const identity = event.participant.identity;
      const kind = identity.startsWith('learner:') ? 'CANDIDATE_AUDIO' as const : identity.startsWith('examiner:') ? 'EXAMINER_AUDIO' as const : null;
      if (kind) {
        const endpoint = process.env.SPEAKING_RECORDING_S3_ENDPOINT;
        const accessKey = process.env.SPEAKING_RECORDING_S3_ACCESS_KEY;
        const secret = process.env.SPEAKING_RECORDING_S3_SECRET_KEY;
        const bucket = process.env.PRIVATE_SPEAKING_RECORDING_BUCKET;
        if (!endpoint || !accessKey || !secret || !bucket) throw new Error('SPEAKING_RECORDING_NOT_CONFIGURED');
        let recording = await prisma.speakingRecording.findFirst({ where: { sessionId: session.id, kind, providerCallbackId: null }, orderBy: { createdAt: 'asc' } });
        if (!recording) recording = await prisma.speakingRecording.create({ data: { sessionId: session.id, kind, status: 'REQUESTED' } });
        const claimed = await prisma.speakingRecording.updateMany({ where: { id: recording.id, providerCallbackId: null }, data: { providerCallbackId: event.id } });
        if (claimed.count) {
          try {
            const egress = new EgressClient(process.env.LIVEKIT_URL!, apiKey, apiSecret);
            const output = new DirectFileOutput({
              filepath: `speaking/${session.id}/${kind === 'CANDIDATE_AUDIO' ? 'candidate' : 'examiner'}-audio-{time}`,
              disableManifest: true,
              output: { case: 's3', value: new S3Upload({
                endpoint, accessKey, secret, bucket,
                region: process.env.SPEAKING_RECORDING_S3_REGION ?? 'auto',
                forcePathStyle: true,
                metadata: {}, contentDisposition: 'private',
              }) },
            });
            const info = await egress.startTrackEgress(roomName, output, event.track.sid);
            await prisma.speakingRecording.update({ where: { id: recording.id }, data: { status: 'RECORDING', providerArtifactId: info.egressId, contentType: 'audio/ogg' } });
          } catch (error) {
            await prisma.speakingRecording.update({ where: { id: recording.id }, data: { status: 'FAILED', errorCode: 'EGRESS_START_FAILED', providerCallbackId: null } });
            throw error;
          }
        }
      }
    }

    if (event.event === 'egress_started') {
      await prisma.speakingRecording.updateMany({ where: { sessionId: session.id, status: 'REQUESTED' }, data: { status: 'RECORDING' } });
    }
    if (event.event === 'egress_updated') {
      await prisma.speakingRecording.updateMany({ where: { sessionId: session.id, status: { in: ['REQUESTED', 'RECORDING'] } }, data: { status: 'PROCESSING' } });
    }
    if (event.event === 'egress_ended' && event.egressInfo) {
      const info = event.egressInfo;
      if (info.error || info.errorCode) {
        await prisma.speakingRecording.updateMany({
          where: { sessionId: session.id, status: { not: 'READY' } },
          data: { status: 'FAILED', errorCode: String(info.errorCode || 'EGRESS_FAILED') },
        });
      } else {
        for (const [index, file] of info.fileResults.entries()) {
          const kind = recordingKind(file.filename);
          const placeholder = await prisma.speakingRecording.findFirst({
            where: { sessionId: session.id, kind, storageKey: null }, orderBy: { createdAt: 'asc' },
          });
          const data = {
            kind,
            status: 'READY' as const,
            providerArtifactId: `${info.egressId}:${index}`,
            providerCallbackId: `${event.id}:${index}`,
            storageKey: file.filename,
            durationMs: Math.round(Number(file.duration) / 1_000_000),
          };
          if (placeholder) await prisma.speakingRecording.update({ where: { id: placeholder.id }, data });
          else await prisma.speakingRecording.upsert({
            where: { providerCallbackId: data.providerCallbackId },
            create: { sessionId: session.id, ...data },
            update: data,
          });
        }
      }
      if (session.state === 'ENDED' || session.state === 'RECORDING_PROCESSING') {
        await prisma.speakingSession.update({ where: { id: session.id }, data: { state: 'AWAITING_HUMAN_SCORE' } });
      }
    }
    return noStoreJson({ received: true });
  } catch (error) {
    return apiError(error, 'SPEAKING_WEBHOOK_FAILED');
  }
}
