'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTestStore } from '@/lib/store/useTestStore';
import type { DeliveryTest } from '@/lib/content/delivery-types';

type FooterPart = {
  id: string;
  title: string;
  start: number;
  end: number;
};

function questionRanges(
  test: DeliveryTest,
  activeSection: 'listening' | 'reading' | 'writing' | null,
): FooterPart[] {
  if (!activeSection) return [];
  const section = test.sections.find(
    (candidate) => candidate.skill === activeSection.toUpperCase(),
  );
  if (!section) return [];

  return section.parts.flatMap((part, index) => {
    if (activeSection === 'writing') {
      return [{
        id: part.id,
        title: `Part ${index + 1}`,
        start: index + 1,
        end: index + 1,
      }];
    }

    const numbers = part.questionGroups.flatMap((group) => (
      group.questions.flatMap((question) => (
        question.sourceNumber === null ? [] : [question.sourceNumber]
      ))
    ));
    const first = numbers.at(0);
    const last = numbers.at(-1);
    if (first === undefined || last === undefined) return [];

    return [{
      id: part.id,
      title: `Part ${index + 1}`,
      start: first,
      end: last,
    }];
  });
}

function Arrow({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.6">
      {direction === 'previous'
        ? <path d="m14.5 5-7 7 7 7" />
        : <path d="m9.5 5 7 7-7 7" />}
    </svg>
  );
}

export default function TestFooterNav({ test }: { test: DeliveryTest }) {
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const setCurrentQuestion = useTestStore((state) => state.setCurrentQuestion);
  const activeSection = useTestStore((state) => state.activeSection);
  const answers = useTestStore((state) => (
    state.activeSection ? state.answers[state.activeSection] : {}
  ));
  const reviewMap = useTestStore((state) => (
    state.activeSection ? state.markedForReview[state.activeSection] : {}
  ));
  const toggleReview = useTestStore((state) => state.toggleReview);
  const activeQuestionsRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(
    () => questionRanges(test, activeSection),
    [activeSection, test],
  );
  const activePart = parts.find(
    (part) => currentQuestionId >= part.start && currentQuestionId <= part.end,
  ) ?? parts.at(0);
  const firstQuestion = parts.at(0)?.start ?? 1;
  const lastQuestion = parts.at(-1)?.end ?? firstQuestion;

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(`[data-footer-question="${currentQuestionId}"]`)
      .forEach((question) => {
        if (question.getClientRects().length === 0) return;
        const container = question.closest<HTMLElement>('.ielts-footer-questions, .ielts-mobile-footer-questions');
        if (!container) return;
        container.scrollTo({
          left: Math.max(0, question.offsetLeft - (container.clientWidth - question.offsetWidth) / 2),
          behavior: 'smooth',
        });
      });
  }, [currentQuestionId]);

  const goToQuestion = (questionNumber: number) => {
    const previousPartId = activePart?.id;
    const nextPartId = parts.find(
      (part) => questionNumber >= part.start && questionNumber <= part.end,
    )?.id;
    setCurrentQuestion(questionNumber);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const directControl = document.querySelector<HTMLElement>(
        `[aria-label="Answer ${questionNumber}"], [data-answer-number="${questionNumber}"]`,
      );
      const group = document.querySelector<HTMLElement>(
        `[data-answer-ids~="${questionNumber}"]`,
      );
      const target = directControl ?? group;
      const scrollPane = target?.closest<HTMLElement>('[data-question-scroll-pane="true"]');
      if (target && scrollPane) {
        const targetBounds = target.getBoundingClientRect();
        const paneBounds = scrollPane.getBoundingClientRect();
        scrollPane.scrollTo({
          top: Math.max(
            0,
            scrollPane.scrollTop + targetBounds.top - paneBounds.top - 24,
          ),
          behavior: 'smooth',
        });
      } else if (previousPartId !== nextPartId) {
        document
          .querySelectorAll<HTMLElement>('[data-question-scroll-pane="true"]')
          .forEach((pane) => pane.scrollTo({ top: 0 }));
      }
      directControl?.focus({ preventScroll: true });
    }));
  };

  if (!activePart || !activeSection) return null;

  return (
    <>
      <div className="ielts-review-control">
        <button
          type="button"
          title="Mark this question so you can return to it before finishing"
          aria-pressed={Boolean(reviewMap[currentQuestionId])}
          onClick={() => toggleReview(activeSection, currentQuestionId)}
        >
          {reviewMap[currentQuestionId] ? 'Remove review mark' : 'Review'}
        </button>
      </div>

      <div className="ielts-test-arrows" aria-label="Question navigation">
        <button
          type="button"
          aria-label="Previous question"
          disabled={currentQuestionId <= firstQuestion}
          onClick={() => goToQuestion(Math.max(firstQuestion, currentQuestionId - 1))}
        >
          <Arrow direction="previous" />
        </button>
        <button
          type="button"
          aria-label="Next question"
          disabled={currentQuestionId >= lastQuestion}
          onClick={() => goToQuestion(Math.min(lastQuestion, currentQuestionId + 1))}
        >
          <Arrow direction="next" />
        </button>
      </div>

      <footer className="ielts-question-navigation">
        <nav aria-label="Test parts" className="flex h-full">
          {parts.map((part) => {
            const isActive = part.id === activePart.id;
            const questionNumbers = Array.from(
              { length: part.end - part.start + 1 },
              (_, index) => part.start + index,
            );
            const attempted = questionNumbers.filter((number) => Boolean(answers[number])).length;
            const progressStyle = {
              '--part-progress': `${(attempted / questionNumbers.length) * 100}%`,
            } as CSSProperties;

            return (
              <section
                key={part.id}
                className={`ielts-footer-part ${isActive ? 'is-active' : ''} ${attempted > 0 ? 'has-answers' : ''}`}
                style={progressStyle}
              >
                <button
                  type="button"
                  onClick={() => goToQuestion(part.start)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`${part.title}, ${attempted} of ${questionNumbers.length} answered`}
                  className="ielts-footer-part-title"
                >
                  {part.title}
                </button>

                {isActive ? (
                  <div
                    ref={activeQuestionsRef}
                    className="ielts-footer-questions"
                    aria-label={`${part.title} questions`}
                  >
                    {questionNumbers.map((questionNumber) => {
                      const isCurrent = questionNumber === currentQuestionId;
                      const isAttempted = Boolean(answers[questionNumber]);
                      const isMarked = Boolean(reviewMap[questionNumber]);
                      return (
                        <button
                          type="button"
                          key={questionNumber}
                          data-footer-question={questionNumber}
                          onClick={() => goToQuestion(questionNumber)}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-label={`Question ${questionNumber}${isAttempted ? ', answered' : ', not answered'}${isMarked ? ', marked for review' : ''}`}
                          className={`ielts-footer-question ${isCurrent ? 'is-current' : ''} ${isAttempted ? 'is-answered' : ''} ${isMarked ? 'is-marked' : ''}`}
                        >
                          {questionNumber}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="ielts-footer-progress">{attempted} of {questionNumbers.length}</span>
                )}
              </section>
            );
          })}
        </nav>
      </footer>

      <footer className="ielts-mobile-question-navigation">
        <label className="sr-only" htmlFor="mobile-part-select">Test part</label>
        <select
          id="mobile-part-select"
          className="ielts-mobile-part-select"
          value={activePart.id}
          onChange={(event) => {
            const part = parts.find((candidate) => candidate.id === event.target.value);
            if (part) goToQuestion(part.start);
          }}
        >
          {parts.map((part) => <option key={part.id} value={part.id}>{part.title}</option>)}
        </select>
        <div className="ielts-mobile-footer-questions" aria-label={`${activePart.title} questions`}>
          {Array.from(
            { length: activePart.end - activePart.start + 1 },
            (_, index) => activePart.start + index,
          ).map((questionNumber) => {
            const isCurrent = questionNumber === currentQuestionId;
            const isAttempted = Boolean(answers[questionNumber]);
            const isMarked = Boolean(reviewMap[questionNumber]);
            return (
              <button
                type="button"
                key={questionNumber}
                data-footer-question={questionNumber}
                onClick={() => goToQuestion(questionNumber)}
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={`Question ${questionNumber}${isAttempted ? ', answered' : ', not answered'}${isMarked ? ', marked for review' : ''}`}
                className={`ielts-footer-question ${isCurrent ? 'is-current' : ''} ${isAttempted ? 'is-answered' : ''} ${isMarked ? 'is-marked' : ''}`}
              >
                {questionNumber}
              </button>
            );
          })}
        </div>
      </footer>
    </>
  );
}
