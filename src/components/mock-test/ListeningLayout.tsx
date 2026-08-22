'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DeliverySection, ListeningAudioResolution } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import QuestionGroupRenderer from './QuestionGroupRenderer';
import TestPartHeader from './TestPartHeader';
import { activateListeningAudio, getListeningAudio, isListeningAudioActive, stopListeningAudio } from '@/lib/audio/listening-audio';

function partRange(part: DeliverySection['parts'][number]) {
  const numbers = part.questionGroups.flatMap((group) => (
    group.questions.flatMap((question) => (
      question.sourceNumber === null ? [] : [question.sourceNumber]
    ))
  ));
  return { first: numbers.at(0), last: numbers.at(-1) };
}

export default function ListeningLayout({
  section,
  resolveListeningAudio,
}: {
  section: DeliverySection;
  resolveListeningAudio?: (stimulusId: string) => Promise<ListeningAudioResolution>;
}) {
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const textSize = useTestStore((state) => state.textSize);
  const [gestureStimulusId, setGestureStimulusId] = useState<string | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [resolvedAudio, setResolvedAudio] = useState<{
    stimulusId: string;
    source: string | null;
    resumeAtSeconds: number;
    error: string | null;
  } | null>(null);
  const activePart = section.parts.find((part) => {
    const { first, last } = partRange(part);
    return first !== undefined
      && last !== undefined
      && currentQuestionId >= first
      && currentQuestionId <= last;
  }) ?? section.parts.at(0);
  const allAudio = useMemo(() => section.parts.flatMap((part) => (
    part.stimuli.filter((stimulus) => stimulus.type === 'AUDIO_TRACK')
  )), [section.parts]);
  const requestedAudio = allAudio[playbackIndex];
  const audio = allAudio.find((candidate) => candidate.id === resolvedAudio?.stimulusId) ?? requestedAudio;
  const currentAudio = resolvedAudio?.stimulusId === audio?.id ? resolvedAudio : null;
  const audioSource = currentAudio?.source ?? null;
  const resumeAtSeconds = currentAudio?.resumeAtSeconds ?? 0;
  const audioError = currentAudio?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!requestedAudio?.assetUrl) return () => { cancelled = true; };
    const source = resolveListeningAudio
      ? resolveListeningAudio(requestedAudio.id)
      : Promise.resolve({ audioUrl: requestedAudio.assetUrl, stimulusId: requestedAudio.id, resumeAtSeconds: 0 });
    void source.then((resolution) => {
      if (!cancelled) setResolvedAudio({
        stimulusId: resolution.stimulusId,
        source: resolution.audioUrl,
        resumeAtSeconds: resolution.resumeAtSeconds,
        error: null,
      });
    }).catch((cause: unknown) => {
      if (!cancelled) setResolvedAudio({
        stimulusId: requestedAudio.id,
        source: null,
        resumeAtSeconds: 0,
        error: cause instanceof Error ? cause.message : 'Listening audio is unavailable.',
      });
    });
    return () => { cancelled = true; };
  }, [requestedAudio?.assetUrl, requestedAudio?.id, resolveListeningAudio]);

  useEffect(() => {
    if (!audioSource) return;
    const player = activateListeningAudio(audioSource);
    let playbackStarted = false;
    let resumePending = false;

    const resume = () => {
      if (!playbackStarted || !isListeningAudioActive() || player.ended || resumePending) return;
      resumePending = true;
      void player.play().catch(() => {
        // Some operating systems temporarily retain the audio focus. The
        // pause listener makes another attempt if a second pause is emitted.
      }).finally(() => {
        resumePending = false;
      });
    };
    const handlePlaying = () => {
      playbackStarted = true;
      setGestureStimulusId(null);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const handlePause = () => {
      if (playbackStarted && isListeningAudioActive() && !player.ended) queueMicrotask(resume);
    };
    const handleRateChange = () => {
      if (player.playbackRate !== 1) player.playbackRate = 1;
    };
    const seekToTimeline = () => {
      if (resumeAtSeconds > 0 && player.currentTime + 1 < resumeAtSeconds) {
        player.currentTime = Math.min(resumeAtSeconds, Number.isFinite(player.duration) ? player.duration : resumeAtSeconds);
      }
    };
    const handleEnded = () => {
      const completedIndex = allAudio.findIndex((candidate) => candidate.id === audio?.id);
      if (completedIndex >= 0 && completedIndex + 1 < allAudio.length) setPlaybackIndex(completedIndex + 1);
    };

    player.addEventListener('playing', handlePlaying);
    player.addEventListener('pause', handlePause);
    player.addEventListener('ratechange', handleRateChange);
    player.addEventListener('loadedmetadata', seekToTimeline);
    player.addEventListener('ended', handleEnded);
    const playbackGuard = window.setInterval(() => {
      if (playbackStarted && isListeningAudioActive() && player.paused && !player.ended) resume();
    }, 250);

    const blockedMediaActions: MediaSessionAction[] = [
      'pause',
      'stop',
      'seekbackward',
      'seekforward',
      'seekto',
      'previoustrack',
      'nexttrack',
    ];
    if ('mediaSession' in navigator) {
      for (const action of blockedMediaActions) {
        try {
          navigator.mediaSession.setActionHandler(action, () => {
            window.setTimeout(resume, 0);
          });
        } catch {
          // Browsers expose different subsets of Media Session actions.
        }
      }
      try {
        navigator.mediaSession.setActionHandler('play', resume);
      } catch {
        // The play action is optional.
      }
    }

    seekToTimeline();
    if (player.paused) {
      player.play().catch(() => setGestureStimulusId(audio?.id ?? null));
    } else {
      handlePlaying();
    }

    return () => {
      playbackStarted = false;
      player.removeEventListener('playing', handlePlaying);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('ratechange', handleRateChange);
      player.removeEventListener('loadedmetadata', seekToTimeline);
      player.removeEventListener('ended', handleEnded);
      window.clearInterval(playbackGuard);
      if ('mediaSession' in navigator) {
        for (const action of [...blockedMediaActions, 'play' as const]) {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {
            // Ignore actions unsupported by this browser.
          }
        }
        navigator.mediaSession.playbackState = 'none';
      }
      stopListeningAudio();
    };
  }, [allAudio, audio?.id, audioSource, resumeAtSeconds]);

  if (!activePart) {
    return <p className="p-8">This Listening test has no parts.</p>;
  }

  const partNumber = section.parts.indexOf(activePart) + 1;
  const activeRange = partRange(activePart);
  const partInstructions = activePart.instructionsHtml?.trim()
    ? activePart.instructionsHtml
    : (
      activeRange.first !== undefined && activeRange.last !== undefined
        ? `<p>Listen and answer questions ${activeRange.first} to ${activeRange.last}.</p>`
        : null
    );
  const textSizeClass =
    textSize === 'large' ? 'text-lg'
      : textSize === 'extra-large' ? 'text-xl'
        : 'text-[15px]';

  return (
    <div className={`ielts-test-area flex h-full w-full flex-col bg-white ${textSizeClass}`}>
      {audioError && (
        <p role="alert" className="mx-4 mt-3 border border-red-700 bg-red-50 px-4 py-2 text-red-900">
          {audioError}
        </p>
      )}
      {gestureStimulusId === audio?.id && audioSource && (
        <button
          type="button"
          className="mx-4 mt-3 w-fit border border-black bg-black px-4 py-2 font-bold text-white"
          onClick={() => {
            void getListeningAudio(audioSource).play().then(() => setGestureStimulusId(null));
          }}
        >
          Start audio
        </button>
      )}
      <TestPartHeader
        partNumber={partNumber}
        instructionsHtml={partInstructions}
      />
      <div
        data-question-scroll-pane="true"
        className="ielts-question-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div className="space-y-4 pb-4">
        {activePart.questionGroups.map((group) => (
          <QuestionGroupRenderer key={group.id} group={group} section="listening" />
        ))}
        </div>
      </div>
    </div>
  );
}
