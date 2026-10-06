'use client';
import { useEffect, useRef, useState } from 'react';
import type { DiagnosticAudioTrack } from '@/lib/diagnostic/delivery-protocol';
import { diagnosticMessages, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import styles from './diagnostic.module.css';

/** Playback follows the section clock, not question navigation or an OS pause button. */
export default function DiagnosticAudio({ tracks, elapsedSeconds, locale, enabled }: {
  tracks: DiagnosticAudioTrack[]; elapsedSeconds: number; locale: DiagnosticLocale; enabled: boolean;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  const m = diagnosticMessages[locale];
  let elapsed = Math.max(0, elapsedSeconds);
  let track: DiagnosticAudioTrack | undefined;
  for (const candidate of tracks) {
    if (elapsed < candidate.durationSeconds) { track = candidate; break; }
    elapsed -= candidate.durationSeconds;
  }
  const offset = elapsed;
  async function play() {
    const audio = player.current;
    if (!audio || !enabled || !track) return;
    try {
      if (audio.readyState >= 1 && Math.abs(audio.currentTime - offset) > 3) audio.currentTime = offset;
      await audio.play(); setFailed(false);
    } catch { setFailed(true); }
  }
  useEffect(() => {
    const audio = player.current;
    if (!audio) return;
    if (!enabled) { audio.pause(); return; }
    if (audio.readyState >= 1 && Math.abs(audio.currentTime - offset) > 3) audio.currentTime = offset;
    if (audio.paused && !audio.ended) void audio.play().catch(() => setFailed(true));
  }, [enabled, offset, track?.id]);
  useEffect(() => {
    const audio = player.current;
    return () => {
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; }
    };
  }, [track?.id]);
  return <section className={styles.panel} aria-label={m.audio}>
    <h2>{m.audio}</h2><p className={styles.meta}>{m.audioHelp}</p>
    {track && <audio key={track.id} ref={player} src={track.url} preload="auto" aria-label={m.audio}
      data-diagnostic-audio={track.id} onLoadedMetadata={() => { if (player.current) player.current.currentTime = offset; void play(); }}
      onCanPlay={() => { void play(); }} onPlaying={() => setFailed(false)}
      onError={() => setFailed(true)} onStalled={() => setFailed(true)} />}
    {failed && track && <><p role="alert" className={styles.notice}>{m.audioFailed}</p>
      <button type="button" className={styles.secondary} disabled={!enabled} onClick={() => { player.current?.load(); void play(); }}>{m.retryAudio}</button></>}
  </section>;
}
