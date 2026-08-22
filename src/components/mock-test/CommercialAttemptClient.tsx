'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeliveryTest } from '@/lib/content/delivery-types';
import { type IELTSSection, type ReviewMap, type TestAnswerMap, useTestStore } from '@/lib/store/useTestStore';
import MockTestClient from './MockTestClient';

type DeliveryResponse = {
  responseId: string;
  questionNumber: number;
  skill: string;
  answer: unknown;
  markedForReview: boolean;
  version: number;
};

type AttemptPayload = {
  attempt: { id: string; expiresAt: string | null };
  test: DeliveryTest;
  responses: DeliveryResponse[];
};

type ScorePayload = {
  state: string;
  scores: Array<{ skill: string; rawScore: number | null; maximumRawScore: number | null; band: number | null }>;
  overallBand?: number | null;
  writingStatus?: 'NOT_INCLUDED' | 'PENDING' | 'FAILED' | 'COMPLETE' | null;
  speakingStatus?: 'NOT_INCLUDED' | 'PENDING' | 'BOOKED' | 'COMPLETE' | null;
};

function emptyAnswers(): TestAnswerMap {
  return { listening: {}, reading: {}, writing: {} };
}

function emptyReviews(): ReviewMap {
  return { listening: {}, reading: {}, writing: {} };
}

function sectionName(value: string): IELTSSection {
  const normalized = value.toLowerCase();
  if (normalized === 'listening' || normalized === 'reading' || normalized === 'writing') return normalized;
  throw new Error('UNSUPPORTED_ATTEMPT_SKILL');
}

export default function CommercialAttemptClient({ attemptId }: { attemptId: string }) {
  const answers = useTestStore((state) => state.answers);
  const reviews = useTestStore((state) => state.markedForReview);
  const [payload, setPayload] = useState<AttemptPayload>();
  const [result, setResult] = useState<ScorePayload>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const leaseTokenRef = useRef<string | null>(null);
  const responseByKeyRef = useRef(new Map<string, DeliveryResponse>());
  const savedRef = useRef(new Map<string, string>());
  const timersRef = useRef(new Map<string, number>());
  const saveChainsRef = useRef(new Map<string, Promise<void>>());
  const audioTokensRef = useRef(new Map<string, string>());
  const audioRequestsRef = useRef(new Map<string, Promise<string>>());

  const keyFor = (skill: IELTSSection, questionNumber: number) => `${skill}:${questionNumber}`;
  const leaseHeaders = useCallback((): Record<string, string> => (
    leaseTokenRef.current ? { 'x-attempt-lease': leaseTokenRef.current } : {}
  ), []);
  const resolveListeningAudio = useCallback((stimulusId: string) => {
    const pending = audioRequestsRef.current.get(stimulusId);
    if (pending) return pending;
    let token = audioTokensRef.current.get(stimulusId);
    if (!token) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(32));
      token = window.btoa(String.fromCharCode(...bytes))
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/=+$/u, '');
      audioTokensRef.current.set(stimulusId, token);
    }
    const request = fetch(`/api/attempts/${attemptId}/listening/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...leaseHeaders() },
      body: JSON.stringify({ stimulusId, playbackToken: token }),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (body?.error === 'LISTENING_AUDIO_ALREADY_STARTED') {
          throw new Error('This Listening audio has already been started and cannot be replayed.');
        }
        throw new Error('Listening audio could not be started.');
      }
      return (await response.json() as { audioUrl: string }).audioUrl;
    }).catch((cause) => {
      audioRequestsRef.current.delete(stimulusId);
      throw cause;
    });
    audioRequestsRef.current.set(stimulusId, request);
    return request;
  }, [attemptId, leaseHeaders]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const storedResult = await fetch(`/api/attempts/${attemptId}/results`, { cache: 'no-store' });
        if (storedResult.ok) {
          if (!cancelled) setResult(await storedResult.json() as ScorePayload);
          return;
        }
        if (storedResult.status !== 404 && storedResult.status !== 409) {
          throw new Error('Unable to load this attempt.');
        }
        const executionResponse = await fetch(`/api/attempts/${attemptId}/execution`, { method: 'POST' });
        if (!executionResponse.ok) throw new Error('Unable to start this attempt.');
        const execution = await executionResponse.json() as { leaseToken: string | null };
        leaseTokenRef.current = execution.leaseToken;
        const deliveryResponse = await fetch(`/api/attempts/${attemptId}`, { headers: leaseHeaders() });
        if (!deliveryResponse.ok) throw new Error('Unable to load this attempt.');
        const loaded = await deliveryResponse.json() as AttemptPayload;
        if (cancelled) return;

        const nextAnswers = emptyAnswers();
        const nextReviews = emptyReviews();
        const metadata = new Map<string, DeliveryResponse>();
        const saved = new Map<string, string>();
        for (const response of loaded.responses) {
          const section = sectionName(response.skill);
          const value = typeof response.answer === 'string' ? response.answer : '';
          nextAnswers[section][response.questionNumber] = value;
          nextReviews[section][response.questionNumber] = response.markedForReview;
          const key = keyFor(section, response.questionNumber);
          metadata.set(key, response);
          saved.set(key, JSON.stringify([value, response.markedForReview]));
        }
        responseByKeyRef.current = metadata;
        savedRef.current = saved;
        const firstSection = sectionName(loaded.test.sections[0]?.skill ?? '');
        const timeLeft = loaded.attempt.expiresAt
          ? Math.max(0, (new Date(loaded.attempt.expiresAt).getTime() - Date.now()) / 1_000)
          : (loaded.test.sections[0]?.timeLimitSeconds ?? 3_600);
        useTestStore.getState().hydrateCommercialAttempt({
          attemptId,
          answers: nextAnswers,
          markedForReview: nextReviews,
          section: firstSection,
          timeLeft,
        });
        setPayload(loaded);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Attempt loading failed.');
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId, leaseHeaders]);

  useEffect(() => {
    if (result?.writingStatus !== 'PENDING') return;
    const timer = window.setInterval(() => {
      void fetch(`/api/attempts/${attemptId}/results`, { cache: 'no-store' })
        .then((response) => response.ok ? response.json() as Promise<ScorePayload> : null)
        .then((next) => { if (next) setResult(next); })
        .catch(() => { /* A later poll can recover from a transient network failure. */ });
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [attemptId, result?.writingStatus]);

  const saveKey = useCallback(async (key: string) => {
    const metadata = responseByKeyRef.current.get(key);
    if (!metadata) return;
    const section = sectionName(metadata.skill);
    const state = useTestStore.getState();
    const value = state.answers[section][metadata.questionNumber] ?? '';
    const markedForReview = Boolean(state.markedForReview[section][metadata.questionNumber]);
    const snapshot = JSON.stringify([value, markedForReview]);
    if (savedRef.current.get(key) === snapshot) return;
    const response = await fetch(`/api/attempts/${attemptId}/responses/${metadata.responseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...leaseHeaders() },
      body: JSON.stringify({ expectedVersion: metadata.version, answer: value, markedForReview }),
      keepalive: true,
    });
    if (!response.ok) throw new Error('Your latest answer could not be saved.');
    const saved = await response.json() as { version: number };
    metadata.version = saved.version;
    savedRef.current.set(key, snapshot);
  }, [attemptId, leaseHeaders]);

  useEffect(() => {
    if (!payload) return;
    for (const key of responseByKeyRef.current.keys()) {
      const metadata = responseByKeyRef.current.get(key) as DeliveryResponse;
      const section = sectionName(metadata.skill);
      const snapshot = JSON.stringify([
        answers[section][metadata.questionNumber] ?? '',
        Boolean(reviews[section][metadata.questionNumber]),
      ]);
      if (savedRef.current.get(key) === snapshot || timersRef.current.has(key)) continue;
      const timer = window.setTimeout(() => {
        timersRef.current.delete(key);
        const previous = saveChainsRef.current.get(key) ?? Promise.resolve();
        const next = previous.then(() => saveKey(key));
        saveChainsRef.current.set(key, next);
        void next.catch((cause) => setError(cause instanceof Error ? cause.message : 'Autosave failed.'));
      }, 450);
      timersRef.current.set(key, timer);
    }
  }, [answers, payload, reviews, saveKey]);

  useEffect(() => {
    if (!payload) return;
    const heartbeat = window.setInterval(() => {
      void fetch(`/api/attempts/${attemptId}/execution`, {
        method: 'PATCH',
        headers: leaseHeaders(),
      }).then((response) => {
        if (!response.ok) setError('The secure test connection was interrupted. Reopen the attempt to continue.');
      });
    }, 20_000);
    return () => window.clearInterval(heartbeat);
  }, [attemptId, leaseHeaders, payload]);

  const finish = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
      try {
        await Promise.all([...responseByKeyRef.current.keys()].map(async (key) => {
          const previous = saveChainsRef.current.get(key) ?? Promise.resolve();
          await previous;
          await saveKey(key);
        }));
      } catch (cause) {
        if (useTestStore.getState().timeLeft > 0) throw cause;
      }
      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: leaseHeaders(),
      });
      if (!response.ok) throw new Error('Attempt submission failed.');
      setResult(await response.json() as ScorePayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attempt submission failed.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, leaseHeaders, saveKey]);

  if (result) {
    const pendingWriting = result.writingStatus === 'PENDING';
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Attempt complete</h1>
        <div className="mt-8 grid gap-4">
          {result.scores.map((score) => (
            <div key={score.skill} className="rounded-2xl border border-black/10 p-5">
              <h2 className="font-semibold">{score.skill[0] + score.skill.slice(1).toLowerCase()}</h2>
              {score.rawScore !== null && <p>{score.rawScore} correct out of {score.maximumRawScore}</p>}
              {score.band !== null && <p className="mt-1">Estimated band: {score.band.toFixed(1)}</p>}
            </div>
          ))}
          {result.writingStatus && result.writingStatus !== 'NOT_INCLUDED' && !result.scores.some((score) => score.skill === 'WRITING') && (
            <div className="rounded-2xl border border-black/10 p-5">
              <h2 className="font-semibold">Writing</h2>
              <p>{pendingWriting ? 'Pending' : 'Assessment unavailable'}</p>
            </div>
          )}
          {result.speakingStatus && result.speakingStatus !== 'NOT_INCLUDED' && !result.scores.some((score) => score.skill === 'SPEAKING') && (
            <div className="rounded-2xl border border-black/10 p-5">
              <h2 className="font-semibold">Speaking</h2>
              <p>{result.speakingStatus === 'BOOKED' ? 'Appointment booked' : 'Pending'}</p>
            </div>
          )}
          {result.overallBand !== undefined && result.overallBand !== null && (
            <div className="rounded-2xl border border-black bg-black p-5 text-white">
              <h2 className="font-semibold">Overall band</h2>
              <p className="mt-1 text-2xl font-semibold">{result.overallBand.toFixed(1)}</p>
            </div>
          )}
        </div>
      </main>
    );
  }
  if (error && !payload) return <main className="grid min-h-screen place-items-center p-6"><p role="alert">{error}</p></main>;
  if (!payload) return <main className="grid min-h-screen place-items-center p-6"><p>Loading secure attempt…</p></main>;
  return (
    <>
      {error && <div role="alert" className="fixed inset-x-0 top-0 z-[120] bg-red-700 px-4 py-2 text-center text-sm text-white">{error}</div>}
      {submitting && <div className="fixed inset-0 z-[110] grid place-items-center bg-white/80"><p>Submitting securely…</p></div>}
      <MockTestClient
        test={payload.test}
        onFinish={finish}
        resolveListeningAudio={resolveListeningAudio}
      />
    </>
  );
}
