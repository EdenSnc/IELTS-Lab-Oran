'use client';

import { useTranslations } from 'next-intl';

interface TrustBadgesProps {
  /** 'light' for use on dark backgrounds (Intake), 'dark' for light backgrounds (Hero) */
  variant?: 'light' | 'dark';
}

export default function TrustBadges({ variant = 'dark' }: TrustBadgesProps) {
  const t = useTranslations('TrustBadges');

  const textColor = variant === 'light' ? 'text-white/40' : 'text-gray-400';
  const dividerColor = variant === 'light' ? 'text-white/20' : 'text-gray-300';
  const iconColor = variant === 'light' ? 'text-white/40' : 'text-gray-400';

  return (
    <div className={`flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs font-medium ${textColor}`}>

      {/* PAYMENT BADGES HIDDEN TEMPORARILY
      <span className="flex items-center gap-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
        {t('cash')}
      </span>

      <span className={dividerColor} aria-hidden="true">·</span>

      <span className="flex items-center gap-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 18h6" />
          <path d="M9 7h6M9 11h4" />
        </svg>
        {t('baridimob')}
      </span>

      <span className={dividerColor} aria-hidden="true">·</span>
      */}

      {/* Band 8.0 Certified badge */}
      <span className="flex items-center gap-1.5">
        {/* Shield check icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3l8 4v5c0 4.5-3.4 8.7-8 10-4.6-1.3-8-5.5-8-10V7l8-4z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
        {t('certified')}
      </span>

    </div>
  );
}
