import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';

const withNextIntl = createNextIntlPlugin();

function rtcConnectSources() {
  const value = process.env.LIVEKIT_URL;
  if (!value) return [];
  try {
    const { hostname, port } = new URL(value);
    const host = port ? `${hostname}:${port}` : hostname;
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return [];
  }
}

const speakingRtcSources = rtcConnectSources();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://tally.so https://www.tally.so",
  "script-src 'self' 'unsafe-inline' https://tally.so https://*.tally.so https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tally.so https://images.unsplash.com https://img.youtube.com",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "frame-src https://tally.so https://www.tally.so",
  `connect-src 'self' https://*.tally.so https://vitals.vercel-insights.com https://*.vercel-insights.com ${speakingRtcSources.join(' ')}`.trim(),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    globalNotFound: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-1497215728101-856f4ea42174',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/r5eiUU3EpHE/maxresdefault.jpg',
      },
    ],
  },
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.100.6',
    '192.168.56.1',
  ],
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), geolocation=(), microphone=(self), payment=(self)',
      },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push(
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      );
    }

    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withBotId(withNextIntl(nextConfig));
