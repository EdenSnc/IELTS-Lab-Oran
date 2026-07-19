'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Algerian mobile number: 05x, 06x, 07x - with or without +213 prefix
const phoneRegex = /^(?:\+213|0)[567]\d{8}$/;

export default function LeadMagnet() {
  const t = useTranslations('LeadMagnet');
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedPhone = phone.trim().replace(/\s+/g, '');

    // Client-side validation - clear, specific error message
    if (!trimmedPhone) {
      setStatus('error');
      setErrorMessage(t('errorRequired'));
      inputRef.current?.focus();
      return;
    }

    if (!phoneRegex.test(trimmedPhone)) {
      setStatus('error');
      setErrorMessage(t('invalidPhone'));
      inputRef.current?.focus();
      return;
    }

    setStatus('submitting');

    try {
      const utmSource = searchParams.get('utm_source');
      const utmMedium = searchParams.get('utm_medium');
      const utmCampaign = searchParams.get('utm_campaign');

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: trimmedPhone,
          utmSource,
          utmMedium,
          utmCampaign,
          formName: 'Lead Magnet (Academic vs General)',
          source: 'lead_magnet_pdf',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      setStatus('success');

      // Trigger PDF download
      const link = document.createElement('a');
      link.href = '/academic_vs_general_guide.pdf';
      link.download = 'IELTS_Academic_vs_General_Guide.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // WhatsApp redirect
      const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213780343103';
      const message = 'Hi Mr.Senouci, I just downloaded the IELTS Academic vs. General guide and I would like more information...';
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      setTimeout(() => { window.location.href = waUrl; }, 1000);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      console.error('Lead submission failed:', error);
      setStatus('error');
      setErrorMessage(msg);
    }
  };

  return (
    <section id="lead-magnet" className="py-16 px-4 md:px-12 max-w-5xl mx-auto mb-20 relative z-10">
      <div className="bg-charcoal text-white rounded-[3rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="md:w-1/2 relative z-10 text-center md:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">{t('title')}</h2>
          <p className="text-gray-300 text-lg font-light leading-relaxed mb-4">{t('subtitle')}</p>
          <p className="text-sm text-gray-400 font-medium">{t('description')}</p>
        </div>
        
        <div className="md:w-1/2 w-full relative z-10 min-h-[120px] flex items-center justify-center">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center text-center gap-2 animate-fade-in">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="font-bold text-lg text-white">{t('successTitle')}</p>
              <p className="text-sm text-gray-400">{t('successDesc')}</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="relative w-full max-w-sm mx-auto md:mx-0"
            >
              {/* Visually-hidden label for screen readers */}
              <label htmlFor="lm-phone" className="sr-only">
                {t('phoneLabel')}
              </label>

              <input
                ref={inputRef}
                id="lm-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                disabled={status === 'submitting'}
                aria-invalid={status === 'error'}
                aria-describedby={status === 'error' ? 'lm-phone-error' : undefined}
                placeholder={t('placeholder')}
                className="w-full bg-white/5 border border-white/10 text-white rounded-3xl px-6 py-4 focus:outline-none focus:border-crimson/50 focus:bg-white/10 transition-all placeholder-gray-500 text-lg font-medium"
              />

              {status === 'error' && (
                <p
                  id="lm-phone-error"
                  role="alert"
                  className="mt-2 text-sm font-semibold text-crimson/90"
                >
                  {errorMessage}
                </p>
              )}

              {/* Full-width on mobile, auto-width on desktop, always large tap target */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="mt-4 w-full bg-crimson text-white font-bold rounded-3xl px-6 py-4 hover:bg-red-800 transition-colors shadow-glow flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    {t('submit')}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
