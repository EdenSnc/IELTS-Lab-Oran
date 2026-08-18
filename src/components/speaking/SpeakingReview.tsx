'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { speakingApi } from '@/lib/speaking/client-api';

type Scores = { fluencyCoherence: number; lexicalResource: number; grammaticalRange: number; pronunciation: number };
type Priority = { criterion: 'FC' | 'LR' | 'GRA' | 'P'; problem: string; evidence: string; whyItMatters: string; recommendedPractice: string };
type AnalysisOutput = { criterionAnalysis: Record<string, { suggestedBand: number | null; confidence: number; evidence: Array<{ startMs: number; endMs: number; observation: string }> }>; suggestedPriorities: Priority[]; transcript: { segments: Array<{ speaker: string; startMs: number; endMs: number; text: string; confidence?: number }> }; warnings: string[] };
type ReviewData = { id: string; state: string; startedAt: string | null; endedAt: string | null; examinerNotes: string | null; disagreementThreshold: number; appointment: { learner: { name: string | null } }; markers: Array<{ id: string; offsetMs: number; criterion: string | null; note: string | null }>; recordings: Array<{ id: string; kind: string; url: string; durationMs: number | null }>; assessments: Array<Scores & { stage: 'PROVISIONAL' | 'FINAL'; overallBand: number; notes?: string | null; priorities?: Priority[] }>; aiAnalyses: Array<{ status: string; output: AnalysisOutput | null }> };

const initialScores: Scores = { fluencyCoherence: 6, lexicalResource: 6, grammaticalRange: 6, pronunciation: 6 };
const fields: Array<[keyof Scores, string, string]> = [['fluencyCoherence', 'FC', 'Fluency & Coherence'], ['lexicalResource', 'LR', 'Lexical Resource'], ['grammaticalRange', 'GRA', 'Grammatical Range & Accuracy'], ['pronunciation', 'P', 'Pronunciation']];

export default function SpeakingReview({ sessionId }: { sessionId: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [data, setData] = useState<ReviewData | null>(null);
  const [scores, setScores] = useState<Scores>(initialScores);
  const [notes, setNotes] = useState('');
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [message, setMessage] = useState('');
  const notesLoaded = useRef(false);
  const refresh = useCallback(() => speakingApi<{ session: ReviewData }>(`/api/speaking/sessions/${sessionId}/review`).then(({ session }) => {
    setData(session);
    const nextProvisional = session.assessments.find((assessment) => assessment.stage === 'PROVISIONAL');
    const nextFinal = session.assessments.find((assessment) => assessment.stage === 'FINAL');
    if (nextProvisional) setScores({ fluencyCoherence: Number(nextProvisional.fluencyCoherence), lexicalResource: Number(nextProvisional.lexicalResource), grammaticalRange: Number(nextProvisional.grammaticalRange), pronunciation: Number(nextProvisional.pronunciation) });
    if (nextFinal?.priorities) setPriorities(nextFinal.priorities.slice(0, 3));
    if (!notesLoaded.current) { setNotes(nextProvisional?.notes ?? session.examinerNotes ?? ''); notesLoaded.current = true; }
  }), [sessionId]);
  useEffect(() => { void refresh().catch((error) => setMessage(error.message)); }, [refresh]);
  const provisional = data?.assessments.find((assessment) => assessment.stage === 'PROVISIONAL');
  const final = data?.assessments.find((assessment) => assessment.stage === 'FINAL');
  const analysis = data?.aiAnalyses[0];
  const aiBands = useMemo(() => analysis?.output ? [analysis.output.criterionAnalysis.fluencyCoherence?.suggestedBand, analysis.output.criterionAnalysis.lexicalResource?.suggestedBand, analysis.output.criterionAnalysis.grammaticalRangeAccuracy?.suggestedBand, analysis.output.criterionAnalysis.pronunciation?.suggestedBand] : [], [analysis]);
  function priorityKey(priority: Priority) { return `${priority.criterion}:${priority.problem}`; }
  function togglePriority(priority: Priority) {
    setPriorities((current) => {
      const selected = current.some((item) => priorityKey(item) === priorityKey(priority));
      if (selected) return current.filter((item) => priorityKey(item) !== priorityKey(priority));
      if (current.length >= 3) { setMessage('Choose at most three final diagnostic priorities.'); return current; }
      return [...current, priority];
    });
  }
  function seek(ms: number) { if (audio.current) { audio.current.currentTime = ms / 1000; void audio.current.play(); } }
  async function save(stage: 'PROVISIONAL' | 'FINAL') { setMessage(stage === 'PROVISIONAL' ? 'Saving your independent assessment…' : 'Publishing final Speaking score…'); try { await speakingApi(`/api/speaking/sessions/${sessionId}/scores`, { method: 'POST', body: JSON.stringify({ stage, ...scores, notes, priorities: stage === 'FINAL' ? priorities : undefined }) }); await refresh(); setMessage(stage === 'PROVISIONAL' ? 'Provisional scores locked. AI review is now available.' : 'Final Speaking result published.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); } }
  async function runAnalysis() { setMessage('Analysis queued…'); try { await speakingApi(`/api/speaking/sessions/${sessionId}/analysis`, { method: 'POST', body: JSON.stringify({ transcriptSegments: [] }) }); await refresh(); setMessage('Analysis ready.'); } catch (error) { setMessage(`${error instanceof Error ? error.message : 'Analysis failed'}. You can still finalize manually.`); } }
  return <main className="min-h-screen bg-[#efeee9]"><header className="border-b bg-white px-4 py-3 sm:px-7"><TestBrand /></header><div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#c8102e]">Post-call assessment</p><h1 className="mt-2 text-3xl font-bold">{data?.appointment.learner.name ?? 'Candidate'} · Speaking review</h1>{message && <p role="status" className="mt-4 rounded-xl bg-white px-4 py-3">{message}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.8fr]">
      <section className="rounded-2xl border border-[#d8d7d1] bg-white p-5"><h2 className="text-xl font-bold">Recording and evidence</h2>{data?.recordings[0] ? <audio ref={audio} className="mt-4 w-full" controls preload="metadata" src={data.recordings[0].url} /> : <p className="mt-4 rounded-lg bg-[#fff7e8] p-3">Recording is still processing. Human scoring remains available.</p>}<div className="mt-5 flex flex-wrap gap-2">{data?.markers.map((marker) => <button key={marker.id} onClick={() => seek(marker.offsetMs)} className="rounded-full border px-3 py-1.5 text-sm"><strong>{Math.floor(marker.offsetMs / 60000)}:{String(Math.floor(marker.offsetMs / 1000) % 60).padStart(2, '0')}</strong> {marker.criterion} {marker.note}</button>)}</div>
        {analysis?.output && <><h3 className="mt-7 text-lg font-bold">Synchronized transcript</h3><div className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-[#f7f6f2] p-4">{analysis.output.transcript.segments.map((segment, index) => <button key={`${segment.startMs}-${index}`} onClick={() => seek(segment.startMs)} className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white ${segment.confidence != null && segment.confidence < .65 ? 'opacity-60' : ''}`}><strong>{Math.floor(segment.startMs / 60000)}:{String(Math.floor(segment.startMs / 1000) % 60).padStart(2, '0')} · {segment.speaker}</strong> {segment.text}</button>)}</div></>}
      </section>
      <aside className="rounded-2xl border border-[#d8d7d1] bg-white p-5"><h2 className="text-xl font-bold">Human assessment</h2><p className="mt-1 text-sm text-[#666]">Enter provisional scores before revealing the independent analysis.</p><div className="mt-4 grid gap-3">{fields.map(([key, code, label]) => <label key={key} className="grid grid-cols-[1fr_86px] items-center gap-3 rounded-lg bg-[#f7f6f2] p-3"><span><strong>{code}</strong><small className="block text-[#666]">{label}</small></span><select className="rounded-lg border bg-white px-2 py-2" value={scores[key]} disabled={Boolean(final)} onChange={(event) => setScores((current) => ({ ...current, [key]: Number(event.target.value) }))}>{Array.from({ length: 19 }, (_, index) => index / 2).map((band) => <option key={band}>{band.toFixed(1)}</option>)}</select></label>)}</div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-4 min-h-24 w-full rounded-lg border p-3" placeholder="Assessment notes" disabled={Boolean(final)} />
        {!provisional && <button className="mt-4 w-full rounded-lg bg-black px-4 py-3 font-bold text-white" onClick={() => save('PROVISIONAL')}>Lock provisional scores</button>}
        {provisional && !analysis?.output && analysis?.status !== 'RUNNING' && <button className="mt-4 w-full rounded-lg bg-[#c8102e] px-4 py-3 font-bold text-white" onClick={runAnalysis}>Run independent analysis</button>}
        {analysis?.status === 'RUNNING' && <p className="mt-4 rounded-lg bg-[#f7f6f2] p-3 font-bold">Pending</p>}
        {analysis?.output && <div className="mt-6 border-t pt-5"><h3 className="font-bold">Human / AI second opinion</h3><div className="mt-3 grid gap-2">{fields.map(([key, code], index) => { const ai = aiBands[index]; const human = Number(provisional?.[key] ?? scores[key]); const disagreement = ai != null && Math.abs(human - ai) >= (data?.disagreementThreshold ?? 1); return <div key={key} className={`flex justify-between rounded-lg px-3 py-2 ${disagreement ? 'bg-[#fff0f2] text-[#8b0028]' : 'bg-[#f7f6f2]'}`}><strong>{code}</strong><span>Human {human.toFixed(1)} · AI {ai == null ? '—' : Number(ai).toFixed(1)}</span></div>; })}</div><div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-bold">Choose final diagnostic priorities</h3><span className="text-xs font-bold">{priorities.length}/3 selected</span></div><div className="mt-2 grid gap-2">{analysis.output.suggestedPriorities.map((priority, index) => { const selected = priorities.some((item) => priorityKey(item) === priorityKey(priority)); return <label key={`${priority.criterion}-${index}`} className={`cursor-pointer rounded-lg border p-3 text-sm ${selected ? 'border-[#c8102e] bg-[#fff5f6]' : ''}`}><span className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={selected} onChange={() => togglePriority(priority)} /><span><strong>{priority.criterion}: {priority.problem}</strong><span className="mt-1 block text-[#666]">{priority.evidence}</span><span className="mt-1 block text-[#666]">Practice: {priority.recommendedPractice}</span></span></span></label>; })}{!analysis.output.suggestedPriorities.length && <p className="text-sm text-[#666]">No diagnostic priorities were suggested. You may finalize manually.</p>}</div></div>}
        {provisional && !final && <button className="mt-5 w-full rounded-lg bg-black px-4 py-3 font-bold text-white" onClick={() => save('FINAL')}>Publish final human score</button>}{final && <p className="mt-5 rounded-lg bg-[#eaf6e3] p-3 font-bold">Final Speaking score: {Number(final.overallBand).toFixed(1)}</p>}
      </aside>
    </div></div></main>;
}
