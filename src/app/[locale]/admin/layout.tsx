import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce authentication and staff role in the layout before any child
  // loading.tsx Suspense boundary can flush an HTTP 200 skeleton to crawlers.
  const actor = await requireStaffPageAal2(['CONTENT_REVIEWER', 'ADMIN']);
  if (actor.role !== 'ADMIN' && actor.role !== 'CONTENT_REVIEWER') notFound();
  return children;
}
