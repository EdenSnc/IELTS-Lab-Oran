import Image from 'next/image';
import Link from 'next/link';
import type { DiagnosticReportDto } from '@/lib/diagnostic/assessment-service';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticAssessmentMessages } from '@/lib/diagnostic/assessment-messages';
import styles from './diagnostic.module.css';

export default function DiagnosticReport({ locale, report }: { locale: DiagnosticLocale; report: DiagnosticReportDto }) {
  const m = diagnosticAssessmentMessages[locale];
  const criterionNames = { TASK_RESPONSE: m.taskResponse, COHERENCE_COHESION: m.coherence, LEXICAL_RESOURCE: m.vocabulary, GRAMMAR: m.grammar };
  return <div className={styles.shell} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className={styles.header}><Link href={`/${locale}`} className={styles.brand} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={38} height={38} />IELTS Lab</Link></header>
    <main className={styles.container}><h1 className={styles.heroTitle}>{report.state === 'PENDING' ? m.pending : report.state === 'EXPIRED' ? m.expired : m.title}</h1>
      <p className={styles.meta}>{m.disclaimer}</p>
      {report.state === 'PENDING' ? <p>{m.pendingHelp}</p> : report.state === 'EXPIRED' ? <p>{m.expiredHelp}</p> : <>
        <div className={styles.reviewList}>{report.rawScores.map(score => <section className={styles.reviewItem} key={score.skill}>
          <h2 className={styles.heading}>{score.skill === 'LISTENING' ? m.listening : m.reading}</h2>
          <p>{m.rawMarks}: <span dir="ltr">{score.rawScore} / {score.maximumRawScore}</span></p><p>{m.answered}: {score.answered}</p>
        </section>)}</div>
        <section className={styles.panel}><h2>{m.writing}</h2>{report.aiWritingUsed && <p className={styles.meta}>{m.aiUsed}</p>}
          {report.writing.criteria.map(item => <article className={styles.feedbackItem} key={item.criterion}><h3 className={styles.heading}>{criterionNames[item.criterion]}</h3>
            <p>{item.observation}</p>{item.evidence.map(quote => <blockquote className={styles.notice} dir="ltr" lang="en" key={quote}>{quote}</blockquote>)}
          </article>)}<h3 className={styles.heading}>{m.limitations}</h3><ul>{report.writing.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className={styles.panel}><h2>{m.speaking}</h2><ul>{report.speaking.observations.map(item => <li key={item}>{item}</li>)}</ul>
          <h3 className={styles.heading}>{m.limitations}</h3><ul>{report.speaking.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className={styles.panel}><h2>{m.priorities}</h2><ol>{report.nextSteps.map(item => <li key={item}>{item}</li>)}</ol></section>
        <p className={styles.meta}>{m.expires}: {new Intl.DateTimeFormat(locale,{ dateStyle: 'medium', timeZone: 'Africa/Algiers' }).format(new Date(report.expiresAt))}</p>
      </>}
      <div className={styles.actions}><Link className={styles.secondary} href={`/${locale}/diagnostic`}>{m.back}</Link></div>
    </main>
  </div>;
}
