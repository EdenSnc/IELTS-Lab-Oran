import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'IELTS Lab · Diagnostic', robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} }, openGraph: null, twitter: null,
};
export default function DiagnosticLayout({ children }: { children: React.ReactNode }) { return children; }
