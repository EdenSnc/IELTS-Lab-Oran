import type { Metadata } from 'next';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  robots: { index: false, follow: false },
  twitter: null,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
