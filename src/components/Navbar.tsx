'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-4xl bg-white/90 backdrop-blur-lg border border-gray-100 shadow-soft rounded-full px-3 py-2.5 flex justify-between items-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 pl-3 group shrink-0">
        <img src="/logo_rounded.png" alt="IELTS Lab Oran Logo" width="32" height="32" className="w-8 h-8 object-contain" />
        <span className="font-bold tracking-tight text-sm hidden sm:block group-hover:text-crimson transition-colors">IELTS Lab Oran</span>
      </Link>
      
      {/* Center Links */}
      <div className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-500 tracking-wide uppercase">
        <Link href="/#methodology" className="hover:text-charcoal transition-colors">{t('methodology')}</Link>
        <Link href="/articles" className="hover:text-charcoal transition-colors">{t('articles')}</Link>
        <Link href="/#faq" className="hover:text-charcoal transition-colors">{t('faq')}</Link>
      </div>

      {/* Right Side: Lang + CTA */}
      <div className="flex items-center gap-2 pr-1">
        <div className="hidden sm:flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
          <Link href={pathname} locale="en" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'en' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>EN</Link>
          <Link href={pathname} locale="fr" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'fr' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>FR</Link>
          <Link href={pathname} locale="ar" className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${locale === 'ar' ? 'bg-white text-charcoal shadow-sm pointer-events-none' : 'text-gray-400 hover:text-charcoal transition-all'}`}>AR</Link>
        </div>
        <Link href="/#intake" className="text-xs font-bold bg-charcoal text-white px-6 py-2.5 rounded-full hover:bg-crimson hover:shadow-glow transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu hover:-translate-y-0.5 hover:scale-105 active:scale-95 whitespace-nowrap will-change-transform">
          {t('applyNow')}
        </Link>
      </div>
    </nav>
  );
}
