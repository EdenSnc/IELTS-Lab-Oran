'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { speakingApi } from '@/lib/speaking/client-api';
import SpeakingCall from './SpeakingCall';

type SessionData = { id: string; state: string; currentPart: string | null; startedAt: string | null; contentSnapshot: unknown; examinerNotes: string | null; appointment: { deliveryMode: 'ONLINE' | 'IN_PERSON'; learner: { name: string | null } } };

export default function ExaminerWorkstation({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [notes, setNotes] = useState('');
  const [criterion, setCriterion] = useState('FC');
  const [markerNote, setMarkerNote] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [partTimer, setPartTimer] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [message, setMessage] = useState('');
  const notesLoaded = useRef(false);
  const refresh = useCallback(() => speakingApi<{ session: SessionData }>(`/api/speaking/sessions/${sessionId}`).then((data) => {
    setSession(data.session);
    if (!notesLoaded.current) { setNotes(data.session.examinerNotes ?? ''); notesLoaded.current = true; }
  }), [sessionId]);
  useEffect(() => { void refresh().catch((error) => setMessage(error.message)); const id = window.setInterval(() => void refresh(), 5_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { const id = window.setInterval(() => { if (session?.startedAt) setElapsed(Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))); if (timerRunning) setPartTimer((value) => Math.max(0, value - 1)); }, 1_000); return () => clearInterval(id); }, [session?.startedAt, timerRunning]);
  const marker = useCallback(async () => { try { await speakingApi(`/api/speaking/sessions/${sessionId}/events`, { method: 'PATCH', body: JSON.stringify({ action: 'mark', criterion, note: markerNote || undefined }) }); setMarkerNote(''); setMessage('Evidence marked.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Marker failed'); } }, [criterion, markerNote, sessionId]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.ctrlKey && event.key.toLowerCase() === 'm') { event.preventDefault(); void marker(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [marker]);
  async function action(actionName: 'start' | 'part2' | 'part3' | 'end') { if (actionName === 'end' && !window.confirm('End this Speaking session?')) return; try { await speakingApi(`/api/speaking/sessions/${sessionId}/events`, { method: 'PATCH', body: JSON.stringify({ action: actionName }) }); if (actionName === 'part2') { setPartTimer(60); setTimerRunning(false); } await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed'); } }
  async function saveNotes() { try { await speakingApi(`/api/speaking/sessions/${sessionId}/events`, { method: 'PATCH', body: JSON.stringify({ action: 'saveNotes', notes }) }); setMessage('Private notes saved.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Notes could not be saved'); } }
  const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const ended = session?.state === 'ENDED' || session?.state === 'AWAITING_HUMAN_SCORE' || session?.state === 'READY_FOR_REVIEW' || session?.state === 'FINALIZED';
  const online = session?.appointment.deliveryMode !== 'IN_PERSON';
  return <main className="min-h-screen bg-[#efeee9]"><header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-7"><TestBrand compact /><div className="flex items-center gap-3 text-sm"><span className={`speaking-status-dot ${online ? 'is-live' : ''}`} />{online ? 'Online session' : 'In-centre session'} <strong>{clock(elapsed)}</strong></div></header>
    <div className="mx-auto max-w-[1500px] p-3 sm:p-5">{message && <p className="mb-3 rounded-lg bg-white px-4 py-2 text-sm">{message}</p>}<div className={`grid gap-4 ${online ? 'xl:grid-cols-[minmax(340px,.75fr)_minmax(480px,1.25fr)]' : ''}`}>
      {online && <SpeakingCall sessionId={sessionId} cameraAvailable disconnectWhen={ended} />}
      <section className="rounded-2xl border border-[#d4d3ce] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#c8102e]">{session?.appointment.learner.name ?? 'Candidate'}</p><h1 className="text-2xl font-bold">{session?.currentPart?.replace('_', ' ') ?? 'Ready to begin'}</h1></div><div className="flex gap-2"><button className="rounded-lg bg-black px-4 py-2 font-bold text-white disabled:opacity-30" disabled={session?.state !== 'READY'} onClick={() => action('start')}>Start Part 1</button><button className="rounded-lg border border-black px-4 py-2 font-bold disabled:opacity-30" disabled={session?.state !== 'LIVE_PART_1'} onClick={() => action('part2')}>Part 2</button><button className="rounded-lg border border-black px-4 py-2 font-bold disabled:opacity-30" disabled={session?.state !== 'LIVE_PART_2'} onClick={() => action('part3')}>Part 3</button></div></div>
        <div className="mt-5 rounded-xl bg-[#f5f4f0] p-5"><h2 className="font-bold">Current question</h2><p className="mt-3 text-lg">Use the versioned Speaking prompt attached to this attempt. Part 3 remains examiner-led: probe and follow up naturally.</p>{session?.state === 'LIVE_PART_2' && <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4"><strong>Part 2 timer: {clock(partTimer)}</strong><button className="rounded-lg bg-white px-3 py-2 font-bold" onClick={() => { setPartTimer(60); setTimerRunning(true); }}>Start 1:00 preparation</button><button className="rounded-lg bg-white px-3 py-2 font-bold" onClick={() => { setPartTimer(120); setTimerRunning(true); }}>Start 2:00 long turn</button><button className="rounded-lg bg-white px-3 py-2 font-bold" onClick={() => setTimerRunning(false)}>Pause</button></div>}</div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><div><label className="grid gap-2 font-bold">Examiner notes<textarea className="min-h-40 rounded-xl border p-3 font-normal" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private working notes" /></label><button className="mt-2 rounded-lg border border-black px-4 py-2 text-sm font-bold" onClick={() => void saveNotes()}>Save notes</button></div><div><h2 className="font-bold">Timestamped evidence</h2><div className="mt-2 flex gap-2"><select className="rounded-lg border px-2" value={criterion} onChange={(e) => setCriterion(e.target.value)}><option>FC</option><option>LR</option><option>GRA</option><option>P</option></select><input className="min-w-0 flex-1 rounded-lg border px-3" value={markerNote} onChange={(e) => setMarkerNote(e.target.value)} placeholder="Optional note" /></div><button className="mt-2 w-full rounded-lg bg-[#c8102e] px-4 py-3 font-bold text-white" onClick={() => void marker()}>MARK EVIDENCE <small className="ml-2">Ctrl+M</small></button></div></div>
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">{ended ? <Link href={`/speaking/review/${sessionId}`} className="rounded-lg bg-black px-5 py-3 font-bold text-white">Open post-call assessment</Link> : <button className="rounded-lg bg-[#8b0028] px-5 py-3 font-bold text-white" onClick={() => action('end')}>End session</button>}</div>
      </section>
    </div></div>
  </main>;
}
