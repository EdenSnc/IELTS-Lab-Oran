import Link from 'next/link';

export default function AdminNav({ locale, active }: { locale: string; active: 'overview' | 'applications' | 'posters' }) {
  const items = [
    { id: 'overview', href: `/${locale}/admin`, text: 'Overview' },
    { id: 'applications', href: `/${locale}/admin/applications`, text: 'Applications' },
    { id: 'posters', href: `/${locale}/admin/acquisition`, text: 'Posters & tracking' },
  ];
  return (
    <nav aria-label="Administration" className="flex flex-wrap gap-2">
      {items.map(({ id, href, text }) => (
        <Link key={id} href={href} aria-current={active === id ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${active === id ? 'bg-charcoal text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-crimson'}`}>
          {text}
        </Link>
      ))}
    </nav>
  );
}
