import { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/seo';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'IELTS Mock Test',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function TestEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The result screen deliberately uses the public site's Inter typeface. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
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
