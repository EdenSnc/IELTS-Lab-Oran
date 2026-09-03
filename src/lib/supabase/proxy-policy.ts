export type ProxyResponseKind = 'next' | 'redirect' | 'rewrite';

export function shouldRefreshSupabaseSession(pathname: string, responseKind: ProxyResponseKind) {
  return responseKind === 'next' && !pathname.startsWith('/api/');
}
