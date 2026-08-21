'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function LocaleNotFound() {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const copy = {
    en: {
      title: 'Page Not Found',
      desc: 'The page you are looking for does not exist or has been moved.',
      home: 'Return to Homepage',
    },
    fr: {
      title: 'Page non trouvée',
      desc: 'La page que vous recherchez n’existe pas ou a été déplacée.',
      home: 'Retour à l’accueil',
    },
    ar: {
      title: 'الصفحة غير موجودة',
      desc: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
      home: 'العودة إلى الصفحة الرئيسية',
    },
  }[locale as 'en' | 'fr' | 'ar'] ?? {
    title: 'Page Not Found',
    desc: 'The page you are looking for does not exist or has been moved.',
    home: 'Return to Homepage',
  };

  return (
    <main className={`min-h-[70vh] flex flex-col items-center justify-center p-6 text-center ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-4xl p-8 md:p-12 shadow-soft border border-gray-100 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-crimson/10 text-crimson flex items-center justify-center font-black text-2xl">
          404
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">
          {copy.title}
        </h1>
        <p className="text-gray-500 font-medium leading-relaxed">
          {copy.desc}
        </p>
        <Link
          href="/"
          className="bg-crimson text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-red-800 transition-all shadow-glow hover:shadow-xl mt-2 inline-block"
        >
          {copy.home}
        </Link>
      </div>
    </main>
  );
}
