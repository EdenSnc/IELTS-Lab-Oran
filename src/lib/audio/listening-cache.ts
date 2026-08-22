export function listeningAssetCacheHeaders(strict: boolean): Record<string, string> {
  return strict
    ? { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Pragma: 'no-cache', Expires: '0' }
    : { 'Cache-Control': 'private, max-age=86400, immutable' };
}
