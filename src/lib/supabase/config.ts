import { parsePublicEnvironment } from '@/lib/env';

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

const environment = parsePublicEnvironment(process.env);
const config = {
  url: environment.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} satisfies SupabasePublicConfig;

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return config;
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  return config;
}
