'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import WorkspaceIcon from './WorkspaceIcon';
import { activeAdminSection, adminNavigation } from '@/lib/admin/navigation';

export default function AdminShell({ locale, children }: { locale: string; children: ReactNode }) {
  const links = adminNavigation(locale, 'ADMIN');
  const active = activeAdminSection(usePathname(), locale);
  const home = `/${locale}/admin`;
  return (
    <div lang="en" dir="ltr" className="min-h-screen bg-[#f8f7f5] font-sans text-charcoal md:grid md:grid-cols-[13.25rem_minmax(0,1fr)] lg:grid-cols-[14.25rem_minmax(0,1fr)]">
      <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:self-start md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-2 md:px-5 md:pb-4 md:pt-6">
          <Link href={home} aria-label="Founder dashboard" className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-crimson">
            <TestBrand compact responsive={false} />
          </Link>
          <Link href={`/${locale}/account`} aria-label="Account" className="grid size-11 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-700 hover:text-crimson md:hidden">
            <WorkspaceIcon name="account" />
          </Link>
        </div>
        <nav aria-label="Workspace" className="grid grid-cols-5 gap-0.5 px-2 pb-2 md:grid-cols-1 md:gap-1.5 md:px-3">
          {links.map(({ id, href, label }) => (
            <Link key={id} href={href} aria-current={id === active ? 'page' : undefined}
              aria-label={label}
              className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[10px] font-semibold leading-tight transition-colors motion-reduce:transition-none sm:text-xs md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm ${
                id === active ? 'bg-[#f7ecec] text-[#8e1826]' : 'text-stone-700 hover:bg-stone-100 hover:text-charcoal'
              }`}>
              <WorkspaceIcon name={id} className="size-[18px] shrink-0" />
              {id === 'operations' ? <><span className="md:hidden">Payments</span><span className="hidden md:inline">{label}</span></> : label}
            </Link>
          ))}
        </nav>
        <Link href={`/${locale}/account`} className="mx-3 mb-4 mt-auto hidden min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 md:flex">
          <WorkspaceIcon name="account" className="size-[18px]" /> Account
        </Link>
      </aside>
      <main id="main-content" tabIndex={-1} className="mx-auto min-w-0 w-full max-w-[84rem] px-4 py-6 outline-none sm:px-6 md:py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
