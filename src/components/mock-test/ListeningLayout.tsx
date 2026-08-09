'use client';

import { useEffect, useState } from 'react';
import type { DeliverySection } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import QuestionGroupRenderer from './QuestionGroupRenderer';
import TestPartHeader from './TestPartHeader';
import { getListeningAudio, stopListeningAudio } from '@/lib/audio/listening-audio';

function partRange(part: DeliverySection['parts'][number]) {
  const numbers = part.questionGroups.flatMap((group) => (
    group.questions.flatMap((question) => (
      question.sourceNumber === null ? [] : [question.sourceNumber]
    ))
  ));
  return { first: numbers.at(0), last: numbers.at(-1) };
}

export default function ListeningLayout({ section }: { section: DeliverySection }) {
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const textSize = useTestStore((state) => state.textSize);
  const [audioNeedsGesture, setAudioNeedsGesture] = useState(false);
  const activePart = section.parts.find((part) => {
    const { first, last } = partRange(part);
    return first !== undefined
      && last !== undefined
      && currentQuestionId >= first
      && currentQuestionId <= last;
  }) ?? section.parts.at(0);
  const audio = activePart?.stimuli.find((stimulus) => stimulus.type === 'AUDIO_TRACK');

  useEffect(() => {
    if (!audio?.assetUrl) return;
    const player = getListeningAudio(audio.assetUrl);
    let playbackStarted = false;
    let resumePending = false;

    const resume = () => {
      if (!playbackStarted || player.ended || resumePending) return;
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
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const handlePause = () => {
      if (playbackStarted && !player.ended) queueMicrotask(resume);
    };
    const handleRateChange = () => {
      if (player.playbackRate !== 1) player.playbackRate = 1;
    };

    player.addEventListener('playing', handlePlaying);
    player.addEventListener('pause', handlePause);
    player.addEventListener('ratechange', handleRateChange);
    const playbackGuard = window.setInterval(() => {
      if (playbackStarted && player.paused && !player.ended) resume();
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

    if (player.paused) {
      player.play().catch(() => setAudioNeedsGesture(true));
    } else {
      handlePlaying();
    }

    return () => {
      playbackStarted = false;
      player.removeEventListener('playing', handlePlaying);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('ratechange', handleRateChange);
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
  }, [audio?.assetUrl]);

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
      {audioNeedsGesture && audio?.assetUrl && (
        <button
          type="button"
          className="mx-4 mt-3 w-fit border border-black bg-black px-4 py-2 font-bold text-white"
          onClick={() => {
            void getListeningAudio(audio.assetUrl!).play().then(() => setAudioNeedsGesture(false));
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
