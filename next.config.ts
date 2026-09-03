import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';
import { parsePublicEnvironment } from './src/lib/env';

const withNextIntl = createNextIntlPlugin();

export function rtcConnectSources() {
  const value = process.env.LIVEKIT_URL;
  if (!value) return [];
  const url = new URL(value);
  if (!['https:', 'wss:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('LIVEKIT_URL_INVALID');
  }
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return [`https://${host}`, `wss://${host}`];
}

parsePublicEnvironment(process.env);
rtcConnectSources();

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
