import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  robots: { index: false, follow: false },
  twitter: null,
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
