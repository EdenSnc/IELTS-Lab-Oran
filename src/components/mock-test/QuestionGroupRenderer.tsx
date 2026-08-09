'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import type { DeliveryQuestionGroup } from '@/lib/content/delivery-types';
import { IELTSSection, useTestStore } from '@/lib/store/useTestStore';
import { TextAnnotationMenu, useTextAnnotations } from './TextAnnotations';
import { useDragAutoScroll } from './useDragAutoScroll';
import { useTouchDragDrop } from './useTouchDragDrop';

const EMPTY_ANSWERS: Record<number, string> = {};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function answerNumbers(group: DeliveryQuestionGroup) {
  return group.questions.flatMap((question) => (
    question.sourceNumber === null ? [] : [question.sourceNumber]
  ));
}

function answerRange(first: number | undefined, last: number | undefined) {
  if (first === undefined) return 'Question';
  return first === last ? `Question ${first}` : `Questions ${first}-${last}`;
}

function fullAnswerInstruction(
  group: DeliveryQuestionGroup,
  section: IELTSSection,
) {
  const raw = group.rawAnswerInstruction?.trim();
  if (!raw) return null;
  if (/^(complete|choose|write|answer|select)\b/i.test(raw) && /[.!?]$/.test(raw)) {
    return raw;
  }

  const taskNames: Record<string, string> = {
    NOTE_COMPLETION: 'notes',
    TABLE_COMPLETION: 'table',
    FLOWCHART_COMPLETION: 'flow chart',
    SUMMARY_COMPLETION: 'summary',
    SENTENCE_COMPLETION: 'sentences',
    SHORT_ANSWER: 'questions',
  };
  const taskName = taskNames[group.questionType] ?? 'text';
  const constraint = raw.replace(/[.!?]+$/, '').toUpperCase();
  const sourcePhrase = section === 'reading' ? ' from the passage' : '';
  const verb = section === 'reading' ? 'Choose' : 'Write';

  if (group.questionType === 'SHORT_ANSWER') {
    return `Answer the questions below. ${verb} ${constraint}${sourcePhrase} for each answer.`;
  }
  return `Complete the ${taskName} below. ${verb} ${constraint}${sourcePhrase} for each answer.`;
}

function withTextControls(group: DeliveryQuestionGroup) {
  return (group.promptHtml ?? '')
    .replace(/(?:&nbsp;|\u00a0)/gi, ' ')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(
    /<span data-answer-position="Q(\d+)">\[\d+\]<\/span>/g,
    (_match, rawNumber: string) => {
      const number = Number(rawNumber);
      return `<label class="mock-inline-answer">`
        + `<span class="sr-only">Answer ${number}</span>`
        + `<input data-answer-number="${number}" aria-label="Answer ${number}" `
        + `placeholder="${number}" type="text" autocomplete="off" spellcheck="false" /></label>`;
      },
    );
}

const InlineTextInteraction = memo(function InlineTextInteraction({
  group,
  section,
}: {
  group: DeliveryQuestionGroup;
  section: IELTSSection;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setAnswer = useTestStore((state) => state.setAnswer);
  const setCurrentQuestion = useTestStore((state) => state.setCurrentQuestion);
  const html = useMemo(() => withTextControls(group), [group]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const currentAnswers = useTestStore.getState().answers[section];

    root.querySelectorAll<HTMLInputElement>('[data-answer-number]').forEach((control) => {
      const number = Number(control.dataset.answerNumber);
      control.value = currentAnswers[number] ?? '';
    });

    const updateAnswer = (event: Event) => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement)) return;
      const number = Number(control.dataset.answerNumber);
      if (!Number.isInteger(number)) return;
      setCurrentQuestion(number);
      setAnswer(section, number, control.value);
    };

    const focusAnswer = (event: Event) => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement)) return;
      const number = Number(control.dataset.answerNumber);
      if (Number.isInteger(number)) setCurrentQuestion(number);
    };

    root.addEventListener('input', updateAnswer);
    root.addEventListener('focusin', focusAnswer);
    return () => {
      root.removeEventListener('input', updateAnswer);
      root.removeEventListener('focusin', focusAnswer);
    };
  }, [section, setAnswer, setCurrentQuestion]);

  return (
    <div
      ref={rootRef}
      className="mock-question-html prose max-w-none text-charcoal"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

function DragDropInteraction({
  group,
  section,
}: {
  group: DeliveryQuestionGroup;
  section: IELTSSection;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const draggedLabelRef = useRef<string | null>(null);
  useDragAutoScroll(draggedLabelRef);
  const answers = useTestStore((state) => state.answers[section]);
  const setAnswer = useTestStore((state) => state.setAnswer);
  const setCurrentQuestion = useTestStore((state) => state.setCurrentQuestion);
  const numbers = useMemo(() => answerNumbers(group), [group]);
  const optionByLabel = useMemo(
    () => new Map(group.options.map((option) => [option.label, option])),
    [group.options],
  );
  const usedLabels = new Set(numbers.map((number) => answers[number]).filter(Boolean));
  const layout = useMemo(() => {
    const html = group.promptHtml ?? '';
    const position = /data-ielts-dnd-layout="right"/i.test(html) ? 'right' : 'bottom';
    const split = html.match(/data-ielts-dnd-split="(\d{2})-(\d{2})"/i);
    return {
      position,
      content: split ? Number(split[1]) : 60,
      bank: split ? Number(split[2]) : 40,
    };
  }, [group.promptHtml]);

  const focusTarget = useCallback((number: number) => {
    window.setTimeout(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(`[data-answer-number="${number}"]`)
        ?.focus();
    }, 0);
  }, []);

  const assign = useCallback((number: number, label: string, restoreFocus = false) => {
    for (const otherNumber of numbers) {
      if (otherNumber !== number && answers[otherNumber] === label) {
        setAnswer(section, otherNumber, '');
      }
    }
    setAnswer(section, number, label);
    setCurrentQuestion(number);
    setSelectedLabel(null);
    if (restoreFocus) focusTarget(number);
  }, [answers, focusTarget, numbers, section, setAnswer, setCurrentQuestion]);

  const clear = useCallback((number: number, restoreFocus = false) => {
    setAnswer(section, number, '');
    setCurrentQuestion(number);
    setSelectedLabel(null);
    if (restoreFocus) focusTarget(number);
  }, [focusTarget, section, setAnswer, setCurrentQuestion]);

  const nextOpenTarget = useCallback((from: number, direction: 1 | -1) => {
    const startIndex = numbers.indexOf(from);
    for (let offset = 1; offset <= numbers.length; offset += 1) {
      const index = (startIndex + (offset * direction) + numbers.length) % numbers.length;
      const candidate = numbers[index];
      if (!answers[candidate]) return candidate;
    }
    return undefined;
  }, [answers, numbers]);

  const firstOpenTarget = useCallback((direction: 1 | -1) => {
    const ordered = direction === 1 ? numbers : [...numbers].reverse();
    return ordered.find((number) => !answers[number]);
  }, [answers, numbers]);

  useTouchDragDrop({
    containerRef: interactionRef,
    draggedLabelRef,
    onAssign: (number, label) => assign(number, label, true),
  });

  const html = useMemo(() => (
    (group.promptHtml ?? '').replace(
      /<span data-answer-position="Q(\d+)">\[\d+\]<\/span>/g,
      (_match, rawNumber: string) => {
        const number = Number(rawNumber);
        const label = answers[number] ?? '';
        const option = optionByLabel.get(label);
        const isSelected = label !== '' && selectedLabel === label;
        const stateClasses = [
          option ? 'populated' : '',
          isSelected ? 'is-selected' : '',
        ].filter(Boolean).join(' ');
        const ariaValue = option ? option.text : 'Not answered';
        return `<button type="button" class="mock-ielts-gap ${stateClasses}" `
          + `data-answer-number="${number}" `
          + `${option ? `data-answer-label="${escapeHtml(option.label)}" ` : ''}`
          + `aria-label="Question ${number}: ${escapeHtml(ariaValue)}">`
          + (
            option
              ? `<span class="mock-ielts-gap-token">${escapeHtml(option.text)}</span><span class="mock-ielts-gap-remove" data-remove-answer="${number}" aria-hidden="true">&times;</span>`
              : `<span class="mock-ielts-gap-number">${number}</span>`
          )
          + '</button>';
      },
    )
  ), [
    answers,
    group.promptHtml,
    optionByLabel,
    selectedLabel,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.querySelectorAll<HTMLElement>('[data-ielts-overlay="true"]').forEach((overlay) => {
      const gap = overlay.querySelector<HTMLElement>(':scope > .mock-ielts-gap');
      if (gap && overlay.textContent?.trim() === gap.textContent?.trim()) {
        overlay.classList.add('answer-overlay-only');
      }
    });

    const readTarget = (event: Event) => {
      const target = event.target;
      return target instanceof Element
        ? target.closest<HTMLElement>('[data-answer-number]')
        : null;
    };
    const readLabel = (event: Event) => {
      const target = event.target;
      return target instanceof Element
        ? target.closest<HTMLElement>('[data-answer-label]')?.dataset.answerLabel
        : undefined;
    };
    const clearDragDecorations = () => {
      root.querySelectorAll('.dragging, .drag-over, .is-dragging').forEach((element) => {
        element.classList.remove('dragging', 'drag-over', 'is-dragging');
      });
    };
    const beginDrag = (label: string, source: HTMLElement | null) => {
      draggedLabelRef.current = label;
      source?.classList.add('is-dragging');
      root.querySelectorAll('.mock-ielts-gap:not(.populated)').forEach((target) => {
        target.classList.add('dragging');
      });
    };
    const onDragStart = (event: DragEvent) => {
      const label = readLabel(event);
      if (!label) return;
      event.dataTransfer?.setData('text/plain', label);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      beginDrag(
        label,
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-answer-label]')
          : null,
      );
    };
    const onDragOver = (event: DragEvent) => {
      if (draggedLabelRef.current) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      }
      const target = readTarget(event);
      if (!target) return;
      root.querySelector('.mock-ielts-gap.drag-over')?.classList.remove('drag-over');
      target.classList.add('drag-over');
    };
    const onDragLeave = (event: DragEvent) => {
      const target = readTarget(event);
      if (!target || target.contains(event.relatedTarget as Node | null)) return;
      target.classList.remove('drag-over');
    };
    const onDrop = (event: DragEvent) => {
      const target = readTarget(event);
      const label = event.dataTransfer?.getData('text/plain') || draggedLabelRef.current;
      if (!target || !label) return;
      event.preventDefault();
      assign(Number(target.dataset.answerNumber), label, true);
      draggedLabelRef.current = null;
      clearDragDecorations();
    };
    const onDragEnd = () => {
      draggedLabelRef.current = null;
      clearDragDecorations();
      setSelectedLabel(null);
    };
    const onClick = (event: Event) => {
      const target = readTarget(event);
      if (!target) return;
      const number = Number(target.dataset.answerNumber);
      setCurrentQuestion(number);
      if (event.target instanceof Element && event.target.closest('[data-remove-answer]')) {
        clear(number, true);
        return;
      }
      if (selectedLabel) {
        if (answers[number] === selectedLabel) clear(number, true);
        else assign(number, selectedLabel, true);
      } else if (answers[number]) {
        setSelectedLabel(answers[number]);
        focusTarget(number);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = readTarget(event);
      if (!target) return;
      const number = Number(target.dataset.answerNumber);
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!answers[number]) return;
        event.preventDefault();
        clear(number, true);
        return;
      }
      if (
        event.key === 'ArrowLeft'
        || event.key === 'ArrowUp'
        || event.key === 'ArrowRight'
        || event.key === 'ArrowDown'
      ) {
        const label = answers[number] || selectedLabel;
        if (!label) return;
        const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        const destination = nextOpenTarget(number, direction);
        if (destination === undefined) return;
        event.preventDefault();
        assign(destination, label, true);
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (selectedLabel) {
        assign(number, selectedLabel, true);
      } else if (answers[number]) {
        setSelectedLabel(answers[number]);
        focusTarget(number);
      }
    };

    root.addEventListener('dragstart', onDragStart);
    root.addEventListener('dragover', onDragOver);
    root.addEventListener('dragleave', onDragLeave);
    root.addEventListener('drop', onDrop);
    root.addEventListener('dragend', onDragEnd);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('dragstart', onDragStart);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('dragend', onDragEnd);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [
    answers,
    assign,
    clear,
    focusTarget,
    nextOpenTarget,
    selectedLabel,
    setCurrentQuestion,
  ]);

  const interactionStyle = {
    '--ielts-content-basis': `${layout.content}%`,
    '--ielts-bank-basis': `${layout.bank}%`,
  } as CSSProperties;

  return (
    <div
      ref={interactionRef}
      className="mock-ielts-dnd"
      data-question-type={group.questionType}
      style={interactionStyle}
      onDragOver={(event) => {
        if (!draggedLabelRef.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-answer-number]')
          : null;
        const label = event.dataTransfer.getData('text/plain') || draggedLabelRef.current;
        if (!target || !label) return;
        event.preventDefault();
        event.stopPropagation();
        assign(Number(target.dataset.answerNumber), label, true);
        draggedLabelRef.current = null;
      }}
    >
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
          <div role="alert" className="mock-ielts-dnd-help-panel">
            Use TAB to navigate between the draggable elements. The active element can be moved between open gaps using the arrow keys and use Alt+arrow keys if you are using screenreaders. Your answer is saved continuously.
          </div>
        )}
      </div>

      <div className={`mock-ielts-dnd-layout tokens-${layout.position}`}>
        <div
          ref={rootRef}
          className="mock-question-html mock-ielts-dnd-content prose max-w-none text-charcoal"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div
          className="mock-ielts-token-bank"
          aria-label="Answer options"
          onDragOver={(event) => {
            const label = draggedLabelRef.current;
            if (!label || !usedLabels.has(label)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            const label = event.dataTransfer.getData('text/plain') || draggedLabelRef.current;
            const assignedNumber = numbers.find((number) => answers[number] === label);
            if (!label || assignedNumber === undefined) return;
            event.preventDefault();
            clear(assignedNumber);
            draggedLabelRef.current = null;
          }}
        >
          {group.options.map((option) => {
            const isSelected = selectedLabel === option.label;
            const isUsed = usedLabels.has(option.label);
            return (
              <button
                type="button"
                key={option.label}
                data-ielts-token
                data-answer-label={option.label}
                draggable={!isUsed}
                onDragStart={(event) => {
                  if (isUsed) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.setData('text/plain', option.label);
                  event.dataTransfer.effectAllowed = 'move';
                  draggedLabelRef.current = option.label;
                  event.currentTarget.classList.add('is-dragging');
                  rootRef.current
                    ?.querySelectorAll('.mock-ielts-gap:not(.populated)')
                    .forEach((target) => target.classList.add('dragging'));
                }}
                onDragEnd={(event) => {
                  draggedLabelRef.current = null;
                  event.currentTarget.classList.remove('is-dragging');
                  rootRef.current
                    ?.querySelectorAll('.dragging, .drag-over')
                    .forEach((target) => target.classList.remove('dragging', 'drag-over'));
                  setSelectedLabel(null);
                }}
                onClick={() => setSelectedLabel(isSelected ? null : option.label)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'ArrowLeft'
                    || event.key === 'ArrowUp'
                    || event.key === 'ArrowRight'
                    || event.key === 'ArrowDown'
                  ) {
                    event.preventDefault();
                    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                    const destination = firstOpenTarget(direction);
                    if (destination !== undefined) assign(destination, option.label, true);
                    return;
                  }
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  setSelectedLabel(isSelected ? null : option.label);
                }}
                aria-pressed={isSelected}
                className={`mock-ielts-token ${isSelected ? 'is-selected' : ''} ${isUsed ? 'opacity' : ''}`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuestionGroupRenderer({
  group,
  section,
}: {
  group: DeliveryQuestionGroup;
  section: IELTSSection;
}) {
  const numbers = useMemo(() => answerNumbers(group), [group]);
  const firstNumber = numbers.at(0);
  const lastNumber = numbers.at(-1);
  const isChoice =
    group.responseKind === 'SINGLE_CHOICE'
    || group.responseKind === 'MULTIPLE_CHOICE'
    || group.scoringStrategy === 'UNORDERED_EXACT_SET';
  const answers = useTestStore((state) => (
    isChoice ? state.answers[section] : EMPTY_ANSWERS
  ));
  const currentQuestionId = useTestStore((state) => state.currentQuestionId);
  const setAnswer = useTestStore((state) => state.setAnswer);
  const setCurrentQuestion = useTestStore((state) => state.setCurrentQuestion);
  const isSetChoice =
    group.responseKind === 'MULTIPLE_CHOICE'
    || group.scoringStrategy === 'UNORDERED_EXACT_SET';
  const selectedLabels = numbers.map((number) => answers[number]).filter(Boolean);
  const {
    containerRef: annotationRef,
    menu: annotationMenu,
    openMenu,
    highlight,
    createNote,
    clearHighlights,
  } = useTextAnnotations(section, group.id);
  const answerInstruction = fullAnswerInstruction(group, section);

  const toggleSetOption = (label: string) => {
    const next = selectedLabels.includes(label)
      ? selectedLabels.filter((selected) => selected !== label)
      : selectedLabels.length < numbers.length
        ? [...selectedLabels, label]
        : selectedLabels;
    numbers.forEach((number, index) => setAnswer(section, number, next[index] ?? ''));
    if (firstNumber !== undefined) setCurrentQuestion(firstNumber);
  };

  return (
    <section
      ref={annotationRef}
      id={firstNumber === undefined ? `group-${group.id}` : `question-${firstNumber}`}
      data-answer-ids={numbers.join(' ')}
      data-text-annotations="true"
      onContextMenu={openMenu}
      className="bg-white py-2"
    >
      <TextAnnotationMenu
        menu={annotationMenu}
        onHighlight={highlight}
        onNote={createNote}
        onClear={clearHighlights}
      />

      <div className="mb-3">
        {firstNumber !== undefined && !isChoice && (
          <p className="font-bold text-charcoal">
            {answerRange(firstNumber, lastNumber)}
          </p>
        )}
        {answerInstruction && (
          <p className="mt-1 font-semibold text-[#54585a]">
            {answerInstruction}
          </p>
        )}
        {group.instructionsHtml && (
          <div
            className="mt-2 text-[#54585a]"
            dangerouslySetInnerHTML={{ __html: group.instructionsHtml }}
          />
        )}
      </div>

      {group.responseKind === 'SHORT_TEXT' && (
        <InlineTextInteraction group={group} section={section} />
      )}

      {group.responseKind === 'DRAG_DROP' && (
        <DragDropInteraction group={group} section={section} />
      )}

      {isChoice && group.promptHtml && (
        <div className={`mock-choice-prompt ${firstNumber !== lastNumber ? 'is-range' : ''}`}>
          {firstNumber !== undefined && (
            <span
              className={currentQuestionId === firstNumber
                ? 'mock-choice-number is-current'
                : 'mock-choice-number'}
            >
              {answerRange(firstNumber, lastNumber).replace('Question ', '')}
            </span>
          )}
          <div
            className="mock-question-html prose max-w-none text-charcoal"
            dangerouslySetInnerHTML={{ __html: group.promptHtml }}
          />
        </div>
      )}

      {isChoice && (
        <fieldset className="mt-3 grid gap-1">
          <legend className="sr-only">{answerRange(firstNumber, lastNumber)}</legend>
          {group.options.map((option) => {
            const checked = isSetChoice
              ? selectedLabels.includes(option.label)
              : firstNumber !== undefined && answers[firstNumber] === option.label;
            return (
              <label
                key={option.label}
                className="flex cursor-pointer items-start gap-3 py-1.5"
              >
                <input
                  type={isSetChoice ? 'checkbox' : 'radio'}
                  name={`group-${group.id}`}
                  checked={checked}
                  onFocus={() => {
                    if (firstNumber !== undefined) setCurrentQuestion(firstNumber);
                  }}
                  onChange={() => {
                    if (isSetChoice) {
                      toggleSetOption(option.label);
                    } else if (firstNumber !== undefined) {
                      setCurrentQuestion(firstNumber);
                      setAnswer(section, firstNumber, option.label);
                    }
                  }}
                  className="mt-[5px] h-[13px] w-[13px] shrink-0"
                />
                <span className="mock-choice-option-label" aria-hidden="true">{option.label}</span>
                <span>{option.text}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </section>
  );
}

export default memo(QuestionGroupRenderer);
