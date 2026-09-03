export const PUBLIC_API_ROUTES = {
  '/api/auth/callback': 'Supabase OAuth and email callback validates the authorization code.',
  '/api/auth/logout': 'Session logout accepts an existing cookie and enforces same-origin POST.',
  '/api/auth/oauth': 'OAuth initiation is same-origin and BotID protected.',
  '/api/auth/password': 'Password authentication is same-origin and BotID protected.',
  '/api/grade': 'Public-demo objective grading validates BotID and public content server-side.',
  '/api/grade/writing': 'Public-demo writing grading validates BotID and public content server-side.',
  '/api/internal/grading/recover': 'QStash consumer verifies the signed raw request body.',
  '/api/internal/grading/writing': 'QStash consumer verifies the signed raw request body.',
  '/api/internal/payments/reconcile': 'QStash consumer verifies the signed raw request body.',
  '/api/leads': 'Public intake validates BotID or the Tally webhook signature.',
  '/api/payments/webhooks/chargily': 'Chargily webhook verifies the signed raw request body.',
  '/api/speaking/webhooks/livekit': 'LiveKit webhook verifies the provider authorization signature.',
  '/api/test-assets/[assetId]': 'Public-demo assets are explicitly linked; private assets require attempt ownership.',
} as const;

export type PublicApiRoute = keyof typeof PUBLIC_API_ROUTES;
