import type { MetadataRoute } from 'next';
import { ALLOW_MODEL_TRAINING_BOTS, CANONICAL_ORIGIN } from '@/lib/seo';

// Note: /staff/ is intentionally omitted here so search crawlers can read
// its explicit X-Robots-Tag / <meta name="robots" content="noindex, nofollow"> directive.
const PUBLIC_DISALLOW = ['/api/', '/sim/', '/speaking/', '/r/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Search discovery & AI answer engines (ChatGPT Search, Perplexity, Claude, Apple, Meta, Amazon)
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'Claude-SearchBot',
          'Claude-User',
          'Applebot-Extended',
          'Meta-ExternalAgent',
          'Amazonbot',
        ],
        allow: '/',
        disallow: PUBLIC_DISALLOW,
      },
      {
        // Model training crawlers controlled independently from search discovery
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'],
        ...(ALLOW_MODEL_TRAINING_BOTS
          ? { allow: '/', disallow: PUBLIC_DISALLOW }
          : { disallow: '/' }),
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: PUBLIC_DISALLOW,
      },
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
