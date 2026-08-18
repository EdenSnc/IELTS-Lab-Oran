'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionQuality, Room, RoomEvent, Track, VideoPresets, type RemoteTrack } from 'livekit-client';
import { speakingApi } from '@/lib/speaking/client-api';

type Credentials = { serverUrl: string; token: string; roomName: string; videoEnabled: boolean; role: 'learner' | 'examiner' };

export default function SpeakingCall({ sessionId, cameraAvailable, disconnectWhen = false, onReady }: { sessionId: string; cameraAvailable: boolean; disconnectWhen?: boolean; onReady?: (room: Room) => void }) {
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const audioHost = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState('Connecting…');
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [cameraOn, setCameraOn] = useState(cameraAvailable);
  const [micOn, setMicOn] = useState(true);
  const [remoteLabel, setRemoteLabel] = useState('Other participant');

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    room?.localParticipant.trackPublications.forEach((publication) => publication.track?.stop());
    await room?.disconnect(true);
    roomRef.current = null;
    audioHost.current?.querySelectorAll('audio').forEach((element) => { element.pause(); element.srcObject = null; element.remove(); });
    if (remoteVideo.current) { remoteVideo.current.pause(); remoteVideo.current.srcObject = null; }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch { /* Browser-owned media UI. */ }
    }
    setStatus('Disconnected');
  }, []);

  useEffect(() => {
    let active = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h360.resolution, frameRate: 15 },
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    roomRef.current = room;
    const attach = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteVideo.current) track.attach(remoteVideo.current);
      if (track.kind === Track.Kind.Audio && audioHost.current) audioHost.current.appendChild(track.attach());
    };
    const detach = (track: RemoteTrack) => track.detach().forEach((element) => element.remove());
    room.on(RoomEvent.TrackSubscribed, attach)
      .on(RoomEvent.TrackUnsubscribed, detach)
      .on(RoomEvent.ConnectionQualityChanged, (next) => setQuality(next))
      .on(RoomEvent.Reconnecting, () => setStatus('Reconnecting — audio will resume automatically…'))
      .on(RoomEvent.Reconnected, () => setStatus('Connected'))
      .on(RoomEvent.Disconnected, () => setStatus('Disconnected'));
    void speakingApi<Credentials>(`/api/speaking/sessions/${sessionId}/token`, { method: 'POST' })
      .then(async (credentials) => {
        setRemoteLabel(credentials.role === 'examiner' ? 'Candidate' : 'Examiner');
        room.prepareConnection(credentials.serverUrl, credentials.token);
        await room.connect(credentials.serverUrl, credentials.token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        if (credentials.videoEnabled && cameraAvailable) {
          try { await room.localParticipant.setCameraEnabled(true, { resolution: VideoPresets.h360.resolution, frameRate: 15 }); }
          catch { setCameraOn(false); }
        }
        if (active) { setStatus('Connected'); onReady?.(room); }
      })
      .catch((error) => active && setStatus(error instanceof Error ? error.message : 'Unable to join'));
    return () => {
      active = false;
      room.removeAllListeners();
      void disconnect();
    };
  }, [cameraAvailable, disconnect, onReady, sessionId]);

  useEffect(() => {
    if (!disconnectWhen) return;
    const timer = window.setTimeout(() => void disconnect(), 0);
    return () => window.clearTimeout(timer);
  }, [disconnect, disconnectWhen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void speakingApi<{ session: { state: string } }>(`/api/speaking/sessions/${sessionId}`)
        .then(({ session }) => {
          if (!['READY', 'LIVE_PART_1', 'LIVE_PART_2', 'LIVE_PART_3'].includes(session.state)) void disconnect();
        })
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [disconnect, sessionId]);

  async function toggleMic() {
    const next = !micOn;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }
  async function toggleCamera() {
    const next = !cameraOn;
    try { await roomRef.current?.localParticipant.setCameraEnabled(next, { resolution: VideoPresets.h360.resolution, frameRate: 15 }); setCameraOn(next); }
    catch { setCameraOn(false); }
  }
  async function leave() {
    await disconnect();
  }

  return (
    <section className="speaking-call-card" aria-label="Live Speaking call">
      <div className="speaking-call-status"><span className={`speaking-status-dot ${status === 'Connected' ? 'is-live' : ''}`} />{status}<span className="ml-auto text-xs">Connection: {quality}</span></div>
      <div className="speaking-remote-video"><video ref={remoteVideo} autoPlay playsInline /><p>{remoteLabel} video appears here. Audio remains active if video is unavailable.</p></div>
      <div ref={audioHost} className="hidden" />
      <div className="speaking-call-controls">
        <button type="button" onClick={toggleMic}>{micOn ? 'Mute microphone' : 'Turn microphone on'}</button>
        {cameraAvailable && <button type="button" onClick={toggleCamera}>{cameraOn ? 'Turn camera off' : 'Turn camera on'}</button>}
        <button type="button" className="is-danger" onClick={leave}>Leave call</button>
      </div>
    </section>
  );
}
