'use client';

import { useRef, useState } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { speakingApi } from '@/lib/speaking/client-api';
import SpeakingCall from './SpeakingCall';

type CheckState = 'idle' | 'checking' | 'ready' | 'blocked';

export default function SpeakingPreflight({ sessionId }: { sessionId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CheckState>('idle');
  const [message, setMessage] = useState('Run the device check before joining.');
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [consent, setConsent] = useState(false);
  const [aiAnalysisConsent, setAiAnalysisConsent] = useState(false);
  const [trainingDataConsent, setTrainingDataConsent] = useState(false);
  const [joined, setJoined] = useState(false);

  async function runCheck() {
    setState('checking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      context.createMediaStreamSource(stream).connect(analyser);
      stream.getTracks().forEach((track) => track.stop());
      await context.close();
    } catch {
      setState('blocked'); setMessage('Microphone access is required. Check browser permission and your selected input device.'); return;
    }
    try {
      const camera = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 } }, audio: false });
      setCameraAvailable(true);
      if (video.current) video.current.srcObject = camera;
      window.setTimeout(() => camera.getTracks().forEach((track) => track.stop()), 5_000);
      setMessage('Microphone and camera are ready.');
    } catch {
      setCameraAvailable(false); setMessage('Microphone is ready. Camera is unavailable, so you may continue audio-only.');
    }
    setState('ready');
  }

  function testOutput() {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    oscillator.connect(gain).connect(context.destination);
    oscillator.frequency.value = 523;
    oscillator.start(); oscillator.stop(context.currentTime + 0.25);
    oscillator.onended = () => void context.close();
  }

  async function join() {
    if (!consent || state !== 'ready') return;
    await speakingApi(`/api/speaking/sessions/${sessionId}/consent`, {
      method: 'POST',
      body: JSON.stringify({
        recording: true,
        aiAnalysis: aiAnalysisConsent,
        trainingData: trainingDataConsent,
      }),
    });
    setJoined(true);
  }

  if (joined) return (
    <main className="min-h-screen bg-[#f6f5f2]"><header className="border-b bg-white px-4 py-3 sm:px-7"><TestBrand /></header><div className="mx-auto max-w-5xl p-4 sm:p-7"><div className="mb-4 flex items-center gap-2 font-bold text-[#c8102e]"><span className="speaking-status-dot is-live" /> Recorded Speaking session</div><SpeakingCall sessionId={sessionId} cameraAvailable={cameraAvailable} /></div></main>
  );

  return (
    <main className="min-h-screen bg-[#f6f5f2]"><header className="border-b bg-white px-4 py-3 sm:px-7"><TestBrand /></header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#c8102e]">Speaking pre-call check</p><h1 className="mt-2 text-3xl font-bold">Make sure we can hear you</h1>
        <section className="mt-7 rounded-2xl border border-[#deddd8] bg-white p-5 sm:p-7">
          <video ref={video} muted autoPlay playsInline className={`mb-5 aspect-video w-full rounded-xl bg-[#202020] object-cover ${cameraAvailable ? '' : 'hidden'}`} />
          <p role="status" className="font-semibold">{message}</p>
          <div className="mt-5 flex flex-wrap gap-3"><button className="rounded-lg bg-black px-4 py-2 font-bold text-white" onClick={runCheck} disabled={state === 'checking'}>{state === 'checking' ? 'Checking…' : 'Check microphone and camera'}</button><button className="rounded-lg border border-black px-4 py-2 font-bold" onClick={testOutput}>Test speakers</button></div>
          <label className="mt-7 flex items-start gap-3 rounded-xl bg-[#f3f2ee] p-4"><input className="mt-1 size-5" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I consent to recording.</strong><br /><small className="text-[#555]">The interview is recorded for assessment and quality review. Recordings remain private and access-controlled.</small></span></label>
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-[#deddd8] p-4"><input className="mt-1 size-5" type="checkbox" checked={aiAnalysisConsent} onChange={(event) => setAiAnalysisConsent(event.target.checked)} /><span><strong>Allow optional AI-assisted analysis.</strong><br /><small className="text-[#555]">Your examiner remains responsible for the final Speaking result.</small></span></label>
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-[#deddd8] p-4"><input className="mt-1 size-5" type="checkbox" checked={trainingDataConsent} onChange={(event) => setTrainingDataConsent(event.target.checked)} /><span><strong>Allow future training-data use.</strong><br /><small className="text-[#555]">Optional. Declining does not affect your interview or score.</small></span></label>
          <button className="mt-5 w-full rounded-lg bg-[#c8102e] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={state !== 'ready' || !consent} onClick={() => void join().catch((error) => setMessage(error.message))}>Join Speaking interview</button>
        </section>
      </div>
    </main>
  );
}
