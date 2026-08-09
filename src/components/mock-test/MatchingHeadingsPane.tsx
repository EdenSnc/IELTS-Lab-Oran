'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import type {
  DeliveryQuestionGroup,
  DeliveryStimulus,
} from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import QuestionGroupRenderer from './QuestionGroupRenderer';
import { TextAnnotationMenu, useTextAnnotations } from './TextAnnotations';
import { useDragAutoScroll } from './useDragAutoScroll';
import { useTouchDragDrop } from './useTouchDragDrop';

function questionNumbers(group: DeliveryQuestionGroup) {
  return group.questions.flatMap((question) => (
    question.sourceNumber === null ? [] : [question.sourceNumber]
  ));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function MatchingHeadingsPane({
  group,
  passage,
  remainingGroups,
  onResizeStart,
}: {
  group: DeliveryQuestionGroup;
  passage: DeliveryStimulus | undefined;
  remainingGroups: DeliveryQuestionGroup[];
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const interactionRef = useRef<HTMLDivElement>(null);
  const draggedLabel = useRef<string | null>(null);
  const draggedFromNumber = useRef<number | null>(null);
  useDragAutoScroll(draggedLabel);
  const answers = useTestStore((state) => state.answers.reading);
  const setAnswer = useTestStore((state) => state.setAnswer);
  const setCurrentQuestion = useTestStore((state) => state.setCurrentQuestion);
  const numbers = useMemo(() => questionNumbers(group), [group]);
  const optionByLabel = useMemo(
    () => new Map(group.options.map((option) => [option.label, option])),
    [group.options],
  );
  const usedLabels = new Set(numbers.map((number) => answers[number]).filter(Boolean));
  const {
    containerRef: annotationRef,
    menu,
    openMenu,
    openMenuFromSelection,
    highlight,
    createNote,
    clearHighlights,
  } = useTextAnnotations('reading', passage?.id ?? group.id);

  const passageHtml = useMemo(() => (
    (passage?.bodyHtml ?? passage?.plainText ?? '').replace(
      /<span data-answer-position="Q(\d+)">\[\d+\]<\/span>/g,
      (_match, rawNumber: string) => {
        const number = Number(rawNumber);
        const option = optionByLabel.get(answers[number] ?? '');
        return `<button type="button" class="mock-ielts-gap ${option ? 'populated' : ''}" data-answer-number="${number}" ${option ? `data-answer-label="${escapeHtml(option.label)}" draggable="true"` : ''} aria-label="Question ${number}: ${escapeHtml(option?.text ?? 'Not answered')}">`
          + (option
            ? `<span class="mock-ielts-gap-token">${escapeHtml(option.text)}</span>`
            : `<span class="mock-ielts-gap-number">${number}</span>`)
          + '</button>';
      },
    )
  ), [answers, optionByLabel, passage?.bodyHtml, passage?.plainText]);

  const assign = useCallback((number: number, label: string) => {
    for (const otherNumber of numbers) {
      if (otherNumber !== number && answers[otherNumber] === label) {
        setAnswer('reading', otherNumber, '');
      }
    }
    setAnswer('reading', number, label);
    setCurrentQuestion(number);
    setSelectedLabel(null);
  }, [answers, numbers, setAnswer, setCurrentQuestion]);

  const openTarget = useCallback((from: number, direction: 1 | -1) => {
    const startIndex = numbers.indexOf(from);
    for (let offset = 1; offset <= numbers.length; offset += 1) {
      const index = (startIndex + (offset * direction) + numbers.length) % numbers.length;
      if (!answers[numbers[index]]) return numbers[index];
    }
    return undefined;
  }, [answers, numbers]);

  const firstOpenTarget = useCallback((direction: 1 | -1) => {
    const ordered = direction === 1 ? numbers : [...numbers].reverse();
    return ordered.find((number) => !answers[number]);
  }, [answers, numbers]);

  useTouchDragDrop({
    containerRef: interactionRef,
    draggedLabelRef: draggedLabel,
    onAssign: assign,
    onReturn: (number) => setAnswer('reading', number, ''),
  });

  const targetFromEvent = (event: { target: EventTarget | null }) => (
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-answer-number]')
      : null
  );

  const handleTargetClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = targetFromEvent(event);
    if (!target) return;
    const number = Number(target.dataset.answerNumber);
    setCurrentQuestion(number);
    if (selectedLabel) {
      if (answers[number] === selectedLabel) {
        setAnswer('reading', number, '');
        setSelectedLabel(null);
      } else assign(number, selectedLabel);
    } else if (answers[number]) {
      setSelectedLabel(answers[number]);
    }
  };

  const handleTargetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = targetFromEvent(event);
    if (!target) return;
    const number = Number(target.dataset.answerNumber);
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setAnswer('reading', number, '');
      setSelectedLabel(null);
      return;
    }
    if (
      event.key === 'ArrowLeft'
      || event.key === 'ArrowUp'
      || event.key === 'ArrowRight'
      || event.key === 'ArrowDown'
    ) {
      const label = answers[number] || selectedLabel;
      event.preventDefault();
      if (!label) return;
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const destination = openTarget(number, direction);
      if (destination !== undefined) assign(destination, label);
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (selectedLabel) assign(number, selectedLabel);
    else if (answers[number]) setSelectedLabel(answers[number]);
  };

  const handleTargetDragStart = (event: DragEvent<HTMLDivElement>) => {
    const target = targetFromEvent(event);
    const label = target?.dataset.answerLabel;
    if (!label) return;
    event.dataTransfer.setData('text/plain', label);
    event.dataTransfer.effectAllowed = 'move';
    draggedLabel.current = label;
    draggedFromNumber.current = Number(target?.dataset.answerNumber);
  };

  const first = numbers.at(0);
  const last = numbers.at(-1);

  return (
    <div
      ref={interactionRef}
      className="matching-headings-interaction contents"
      onClick={handleTargetClick}
      onKeyDown={handleTargetKeyDown}
      onDragStart={handleTargetDragStart}
      onDragEnd={() => {
        if (draggedFromNumber.current !== null) {
          setAnswer('reading', draggedFromNumber.current, '');
        }
        draggedFromNumber.current = null;
        draggedLabel.current = null;
      }}
      onDragOver={(event) => {
        if (!draggedLabel.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const target = targetFromEvent(event);
        const label = event.dataTransfer.getData('text/plain') || draggedLabel.current;
        if (!target || !label) return;
        event.preventDefault();
        assign(Number(target.dataset.answerNumber), label);
        draggedFromNumber.current = null;
        draggedLabel.current = null;
      }}
    >
      <div
        data-question-scroll-pane="true"
        className="mock-split-primary h-full overflow-y-auto bg-white"
      >
        <div className="mx-auto max-w-[800px] px-3 py-4 md:px-5">
          <TextAnnotationMenu
            menu={menu}
            onHighlight={highlight}
            onNote={createNote}
            onClear={clearHighlights}
          />
          <div
            ref={annotationRef}
            data-text-annotations="true"
            data-answer-ids={numbers.join(' ')}
            onContextMenu={openMenu}
            onPointerUp={openMenuFromSelection}
            className="mock-question-html mock-reading-text prose max-w-none cursor-text leading-relaxed text-charcoal"
            dangerouslySetInnerHTML={{ __html: passageHtml }}
          />
        </div>
      </div>

      <div
        role="separator"
        aria-label="Resize passage and questions"
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
        className="mock-split-resizer relative w-px shrink-0 touch-none cursor-col-resize bg-[#707070]"
      />

      <div
        data-question-scroll-pane="true"
        className="mock-split-secondary h-full overflow-y-auto bg-white px-3 py-4 md:px-5"
      >
        {first !== undefined && (
          <p className="mb-5 font-bold">
            {first === last ? `Question ${first}` : `Questions ${first}-${last}`}
          </p>
        )}
        <h2 className="mb-3 text-lg font-bold">List of Headings</h2>
        <div className="mock-ielts-dnd-help">
          <button
            type="button"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((current) => !current)}
            className="mock-ielts-dnd-help-button"
          >
            <span aria-hidden="true">⌨</span>
            Help
          </button>
          {showHelp && (
            <div role="status" className="mock-ielts-dnd-help-panel">
              Drag a heading into a numbered gap. On a touch screen, tap a heading and then tap its gap. Select a placed heading and press Delete to remove it.
            </div>
          )}
        </div>

        <div
          className="mock-ielts-token-bank flex-col"
          aria-label="List of headings"
          onDragOver={(event) => {
            if (!draggedLabel.current || !usedLabels.has(draggedLabel.current)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            const label = event.dataTransfer.getData('text/plain') || draggedLabel.current;
            const number = numbers.find((candidate) => answers[candidate] === label);
            if (!label || number === undefined) return;
            event.preventDefault();
            setAnswer('reading', number, '');
            draggedFromNumber.current = null;
            draggedLabel.current = null;
          }}
        >
          {group.options.map((option) => {
            const isUsed = usedLabels.has(option.label);
            const isSelected = selectedLabel === option.label;
            return (
              <button
                type="button"
                key={option.label}
                data-answer-label={option.label}
                draggable={!isUsed}
                aria-pressed={isSelected}
                onClick={() => setSelectedLabel(isSelected ? null : option.label)}
                onDragStart={(event) => {
                  if (isUsed) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.setData('text/plain', option.label);
                  event.dataTransfer.effectAllowed = 'move';
                  draggedLabel.current = option.label;
                }}
                onDragEnd={() => {
                  draggedLabel.current = null;
                  setSelectedLabel(null);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key !== 'ArrowLeft'
                    && event.key !== 'ArrowUp'
                    && event.key !== 'ArrowRight'
                    && event.key !== 'ArrowDown'
                  ) return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                  const destination = firstOpenTarget(direction);
                  if (destination !== undefined) assign(destination, option.label);
                }}
                className={`mock-ielts-token ${isSelected ? 'is-selected' : ''} ${isUsed ? 'opacity' : ''}`}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 pb-4">
          {remainingGroups.map((candidate) => (
            <QuestionGroupRenderer
              key={candidate.id}
              group={candidate}
              section="reading"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
