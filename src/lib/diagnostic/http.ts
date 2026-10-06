import 'server-only';
import { z, ZodError } from 'zod';
import { AuthError } from '@/lib/auth/request-user';
import { assertSameOrigin as assertExistingSameOrigin, noStoreJson } from '@/lib/http/api';
import { logSafeError } from '@/lib/observability/safe-log';
import { DiagnosticError } from './protocol';

export const diagnosticIdSchema = z.string().uuid();
export const invitationBodySchema = z.object({ recipientId: diagnosticIdSchema, blueprintId: diagnosticIdSchema }).strict();
export const revocationBodySchema = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();
export const startBodySchema = z.object({ invitationId: diagnosticIdSchema, preflightConfirmed: z.literal(true) }).strict();
export const writerBodySchema = z.object({ previousToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/u).optional() }).strict();
export const responseBodySchema = z.object({
  questionId: diagnosticIdSchema, expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  answer: z.string().max(20000), markedForReview: z.boolean(),
}).strict();
export const submitBodySchema = z.object({}).strict();

/** Preserve the common fetch-site policy and compare full origins even when a
 * direct Request has no Host header. A different scheme is not same-origin. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new AuthError('INVALID_REQUEST', 400); }
    const incoming = new URL(request.url);
    // Next may normalize request.url to localhost behind its local server/proxy.
    // Match the browser-facing authority; retain scheme checking and the no-Host fallback.
    const authority = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (authority) incoming.host = authority;
    if (parsed.origin !== incoming.origin) throw new AuthError('CROSS_SITE_REQUEST_REJECTED', 403);
  }
  assertExistingSameOrigin(request);
}

/** Bound the actual streamed bytes, not just attacker-controlled Content-Length. */
export async function parseDiagnosticBody<T>(request: Request, schema: z.ZodType<T>, options: { maxBytes?: number; allowEmpty?: boolean } = {}): Promise<T> {
  const maxBytes = options.maxBytes ?? 10000;
  if (!request.body) {
    if (options.allowEmpty) return schema.parse({});
    throw new AuthError('INVALID_REQUEST', 400);
  }
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('content-type') ?? '')) throw new AuthError('INVALID_REQUEST', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AuthError('INVALID_REQUEST', 400); }
      chunks.push(value);
    }
    if (size === 0 && options.allowEmpty) return schema.parse({});
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return schema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch (error) {
    if (error instanceof ZodError || error instanceof AuthError) throw error;
    throw new AuthError('INVALID_REQUEST', 400);
  } finally { reader.releaseLock(); }
}

/** IDs only in context; never log raw request bodies or source/manifest data. */
export function diagnosticApiError(error: unknown, context: { sessionId?: string; invitationId?: string; assetId?: string } = {}) {
  if (error instanceof AuthError || error instanceof DiagnosticError) return noStoreJson({ error: error.code }, error.status);
  if (error instanceof ZodError) return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
  logSafeError('DIAGNOSTIC_REQUEST_FAILED', error, context);
  return noStoreJson({ error: 'DIAGNOSTIC_REQUEST_FAILED' }, 500);
}
