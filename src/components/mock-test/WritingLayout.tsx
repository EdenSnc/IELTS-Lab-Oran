'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DeliverySection } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import { TextAnnotationMenu, useTextAnnotations } from './TextAnnotations';
import TestPartHeader from './TestPartHeader';

export default function WritingLayout({ section }: { section: DeliverySection }) {
  const textSize = useTestStore((state) => state.textSize);
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const answers = useTestStore((state) => state.answers.writing);
  const setAnswer = useTestStore((state) => state.setAnswer);
  const splitRatio = useTestStore((state) => state.splitRatio);
  const setSplitRatio = useTestStore((state) => state.setSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const taskIndex = Math.max(0, Math.min(section.parts.length - 1, currentQuestionId - 1));
  const activeTask = section.parts[taskIndex];
  const prompt = activeTask?.stimuli.find((stimulus) => stimulus.type === 'WRITING_PROMPT');
  const responseGroup = activeTask?.questionGroups.at(0);
  const {
    containerRef: annotationRef,
    menu: annotationMenu,
    openMenu,
    openMenuFromSelection,
    highlight,
    createNote,
    clearHighlights,
  } = useTextAnnotations('writing', prompt?.id ?? activeTask?.id ?? 'writing');
  
  // Use answers from store to persist between tabs
  const answerId = taskIndex + 1;
  const text = answers[answerId] || '';

  const textSizeClass = 
    textSize === 'large' ? 'text-lg' : 
    textSize === 'extra-large' ? 'text-xl' : 'text-[15px]';

  // Handle Dragging Splitter
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      let newRatio = isMobile
        ? ((e.clientY - containerRect.top) / containerRect.height) * 100
        : ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newRatio < 25) newRatio = 25;
      if (newRatio > 75) newRatio = 75;
      setSplitRatio(newRatio);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.removeProperty('user-select');
    };
  }, [isDragging, setSplitRatio]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      containerRef.current?.querySelectorAll<HTMLElement>('[data-question-scroll-pane="true"]')
        .forEach((pane) => pane.scrollTo({ top: 0, left: 0 }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [taskIndex]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (!activeTask) {
    return <p className="p-8">This Writing test has no tasks.</p>;
  }

  const recommendedMinutes = Math.round((activeTask.recommendedTimeSeconds ?? 0) / 60);
  const defaultInstructions = [
    recommendedMinutes > 0
      ? `You should spend about ${recommendedMinutes} minutes on this task.`
      : '',
    responseGroup?.minWordCount
      ? `Write at least ${responseGroup.minWordCount} words.`
      : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`ielts-test-area flex h-full w-full flex-col bg-white ${textSizeClass}`}>
      <TestPartHeader
        partNumber={taskIndex + 1}
        instructionsHtml={
          activeTask.instructionsHtml?.trim()
            ? activeTask.instructionsHtml
            : `<p>${defaultInstructions}</p>`
        }
      />
      <div
        ref={containerRef}
        className="mock-split-root mt-2 flex min-h-0 flex-1 bg-white"
        style={{ '--split-ratio': `${splitRatio}%` } as CSSProperties}
      >
        <div
          data-question-scroll-pane="true"
          className="mock-split-primary h-full overflow-y-auto px-3 py-4 md:px-5"
        >
          <TextAnnotationMenu
            menu={annotationMenu}
            onHighlight={highlight}
            onNote={createNote}
            onClear={clearHighlights}
          />
          <div
            ref={annotationRef}
            data-text-annotations="true"
            onContextMenu={openMenu}
            onPointerUp={openMenuFromSelection}
            className="prose max-w-none leading-relaxed text-[#1a1a1a]"
            dangerouslySetInnerHTML={{ __html: prompt?.bodyHtml ?? responseGroup?.promptHtml ?? '' }}
          />
        </div>

        <div
        role="separator"
        aria-label="Resize prompt and answer"
        aria-orientation="vertical"
        onPointerDown={() => setIsDragging(true)}
        className="mock-split-resizer relative w-px shrink-0 touch-none cursor-col-resize bg-[#707070]"
        />

        <div
          data-question-scroll-pane="true"
          className="mock-split-secondary flex h-full flex-col px-3 py-4 md:px-5"
        >
          <textarea
            data-writing-response="true"
            value={text}
            onChange={(event) => setAnswer('writing', answerId, event.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            aria-label={`Writing Part ${taskIndex + 1} answer`}
            className={`min-h-0 w-full flex-1 resize-none border border-[#707070] bg-white p-3 outline-none focus:border-black focus:ring-1 focus:ring-black ${textSizeClass}`}
          />
          <p className="mt-2 text-sm text-black">Word count: {wordCount}</p>
        </div>
      </div>
    </div>
  );
}
