import { CANONICAL_ORIGIN } from '@/lib/seo';

/** Never derive a printed QR destination from an untrusted Host header. */
export function publicAcquisitionOrigin() {
  const configured = process.env.ACQUISITION_PUBLIC_ORIGIN;
  let origin: string = CANONICAL_ORIGIN;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
      throw new Error('INVALID_ACQUISITION_PUBLIC_ORIGIN');
    }
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('INVALID_ACQUISITION_PUBLIC_ORIGIN');
    }
    origin = url.origin;
  }
  return origin;
}

export function publicAcquisitionLink(code: string) {
  return `${publicAcquisitionOrigin()}/r/${encodeURIComponent(code)}`;
}
