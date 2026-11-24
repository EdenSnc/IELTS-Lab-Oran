import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import AdminShell from '@/components/admin/AdminShell';
import { ADMIN_PATH_HEADER, adminReturnPath } from '@/lib/admin/navigation';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  robots: { index: false, follow: false },
  twitter: null,
};

export default async function AdminLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Enforce authentication and staff role in the layout before any child
  // loading.tsx Suspense boundary can flush an HTTP 200 skeleton to crawlers.
  const { locale } = await params;
  const pathname = adminReturnPath((await headers()).get(ADMIN_PATH_HEADER), locale) ?? `/${locale}/admin`;
  const actor = await requireStaffPageAal2(['CONTENT_REVIEWER', 'ADMIN'], pathname);
  if (actor.role !== 'ADMIN' && actor.role !== 'CONTENT_REVIEWER') notFound();
  return <AdminShell locale={locale} role={actor.role}>{children}</AdminShell>;
}
