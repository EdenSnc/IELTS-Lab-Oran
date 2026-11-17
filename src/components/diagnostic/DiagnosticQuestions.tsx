'use client';

import type { DeliveryQuestionGroup } from '@/lib/content/delivery-types';
import { boundDiagnosticEssay, countDiagnosticWords, diagnosticControlKind, mapDiagnosticSelection, toggleDiagnosticSelection } from '@/lib/diagnostic/answer-core';
import { diagnosticMessages, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import styles from './diagnostic.module.css';

export type DiagnosticQuestionsProps = {
  group: DeliveryQuestionGroup;
  answers: Record<string, string>;
  disabled: boolean;
  locale: DiagnosticLocale;
  onAnswerChange: (questionId: string, answer: string) => void;
};

/** Only trusted, server-sanitized source HTML is rendered as HTML. Answers stay text. */
export function DiagnosticSource({ html }: { html: string | null }) {
  return html ? <div className={styles.source} lang="en" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

export default function DiagnosticQuestions({ group, answers, disabled, locale, onAnswerChange }: DiagnosticQuestionsProps) {
  const m = diagnosticMessages[locale];
  const kind = diagnosticControlKind(group);
  const selected = group.options.filter((o) => group.questions.some((q) => answers[q.id] === o.label));
  function writeSet(next: Record<string, string>) {
    for (const question of group.questions) onAnswerChange(question.id, next[question.id]);
  }
  return <div className={styles.questions}>
    <DiagnosticSource html={group.instructionsHtml} />
    {group.rawAnswerInstruction && <p lang="en" dir="ltr" className={styles.source}>{group.rawAnswerInstruction}</p>}
    <DiagnosticSource html={group.promptHtml} />
    {kind === 'unsupported' ? <p role="alert" className={styles.notice}>{m.unsupported}</p> : kind === 'multi' ? <>
      {group.questions.map((q) => <DiagnosticSource key={q.id} html={q.promptHtml} />)}
      <fieldset disabled={disabled} className={styles.fieldset}>
        <legend>{m.chooseUpTo} {group.questions.length} · {selected.length} {m.selected}</legend>
        {group.options.map((option) => <label key={option.label} className={styles.option}>
          <input type="checkbox" checked={selected.some((o) => o.label === option.label)}
            disabled={disabled || (selected.length >= group.questions.length && !selected.some((o) => o.label === option.label))}
            onChange={() => writeSet(toggleDiagnosticSelection(group, answers, option.label))} />
          <span lang="en" dir="ltr"><strong>{option.label}</strong> {option.text}</span>
        </label>)}
      </fieldset>
      <button type="button" className={styles.secondary} disabled={disabled || !selected.length}
        onClick={() => writeSet(mapDiagnosticSelection(group, []))}>{m.clearGroup}</button>
    </> : group.questions.map((question, index) => {
      const id = `diagnostic-answer-${question.id}`;
      const number = question.sourceNumber ?? index + 1;
      const answer = answers[question.id] ?? '';
      const label = kind === 'essay' ? m.essay : `${m.answer} · ${m.question} ${number}`;
      return <div key={question.id} className={styles.question}>
        <DiagnosticSource html={question.promptHtml} />
        {kind === 'single' ? <fieldset disabled={disabled} className={styles.fieldset}>
          <legend>{label}</legend>
          {group.options.map((option) => <label key={option.label} className={styles.option}>
            <input type="radio" name={id} checked={answer === option.label} onChange={() => onAnswerChange(question.id, option.label)} />
            <span lang="en" dir="ltr"><strong>{option.label}</strong> {option.text}</span>
          </label>)}
        </fieldset> : <>
          <label className={styles.label} htmlFor={id}>{label}</label>
          {kind === 'select' ? <select id={id} dir="ltr" className={styles.input} value={answer} disabled={disabled}
            onChange={(event) => onAnswerChange(question.id, event.target.value)}>
            <option value="">{m.select}</option>
            {group.options.map((option) => <option key={option.label} value={option.label} lang="en">{option.label} — {option.text}</option>)}
          </select> : kind === 'essay' ? <>
            <textarea id={id} lang="en" dir="ltr" className={styles.essay} value={answer} maxLength={20_000}
              aria-describedby={`${id}-count`} disabled={disabled} spellCheck={false}
              onChange={(event) => onAnswerChange(question.id, boundDiagnosticEssay(event.target.value))} />
            <p id={`${id}-count`} className={styles.meta}>{countDiagnosticWords(answer)} {m.words} · {m.characterLimit}</p>
          </> : <input id={id} lang="en" dir="ltr" className={styles.input} value={answer} disabled={disabled}
            autoComplete="off" spellCheck={false} onChange={(event) => onAnswerChange(question.id, event.target.value)} />}
        </>}
        <button type="button" className={styles.secondary} disabled={disabled || !answer}
          aria-label={`${m.clear} · ${m.question} ${number}`} onClick={() => onAnswerChange(question.id, '')}>{m.clear}</button>
      </div>;
    })}
  </div>;
}
