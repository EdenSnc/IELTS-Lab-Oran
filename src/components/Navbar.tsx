'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import Image from 'next/image';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-4xl bg-white/90 backdrop-blur-lg border border-gray-100 shadow-soft rounded-full px-3 py-2.5 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 pl-3 group shrink-0">
          <Image src="/logo_rounded.png" alt="IELTS Lab Oran Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          <span className="font-bold tracking-tight text-sm hidden sm:block group-hover:text-crimson transition-colors">IELTS Lab Oran</span>
        </Link>
        
        {/* Center Links - Desktop only */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-500 tracking-wide uppercase">
          <Link href="/#methodology" className="hover:text-charcoal transition-colors">{t('methodology')}</Link>
          <Link href="/articles" className="hover:text-charcoal transition-colors">{t('articles')}</Link>
          <Link href="/#faq" className="hover:text-charcoal transition-colors">{t('faq')}</Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 pr-1">
          {/* Language switcher - sm and up */}
          <div className="hidden sm:flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
            <Link href={pathname} locale="en" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'en' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>EN</Link>
            <Link href={pathname} locale="fr" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'fr' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>FR</Link>
            <Link href={pathname} locale="ar" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'ar' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>AR</Link>
          </div>
          {/* CTA - desktop */}
          <Link href="/#intake" className="hidden md:inline-flex text-xs font-bold bg-charcoal text-white px-6 py-2.5 rounded-full hover:bg-crimson hover:shadow-glow transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu hover:-translate-y-0.5 hover:scale-105 active:scale-95 whitespace-nowrap will-change-transform">
            {t('applyNow')}
          </Link>
          {/* CTA - mobile */}
          <Link href="/#intake" className="md:hidden text-[11px] font-bold bg-charcoal text-white px-4 py-2 rounded-full hover:bg-crimson transition-all active:scale-95 whitespace-nowrap">
            {t('applyNow')}
          </Link>
          {/* Hamburger - mobile only */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-charcoal hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div
        className={`md:hidden fixed top-[5.5rem] left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-[39] transition-all duration-300 ease-out ${
          mobileOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-lg border border-gray-100 shadow-xl rounded-3xl p-4 flex flex-col gap-1">
          <Link href="/#methodology" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-600 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('methodology')}
          </Link>
          <Link href="/articles" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-600 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('articles')}
          </Link>
          <Link href="/#faq" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-600 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('faq')}
          </Link>
          <div className="border-t border-gray-100 pt-3 mt-1 flex items-center justify-center gap-2">
            <Link href={pathname} locale="en" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'en' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}>EN</Link>
            <Link href={pathname} locale="fr" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'fr' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}>FR</Link>
            <Link href={pathname} locale="ar" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'ar' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}>AR</Link>
          </div>
        </div>
      </div>
    </>
  );
}
