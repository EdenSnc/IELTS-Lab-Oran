'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DeliveryTest } from '@/lib/content/delivery-types';
import type {
  ObjectiveGradeResult,
  ObjectiveSkillResult,
} from '@/lib/grading/objective-grading';
import type { WritingGradeResult } from '@/lib/grading/writing-grading';
import { useTestStore } from '@/lib/store/useTestStore';

const objectiveRequests = new Map<string, Promise<ObjectiveGradeResult>>();
const writingRequests = new Map<string, Promise<WritingGradeResult>>();

function cachedRequest<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  request: () => Promise<T>,
) {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = request().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

function ScoreRing({ score }: { score: number }) {
  const percentage = Math.max(0, Math.min(100, (score / 9) * 100));
  const radius = 64;
  return (
    <svg
      className="diagnostic-score-ring"
      viewBox="0 0 160 160"
      role="img"
      aria-label={`Objective average band estimate ${score.toFixed(1)}`}
    >
      <circle className="diagnostic-score-track" cx="80" cy="80" r={radius} />
      {percentage > 0 && (
        <circle
          className="diagnostic-score-progress"
          cx="80"
          cy="80"
          r={radius}
          pathLength="100"
          strokeDasharray={`${percentage} ${100 - percentage}`}
        />
      )}
      <text className="diagnostic-score-value" x="80" y="79">{score.toFixed(1)}</text>
      <text className="diagnostic-score-total" x="80" y="105">of 9</text>
    </svg>
  );
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function SkillRow({ result }: { result: ObjectiveSkillResult }) {
  const label = result.skill === 'LISTENING' ? 'Listening' : 'Reading';
  return (
    <div className="diagnostic-skill-row">
      <div>
        <strong>{label}</strong>
        <span>{result.rawScore} correct out of {result.maximumRawScore}</span>
      </div>
      <strong>{result.band.toFixed(1)}</strong>
    </div>
  );
}

export default function DiagnosticResults({ test }: { test: DeliveryTest }) {
  const answers = useTestStore((state) => state.answers);
  const resetTest = useTestStore((state) => state.resetTest);
  const setTestPhase = useTestStore((state) => state.setTestPhase);
  const result = useTestStore((state) => state.objectiveGradeResult);
  const writingResult = useTestStore((state) => state.writingGradeResult);
  const setResult = useTestStore((state) => state.setObjectiveGradeResult);
  const setWritingResult = useTestStore((state) => state.setWritingGradeResult);
  const [writingError, setWritingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportedAverage = result && writingResult
    ? roundToHalf((result.skills.reduce((sum, skill) => sum + skill.band, 0) + writingResult.writingBand) / 3)
    : result?.objectiveAverageBand ?? 0;
  const printResult = () => {
    const originalTitle = document.title;
    document.title = 'IELTS-mock-test-result';
    const restoreTitle = () => { document.title = originalTitle; };
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 1000);
  };
  const confirmReset = () => {
    if (window.confirm('Reset this test? All saved answers, progress and scores on this device will be deleted.')) {
      resetTest();
    }
  };

  useEffect(() => {
    if (result?.testVersionId === test.id) return;
    let cancelled = false;
    const payload = {
      testVersionId: test.id,
      answers: { listening: answers.listening, reading: answers.reading },
    };
    const requestKey = JSON.stringify(payload);
    void cachedRequest(objectiveRequests, requestKey, async () => {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Your objective scores could not be calculated.');
      return response.json() as Promise<ObjectiveGradeResult>;
    })
      .then((nextResult) => {
        if (!cancelled) setResult(nextResult);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Your objective scores could not be calculated.',
        );
      });
    return () => { cancelled = true; };
  }, [answers.listening, answers.reading, result?.testVersionId, setResult, test.id]);

  useEffect(() => {
    if (writingResult?.testVersionId === test.id) return;
    let cancelled = false;
    const payload = {
      testVersionId: test.id,
      answers: {
        task1: answers.writing[1] ?? '',
        task2: answers.writing[2] ?? '',
      },
    };
    const requestKey = JSON.stringify(payload);
    void cachedRequest(writingRequests, requestKey, async () => {
      const response = await fetch('/api/grade/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Writing estimate unavailable');
      return response.json() as Promise<WritingGradeResult>;
    })
      .then((nextResult) => {
        if (!cancelled) setWritingResult(nextResult);
      })
      .catch(() => {
        if (!cancelled) setWritingError('Writing estimate unavailable');
      });
    return () => { cancelled = true; };
  }, [answers.writing, setWritingResult, test.id, writingResult?.testVersionId]);

  return (
    <main className="min-h-screen bg-white px-4 py-6 font-sans text-[#111111] sm:px-6 sm:py-10">
      <div data-printable-results="true" className="mx-auto max-w-[920px]">
        <div className="results-print-only">
          <p>IELTS Lab Oran</p>
          <h1>Mock-test result</h1>
        </div>
        <header className="no-print mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <Link href="/en" aria-label="IELTS Lab Oran home" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0085a3]">
            <Image className="h-11 w-11 shrink-0 sm:h-[52px] sm:w-[52px]" src="/ielts-lab-mark.svg" alt="IELTS Lab Oran" width={52} height={52} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">IELTS Lab Oran</p>
              <h1 className="text-xl font-bold sm:text-3xl">Mock-test result</h1>
            </div>
          </Link>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={printResult}
              aria-label="Save result as PDF"
              className="whitespace-nowrap rounded-full border border-[#d9d9d6] bg-white px-4 py-2 text-sm font-bold transition hover:border-black"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setTestPhase('instructions')}
              className="rounded-full bg-[#111111] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#333333]"
            >
              Test dashboard
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-3xl border border-[#f0bdc5] bg-[#fff7f8] p-5 text-[#8b0028]">
            <p className="font-bold">Scoring is unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!result && !error && (
          <div className="rounded-[28px] border border-[#e5e5e2] bg-[#fafaf9] p-10 text-center">
            <p className="font-bold">Calculating your verified objective score...</p>
          </div>
        )}

        {result && (
          <>
            <section className="diagnostic-summary-card flex-col text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">
                IELTS {test.variant === 'GENERAL_TRAINING' ? 'General Training' : 'Academic'} familiarisation mock
              </p>
              <h2 className="text-2xl font-bold sm:text-3xl">Your available score</h2>
              <div className="mt-2 text-center">
                <p className="mb-3 text-sm font-semibold text-[#555555]">
                  {writingResult ? 'Listening, Reading and Writing average' : 'Listening and Reading average'}
                </p>
                <ScoreRing score={reportedAverage} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">Your section scores</h2>
              <div className="space-y-2">
                {result.skills.map((skill) => (
                  <SkillRow key={skill.skill} result={skill} />
                ))}
                <div className={`diagnostic-skill-row ${writingResult ? '' : 'opacity-70'}`}>
                  <div>
                    <strong>Writing</strong>
                    <span>
                      {writingResult ? 'Assessment complete' : writingError ?? 'Pending'}
                    </span>
                  </div>
                  <strong className={writingResult ? '' : 'text-base text-[#54585a]'}>
                    {writingResult ? writingResult.writingBand.toFixed(1) : 'Pending'}
                  </strong>
                </div>
                <div className="diagnostic-skill-row opacity-70">
                  <div>
                    <strong>Speaking</strong>
                    <span>Not included in this familiarisation test</span>
                  </div>
                  <strong className="text-base text-[#54585a]">Not tested</strong>
                </div>
              </div>
            </section>

            <section className="no-print relative mt-8 overflow-hidden rounded-[28px] border border-[#e5e5e2] bg-[#fafaf9] p-5 sm:p-7">
              <div aria-hidden="true" className="select-none blur-[8px]">
                <h2 className="text-xl font-bold">Your full diagnostic</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    'Accuracy by IELTS question type',
                    'Recurring error patterns',
                    'Writing criterion breakdown',
                    'Priority drills and study plan',
                  ].map((label) => (
                    <div key={label} className="rounded-2xl border border-[#e1e1dd] bg-white p-4">
                      <strong>{label}</strong>
                      <p className="mt-2 text-sm text-[#54585a]">
                        Personalised evidence, recommendations and next actions based on this attempt.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-5">
                <div className="max-w-md rounded-3xl bg-[#111111] p-6 text-center text-white shadow-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff8d9d]">Diagnostic upgrade</p>
                  <h2 className="mt-2 text-xl font-bold">Unlock the complete diagnostic</h2>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    Upgrade to see question-type accuracy, mistakes, writing feedback and your personalised improvement plan.
                  </p>
                  <Link
                    href="/#intake"
                    className="mt-5 inline-flex rounded-full bg-crimson px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b7182d]"
                  >
                    Unlock diagnostic
                  </Link>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={confirmReset}
              className="no-print mt-6 rounded-full border border-black bg-white px-4 py-2 font-bold hover:bg-[#eeeeee]"
            >
              Reset test
            </button>
          </>
        )}
      </div>
    </main>
  );
}
