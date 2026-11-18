'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import Image from 'next/image';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const SUPABASE_AUTH_COOKIE_PATTERN = /(?:^|;\s*)sb-[^=;]+-auth-token/u;

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    // Avoid downloading @supabase/supabase-js on public marketing visits
    // unless a Supabase auth cookie is actually present in the browser.
    if (typeof document === 'undefined') return;
    if (!SUPABASE_AUTH_COOKIE_PATTERN.test(document.cookie)) {
      return;
    }
    if (unsubscribeRef.current) return;

    let cancelled = false;

    void import('@/lib/supabase/browser').then(({ createSupabaseBrowserClient }) => {
      if (cancelled || unsubscribeRef.current) return;
      const client = createSupabaseBrowserClient();
      void client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        if (!cancelled) setSignedIn(Boolean(data.session));
      });
      const { data } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        if (!cancelled) setSignedIn(Boolean(session));
      });
      unsubscribeRef.current = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-4xl bg-white/95 backdrop-blur-lg border border-gray-200/80 shadow-soft rounded-full px-3 py-2.5 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 ps-3 group shrink-0">
          <Image src="/ielts-lab-mark.svg" alt={t('logoAlt')} width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-bold tracking-tight text-sm text-charcoal hidden sm:block group-hover:text-crimson transition-colors">{t('title')}</span>
        </Link>

        {/* Center Links - Desktop only */}
        <div className="hidden md:flex items-center gap-7 text-xs font-bold text-gray-700 tracking-wide uppercase">
          <Link href="/#methodology" className="hover:text-charcoal transition-colors">{t('methodology')}</Link>
          <Link href="/articles" className="hover:text-charcoal transition-colors">{t('articles')}</Link>
          <Link href="/mock-test" className="hover:text-charcoal transition-colors">{t('mockTest')}</Link>
          <Link href="/#faq" className="hover:text-charcoal transition-colors">{t('faq')}</Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 pe-1">
          {/* Language switcher - sm and up */}
          <div className="hidden sm:flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
            <Link href={pathname} locale="en" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'en' ? 'bg-charcoal text-white shadow-sm pointer-events-none' : 'text-gray-700 hover:text-charcoal transition-all'}`}>EN</Link>
            <Link href={pathname} locale="fr" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'fr' ? 'bg-charcoal text-white shadow-sm pointer-events-none' : 'text-gray-700 hover:text-charcoal transition-all'}`}>FR</Link>
            <Link href={pathname} locale="ar" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'ar' ? 'bg-charcoal text-white shadow-sm pointer-events-none' : 'text-gray-700 hover:text-charcoal transition-all'}`}>AR</Link>
          </div>
          {/* CTA - desktop */}
          <Link href="/#intake" className="hidden md:inline-flex text-xs font-bold bg-charcoal text-white px-6 py-2.5 rounded-full hover:bg-[#c4162c] hover:shadow-glow transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu hover:-translate-y-0.5 hover:scale-105 active:scale-95 whitespace-nowrap will-change-transform">
            {t('applyNow')}
          </Link>
          {/* CTA - mobile */}
          <Link href="/#intake" className="md:hidden text-[11px] font-bold bg-charcoal text-white px-4 py-2 rounded-full hover:bg-[#c4162c] transition-all active:scale-95 whitespace-nowrap">
            {t('applyNow')}
          </Link>
          <Link
            href="/account"
            rel="nofollow"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-gray-50 text-charcoal transition-colors hover:border-gray-300 hover:bg-white"
            aria-label={`${t('account')}${signedIn ? t('signedInSuffix') : ''}`}
            title={signedIn ? t('signedInTitle') : t('account')}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
            </svg>
            {signedIn && <span aria-hidden="true" className="absolute end-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />}
          </Link>
          {/* Hamburger - mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            aria-label={t('toggleMenu')}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-charcoal hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <nav
        id="mobile-nav-menu"
        aria-label={t('toggleMenu')}
        aria-hidden={!mobileOpen}
        className={`md:hidden fixed top-[5.5rem] left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-[39] transition-all duration-300 ease-out ${
          mobileOpen
            ? 'visible opacity-100 translate-y-0 pointer-events-auto'
            : 'invisible opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-lg border border-gray-200 shadow-xl rounded-3xl p-4 flex flex-col gap-1">
          <Link href="/#methodology" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-700 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('methodology')}
          </Link>
          <Link href="/articles" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-700 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('articles')}
          </Link>
          <Link href="/mock-test" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-700 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('mockTest')}
          </Link>
          <Link href="/#faq" onClick={() => setMobileOpen(false)} className="text-sm font-bold text-gray-700 uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-gray-50 hover:text-charcoal transition-colors">
            {t('faq')}
          </Link>
          <div className="border-t border-gray-200 pt-3 mt-1 flex items-center justify-center gap-2">
            <Link href={pathname} locale="en" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'en' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-700 border-gray-300 hover:border-gray-400'}`}>EN</Link>
            <Link href={pathname} locale="fr" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'fr' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-700 border-gray-300 hover:border-gray-400'}`}>FR</Link>
            <Link href={pathname} locale="ar" className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${locale === 'ar' ? 'bg-charcoal text-white border-charcoal' : 'text-gray-700 border-gray-300 hover:border-gray-400'}`}>AR</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
