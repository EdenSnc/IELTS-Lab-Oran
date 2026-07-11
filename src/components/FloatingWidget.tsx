'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export default function FloatingWidget() {
  const t = useTranslations('EventWidget');
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[100] flex items-end">
      <div 
        className={`relative bg-charcoal/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group ${
          isExpanded 
            ? 'rounded-full w-[310px] md:w-[350px] h-[64px] md:h-[72px] hover:-translate-y-1' 
            : 'rounded-full w-[56px] md:w-[64px] h-[56px] md:h-[64px] cursor-pointer hover:bg-charcoal hover:scale-110'
        }`}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
      >
        {/* The Link area (clickable space) */}
        <Link 
          href="/articles/aiesec-workshop"
          className={`absolute inset-0 z-10 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!isExpanded}
          aria-label="AIESEC Workshop"
        />

        {/* Glow & Text Layer (Isolated overflow-hidden to prevent clipping the notification dot) */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          {/* Glow Background (Only when expanded) */}
          <div className={`absolute inset-0 rounded-full bg-crimson/20 transition-opacity duration-500 blur-xl ${isExpanded ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}></div>

          {/* Text Container */}
          <div className={`absolute left-[64px] md:left-[76px] top-0 h-full flex flex-col justify-center text-white whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isExpanded ? 'opacity-100 translate-x-0 delay-100' : 'opacity-0 -translate-x-8'
          }`}>
            <span className="text-[10px] md:text-xs font-bold tracking-widest text-gray-400 uppercase leading-tight mb-0.5">{t('badge')}</span>
            <span className="text-sm md:text-base font-semibold leading-tight">{t('title')}</span>
          </div>
        </div>

        {/* Shared Logo - Glides between left alignment and center alignment (NO overflow-hidden here) */}
        <div className={`absolute z-20 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none ${
          isExpanded 
            ? 'left-3 top-[12px] md:left-4 md:top-[12px] w-10 h-10 md:w-12 md:h-12' 
            : 'left-[8px] top-[8px] md:left-[8px] md:top-[8px] w-10 h-10 md:w-12 md:h-12 scale-100 group-hover:scale-105'
        }`}>
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white shadow-md">
            <Image src="/aiesec-logo.png" alt="AIESEC" width={64} height={64} className="w-full h-full object-contain scale-[1.3] -translate-y-1" />
          </div>
          {/* Notification Dot (Only visible when minimized) */}
          <span className={`absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 transition-all duration-500 ${!isExpanded ? 'opacity-100 scale-100 delay-200' : 'opacity-0 scale-0'}`}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-crimson border-2 border-charcoal"></span>
          </span>
        </div>

        {/* Dismiss Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className={`absolute right-2 md:right-3 top-[16px] md:top-[20px] w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition-all duration-500 z-30 ${
            isExpanded ? 'opacity-100 scale-100 delay-100' : 'opacity-0 scale-50 pointer-events-none'
          }`}
          aria-label="Minimize"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

      </div>
    </div>
  );
}
