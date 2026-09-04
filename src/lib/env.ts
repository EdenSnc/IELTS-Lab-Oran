import { z } from 'zod';

const localSupabaseHosts = new Set(['127.0.0.1', 'localhost']);

const supabaseUrlSchema = z.url().superRefine((value, context) => {
  const url = new URL(value);
  const remote = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  const local = url.protocol === 'http:' && localSupabaseHosts.has(url.hostname);
  if (!remote && !local) {
    context.addIssue({ code: 'custom', message: 'NEXT_PUBLIC_SUPABASE_URL must be a Supabase project URL' });
  }
});

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(10),
}).passthrough();

export const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20).optional(),
}).passthrough();

export function parsePublicEnvironment(source: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return publicEnvironmentSchema.parse(source);
}

export function readPublicEnvironment() {
  return parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function parseServerEnvironment(source: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return serverEnvironmentSchema.parse(source);
}
