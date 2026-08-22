import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-face',
});

export const metadata: Metadata = {
  title: '404 - Page Not Found | IELTS Lab Oran',
  description: 'The page you requested could not be found.',
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <main className="min-h-screen bg-surface text-charcoal flex flex-col items-center justify-center p-6 text-center antialiased">
          <div className="max-w-md w-full bg-white rounded-4xl p-8 md:p-12 shadow-soft border border-gray-100 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-crimson/10 text-crimson flex items-center justify-center font-black text-2xl">
              404
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">
              Page Not Found
            </h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              The page you are looking for does not exist or has been moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2">
              <Link
                href="/en"
                className="bg-crimson text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-red-800 transition-all shadow-glow hover:shadow-xl text-center"
              >
                English Homepage
              </Link>
              <Link
                href="/fr"
                className="bg-surface text-charcoal px-8 py-4 rounded-full font-bold text-sm hover:bg-gray-200 transition-all text-center"
              >
                Accueil (FR)
              </Link>
              <Link
                href="/ar"
                className="bg-surface text-charcoal px-8 py-4 rounded-full font-bold text-sm hover:bg-gray-200 transition-all text-center"
              >
                الرئيسية (AR)
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
