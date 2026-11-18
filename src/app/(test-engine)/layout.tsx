import { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { CANONICAL_ORIGIN } from '@/lib/seo';
import '../globals.css';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-face',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo-face',
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'IELTS Mock Test',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: [`${CANONICAL_ORIGIN}/opengraph-image.png`],
  },
  twitter: {
    images: [`${CANONICAL_ORIGIN}/twitter-image.png`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default async function TestEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bind to per-request headers so Next.js injects the middleware CSP nonce
  // onto inline RSC and chunk scripts under enforced 'strict-dynamic' CSP.
  await headers();
  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>

      </head>
      <body 
        suppressHydrationWarning
        className="min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#ffffff] text-[#1a1a1a] antialiased flex flex-col"
        style={{ fontFamily: '"Helvetica Neue Regular", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
