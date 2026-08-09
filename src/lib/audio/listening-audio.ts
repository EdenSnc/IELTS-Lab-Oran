'use client';

let listeningPlayer: HTMLAudioElement | null = null;
let listeningSource = '';
let listeningActive = false;

const MEDIA_ACTIONS: MediaSessionAction[] = [
  'play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto',
  'previoustrack', 'nexttrack',
];

function absoluteSource(source: string) {
  return new URL(source, window.location.href).href;
}

export function getListeningAudio(source: string) {
  const absolute = absoluteSource(source);
  if (!listeningPlayer || listeningSource !== absolute) {
    listeningPlayer?.pause();
    listeningPlayer = new Audio(absolute);
    listeningPlayer.preload = 'auto';
    listeningSource = absolute;
  }
  return listeningPlayer;
}

export function startListeningAudio(source: string) {
  listeningActive = true;
  const player = getListeningAudio(source);
  player.load();
  return player.play();
}

export function isListeningAudioActive() {
  return listeningActive;
}

export function stopListeningAudio() {
  listeningActive = false;
  if (listeningPlayer) {
    listeningPlayer.pause();
    listeningPlayer.removeAttribute('src');
    listeningPlayer.load();
    listeningPlayer = null;
    listeningSource = '';
  }
  if ('mediaSession' in navigator) {
    for (const action of MEDIA_ACTIONS) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Browsers expose different action subsets.
      }
    }
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}
