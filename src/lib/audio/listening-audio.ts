'use client';

let listeningPlayer: HTMLAudioElement | null = null;
let listeningSource = '';

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
  const player = getListeningAudio(source);
  player.load();
  return player.play();
}

export function stopListeningAudio() {
  if (!listeningPlayer) return;
  listeningPlayer.pause();
  listeningPlayer.currentTime = 0;
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
}
