import { z } from 'zod';
import { requireLiveAttemptExecution } from '@/lib/attempts/execution-lease';
import { beginListeningPlayback } from '@/lib/audio/listening-playback';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';

const startSchema = z.object({
  stimulusId: z.string().uuid(),
  playbackToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
}).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { attemptId } = await params;
    const user = await requireRequestUser(request, ['STUDENT']);
    const device = await requireRequestDeviceSlot(request, user.id);
    await requireLiveAttemptExecution({
      request,
      attemptId,
      userId: user.id,
      deviceSlotId: device.id,
    });
    const input = startSchema.parse(await request.json());
    const playback = await beginListeningPlayback({
      attemptId,
      userId: user.id,
      deviceSlotId: device.id,
      ...input,
    });
    const query = new URLSearchParams({ attemptId });
    if (playback.strict) {
      query.set('stimulusId', input.stimulusId);
      query.set('playbackToken', input.playbackToken);
    }
    return noStoreJson({
      audioUrl: `/api/test-assets/${playback.assetId}?${query.toString()}`,
    });
  } catch (error) {
    return apiError(error, 'LISTENING_AUDIO_START_FAILED');
  }
}
