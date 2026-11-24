'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import TestBrand from '@/components/brand/TestBrand';
import { activeAdminSection, adminNavigation } from '@/lib/admin/navigation';

export default function AdminShell({ locale, children }: { locale: string; children: ReactNode }) {
  const links = adminNavigation(locale, 'ADMIN');
  const active = activeAdminSection(usePathname(), locale);
  const home = `/${locale}/admin`;
  return (
    <div lang="en" dir="ltr" className="min-h-screen bg-[#f5f4f1] font-sans text-charcoal md:grid md:grid-cols-[13.5rem_minmax(0,1fr)]">
      <aside className="border-b border-gray-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:self-start md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 md:block md:px-5 md:pt-6">
          <Link href={home} aria-label="Founder dashboard">
            <TestBrand compact responsive={false} />
          </Link>
          <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-crimson md:mt-4">Account</Link>
        </div>
        <nav aria-label="Workspace" className="grid grid-cols-3 gap-1 px-3 pb-3 pt-2 sm:flex md:mt-2 md:grid md:grid-cols-1 md:gap-1.5 md:px-4">
          {links.map(({ id, href, label }) => (
            <Link key={id} href={href} aria-current={id === active ? 'page' : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg px-2 py-1.5 text-center text-sm font-semibold leading-tight md:justify-start md:px-3 md:text-left ${
                id === active ? 'bg-[#8e1826] text-white' : 'text-gray-700 hover:bg-red-50 hover:text-crimson'
              }`}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="mx-auto min-w-0 w-full max-w-[86rem] px-4 py-6 outline-none sm:px-6 md:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
