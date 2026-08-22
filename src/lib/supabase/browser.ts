'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabasePublicConfig } from './config';

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const config = requireSupabasePublicConfig();
  browserClient ??= createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
