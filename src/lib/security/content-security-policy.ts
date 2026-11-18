export function buildContentSecurityPolicy(input: {
  nonce: string;
  development: boolean;
  supabaseOrigin: string;
  rtcSources: string[];
  strictDynamic?: boolean;
}) {
  const scriptDevelopment = input.development ? " 'unsafe-eval'" : '';
  const strictDynamic = input.strictDynamic === false
    ? ''
    : ` 'nonce-${input.nonce}' 'strict-dynamic'`;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // Chargily is a top-level redirect and does not require a CSP origin.
    "form-action 'self'",
    `script-src 'self'${strictDynamic}${scriptDevelopment} https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://img.youtube.com",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "frame-src https://www.youtube-nocookie.com",
    `connect-src 'self' ${input.supabaseOrigin} https://vitals.vercel-insights.com https://*.vercel-insights.com ${input.rtcSources.join(' ')}`.trim(),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (!input.development) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
