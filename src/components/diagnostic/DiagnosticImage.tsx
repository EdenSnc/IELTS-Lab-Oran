'use client';
import { useState } from 'react';
import { diagnosticMessages, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import styles from './diagnostic.module.css';
export default function DiagnosticImage({ src, description, locale, onAvailability }: {
  src: string; description: string; locale: DiagnosticLocale; onAvailability: (available: boolean) => void;
}) {
  const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  const m = diagnosticMessages[locale];
  return <>
    {/* Private cookie-authenticated images must not pass through the public Next image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={retry} src={src} alt={description} className={styles.sourceImage} lang="en" dir="ltr"
      onLoad={() => { setFailed(false); onAvailability(true); }} onError={() => { setFailed(true); onAvailability(false); }} />
    {failed && <div role="alert" className={styles.notice}><p>{m.mediaFailed}</p>
      <button type="button" className={styles.secondary} onClick={() => setRetry(value => value + 1)}>{m.retryImage}</button></div>}
  </>;
}
