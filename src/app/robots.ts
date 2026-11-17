import type { MetadataRoute } from 'next';
import { ALLOW_MODEL_TRAINING_BOTS, CANONICAL_ORIGIN } from '@/lib/seo';

const PUBLIC_DISALLOW = ['/api/', '/sim/', '/speaking/', '/staff/', '/r/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Search discovery & AI answer engines (ChatGPT Search, Perplexity, Claude)
        userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User'],
        allow: '/',
        disallow: PUBLIC_DISALLOW,
      },
      {
        // Model training crawlers controlled independently from search discovery
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended'],
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
