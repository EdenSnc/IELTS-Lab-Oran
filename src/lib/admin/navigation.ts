export type AdminRole = 'ADMIN' | 'CONTENT_REVIEWER';
export const ADMIN_PATH_HEADER = 'x-ielts-admin-path';

const sections = [
  { id: 'overview', segment: '', label: 'Overview' },
  { id: 'applications', segment: '/applications', label: 'Applications' },
  { id: 'posters', segment: '/acquisition', label: 'Posters' },
  { id: 'operations', segment: '/operations', label: 'Payments & access' },
  { id: 'speaking', segment: '/speaking', label: 'Speaking' },
] as const;

export function adminNavigation(locale: string, role: AdminRole) {
  return sections.filter(() => role === 'ADMIN')
    .map((section) => ({ ...section, href: `/${locale}/admin${section.segment}` }));
}

export function activeAdminSection(path: string, locale: string) {
  const base = `/${locale}/admin`;
  const normalized = path.replace(/\/$/, '');
  if (normalized === base) return 'overview';
  return sections.find(({ segment }) => segment && (
    normalized === base + segment || normalized.startsWith(`${base}${segment}/`)
  ))?.id;
}

export function adminReturnPath(value: unknown, locale?: string): string | undefined {
  if (typeof value !== 'string' || value.length > 500 || /[\\#\u0000-\u0020]/.test(value)) return;
  const [pathname, query = ''] = value.split('?', 2);
  const match = /^\/(en|fr|ar)\/admin(?:\/(?:applications|operations|speaking|acquisition(?:\/poster\/[A-Za-z0-9_-]{10,24})?))?$/.exec(pathname);
  if (!match || (locale && match[1] !== locale)) return;

  const safe = new URLSearchParams();
  if (pathname.endsWith('/applications')) {
    const incoming = new URLSearchParams(query);
    const code = incoming.get('placement');
    const page = incoming.get('page');
    const view = incoming.get('view');
    if (code && /^[A-Za-z0-9_-]{10,24}$/.test(code)) safe.set('placement', code);
    if (page && /^[1-9]\d{0,3}$/.test(page)) safe.set('page', page);
    if (view === 'archived') safe.set('view', view);
  }
  return safe.size ? `${pathname}?${safe.toString()}` : pathname;
}
