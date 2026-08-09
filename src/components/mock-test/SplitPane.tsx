'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DeliverySection } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import QuestionGroupRenderer from './QuestionGroupRenderer';
import MatchingHeadingsPane from './MatchingHeadingsPane';
import ReadingPassage from './ReadingPassage';
import TestPartHeader from './TestPartHeader';

function partRange(part: DeliverySection['parts'][number]) {
  const numbers = part.questionGroups.flatMap((group) => (
    group.questions.flatMap((question) => (
      question.sourceNumber === null ? [] : [question.sourceNumber]
    ))
  ));
  return { first: numbers.at(0), last: numbers.at(-1) };
}

export default function SplitPane({ section }: { section: DeliverySection }) {
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const splitRatio = useTestStore((state) => state.splitRatio);
  const setSplitRatio = useTestStore((state) => state.setSplitRatio);
  const textSize = useTestStore((state) => state.textSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activePart = section.parts.find((part) => {
    const { first, last } = partRange(part);
    return first !== undefined
      && last !== undefined
      && currentQuestionId >= first
      && currentQuestionId <= last;
  }) ?? section.parts.at(0);
  const passage = activePart?.stimuli.find((stimulus) => stimulus.type === 'READING_PASSAGE');
  const matchingHeadingsGroup = activePart?.questionGroups.find(
    (group) => (
      group.responseKind === 'DRAG_DROP'
      && group.questionType === 'MATCHING_HEADINGS'
    ),
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      setSplitRatio(isMobile
        ? ((event.clientY - bounds.top) / bounds.height) * 100
        : ((event.clientX - bounds.left) / bounds.width) * 100);
    };
    const handlePointerUp = () => setIsDragging(false);
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
      containerRef.current?.querySelectorAll<HTMLElement>('[data-question-scroll-pane="true"], .mock-split-primary')
        .forEach((pane) => pane.scrollTo({ top: 0, left: 0 }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePart?.id]);

  if (!activePart) {
    return <p className="p-8">This Reading test has no sections.</p>;
  }

  const textSizeClass =
    textSize === 'large' ? 'text-lg'
      : textSize === 'extra-large' ? 'text-xl'
        : 'text-[15px]';
  const partNumber = section.parts.indexOf(activePart) + 1;
  const activeRange = partRange(activePart);
  const partInstructions = activePart.instructionsHtml?.trim()
    ? activePart.instructionsHtml
    : (
      activeRange.first !== undefined && activeRange.last !== undefined
        ? `<p>Read the text and answer questions ${activeRange.first} to ${activeRange.last}.</p>`
        : null
    );
  const passageHtml = passage?.bodyHtml ?? passage?.plainText ?? '';
  const showPassageTitle = Boolean(passage?.title) && !/<h[1-6]\b/i.test(passageHtml);

  return (
    <div
      className={`ielts-test-area flex h-full w-full flex-col bg-white ${textSizeClass}`}
    >
      <TestPartHeader
        partNumber={partNumber}
        instructionsHtml={partInstructions}
      />
      <div
      ref={containerRef}
      className="mock-split-root mt-2 flex min-h-0 flex-1 overflow-hidden bg-white"
      style={{ '--split-ratio': `${splitRatio}%` } as CSSProperties}
    >
      {matchingHeadingsGroup ? (
        <MatchingHeadingsPane
          group={matchingHeadingsGroup}
          passage={passage}
          remainingGroups={activePart.questionGroups.filter(
            (group) => group.id !== matchingHeadingsGroup.id,
          )}
          onResizeStart={() => setIsDragging(true)}
        />
      ) : (
      <>
      <div className="mock-split-primary h-full overflow-y-auto bg-white">
        <ReadingPassage
          contentKey={passage?.id ?? activePart.id}
          html={passageHtml}
          title={passage?.title}
          showTitle={showPassageTitle}
        />
      </div>

      <div
        role="separator"
        aria-label="Resize passage and questions"
        aria-orientation="vertical"
        onPointerDown={() => setIsDragging(true)}
        className="mock-split-resizer relative w-px shrink-0 touch-none cursor-col-resize bg-[#707070]"
      />

      <div
        data-question-scroll-pane="true"
        className="mock-split-secondary h-full overflow-y-auto bg-white px-3 py-4 md:px-5"
      >
        <div className="space-y-4 pb-4">
          {activePart.questionGroups.map((group) => (
            <QuestionGroupRenderer key={group.id} group={group} section="reading" />
          ))}
        </div>
      </div>
      </>
      )}
      </div>
    </div>
  );
}
