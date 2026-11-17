/** Extend existing auth navigation only for the new diagnostic. Never accept an external destination. */
export function diagnosticAuthReturn(value: unknown, locale: string): string | undefined {
  if (!['en', 'fr', 'ar'].includes(locale) || typeof value !== 'string' || value.length > 2048 || /[\\\u0000-\u001f\u007f]/u.test(value)) return;
  const prefix = `/${locale}/diagnostic`;
  if (value !== prefix && !value.startsWith(`${prefix}/`) && !value.startsWith(`${prefix}?`)) return;
  const url = new URL(value, 'https://www.ieltslab.org');
  if (url.origin !== 'https://www.ieltslab.org' || (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`))) return;
  return url.pathname + url.search;
}
