import { z } from 'zod';

export const codeSchema = z.string().regex(/^[A-Za-z0-9_-]{10,24}$/);
export const campaignSlugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
export const AVAILABILITY_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdoYPQ9YyWY_-DmG0wEeAEzyOS8HFMwy655zWqLXX9fgYRtVg/viewform' as const;
export const EXTERNAL_DESTINATIONS = {
  instagram: 'https://www.instagram.com/ieltslab.oran/',
  facebook: 'https://www.facebook.com/profile.php?id=61591282143384',
  'availability-form': AVAILABILITY_FORM_URL,
} as const;

export const INTERNAL_DESTINATIONS = [
  '/en',
  '/fr',
  '/ar',
  '/en#intake',
  '/fr#intake',
  '/ar#intake',
  '/en/articles/first-ielts-preparation-cohort-oran',
  '/fr/articles/first-ielts-preparation-cohort-oran',
  '/ar/articles/first-ielts-preparation-cohort-oran',
  '/en/waitlist',
  '/fr/waitlist',
  '/ar/waitlist',
] as const;

export const internalDestinationSchema = z.string().regex(
  /^\/(en|fr|ar)(?:\/waitlist|\/articles\/first-ielts-preparation-cohort-oran)?(?:#intake)?$/,
);
export const destinationSchema = z.union([
  internalDestinationSchema,
  z.enum(['instagram', 'facebook', 'availability-form']),
]);
export const ACQUISITION_REDIRECT_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
} as const;

export const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('campaign'),
    name: z.string().trim().min(2).max(120),
    slug: campaignSlugSchema,
  }).strict(),
  z.object({
    action: z.literal('placement'),
    campaignId: z.string().uuid(),
    label: z.string().trim().min(2).max(120),
    medium: z.enum(['poster', 'flyer', 'card', 'partner', 'social']),
    destination: destinationSchema,
  }).strict(),
  z.object({
    action: z.literal('update_placement'),
    placementId: z.string().uuid(),
    destination: destinationSchema,
    active: z.boolean().optional(),
  }).strict(),
  z.object({
    action: z.literal('inspection'),
    placementId: z.string().uuid(),
    status: z.enum(['present', 'missing', 'damaged', 'unknown']),
    note: z.string().trim().max(300).optional(),
  }).strict(),
]);

export function destinationForPlacement(destination: string, campaign: string, medium: string, code: string) {
  const safe = destinationSchema.parse(destination);
  if (safe in EXTERNAL_DESTINATIONS) {
    return EXTERNAL_DESTINATIONS[safe as keyof typeof EXTERNAL_DESTINATIONS];
  }
  const query = new URLSearchParams({
    utm_source: 'ieltslab',
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: code,
  });
  const hashIndex = safe.indexOf('#');
  if (hashIndex !== -1) {
    const basePath = safe.slice(0, hashIndex);
    const fragment = safe.slice(hashIndex);
    return `${basePath}?${query}${fragment}`;
  }
  return `${safe}?${query}`;
}

export function isFirstPartyDestination(destination: string) {
  return internalDestinationSchema.safeParse(destination).success;
}

export function isKnownCrawler(userAgent: string) {
  return /bot|crawler|spider|preview|headless|lighthouse|curl|wget|facebookexternalhit|whatsapp|telegram|discord|slack|python|go-http-client|undici|axios|node-fetch/i.test(userAgent);
}

export function isPrefetchRequest(headers: Headers) {
  const purpose = `${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''} ${headers.get('x-moz') ?? ''}`;
  if (/prefetch|preview|prerender/i.test(purpose)) return true;
  return headers.has('next-router-prefetch');
}
