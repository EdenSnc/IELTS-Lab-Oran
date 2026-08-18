import 'server-only';

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { TrackSource } from '@livekit/protocol';
import { speakingConfig } from './config';

export type SpeakingRtcCredentials = { provider: 'livekit'; serverUrl: string; token: string; roomName: string };

function liveKitConfig() {
  const serverUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!serverUrl || !apiKey || !apiSecret) throw new Error('SPEAKING_RTC_NOT_CONFIGURED');
  return { serverUrl, apiKey, apiSecret };
}

export function assertSpeakingRecordingConfigured() {
  const required = [
    process.env.SPEAKING_RECORDING_S3_ENDPOINT,
    process.env.SPEAKING_RECORDING_S3_ACCESS_KEY,
    process.env.SPEAKING_RECORDING_S3_SECRET_KEY,
    process.env.PRIVATE_SPEAKING_RECORDING_BUCKET,
  ];
  if (required.some((value) => !value)) throw new Error('SPEAKING_RECORDING_NOT_CONFIGURED');
}

export async function createSpeakingRtcCredentials(input: {
  roomName: string;
  sessionId: string;
  participantRole: 'learner' | 'examiner';
}): Promise<SpeakingRtcCredentials> {
  if (speakingConfig.rtcProvider !== 'livekit') throw new Error('SPEAKING_RTC_NOT_CONFIGURED');
  const config = liveKitConfig();
  const roomClient = new RoomServiceClient(config.serverUrl, config.apiKey, config.apiSecret);
  try {
    await roomClient.createRoom({
      name: input.roomName,
      emptyTimeout: 20 * 60,
      departureTimeout: 10 * 60,
      maxParticipants: 2,
      metadata: JSON.stringify({ type: 'ielts-speaking', sessionId: input.sessionId }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('already exists')) throw error;
  }
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: `${input.participantRole}:${input.sessionId}`,
    name: input.participantRole === 'examiner' ? 'Examiner' : 'Candidate',
    ttl: speakingConfig.tokenTtlSeconds,
    metadata: JSON.stringify({ sessionId: input.sessionId, role: input.participantRole }),
  });
  token.addGrant({
    room: input.roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA],
  });
  return { provider: 'livekit', serverUrl: config.serverUrl, token: await token.toJwt(), roomName: input.roomName };
}
