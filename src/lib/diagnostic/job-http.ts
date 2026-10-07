import 'server-only';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/request-user';
import { qstashEndpoint, verifyQStashRequest } from '@/lib/qstash/verification';

export async function readDiagnosticJob<T>(request: Request, path: '/api/internal/diagnostic/writing' | '/api/internal/diagnostic/recover', schema: z.ZodType<T>): Promise<T> {
  if (!request.body) throw new AuthError('INVALID_REQUEST',400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new AuthError('INVALID_REQUEST',400); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  let rawBody: string;
  try { rawBody = new TextDecoder('utf-8',{ fatal: true }).decode(bytes); }
  catch { throw new AuthError('INVALID_REQUEST',400); }
  if (!await verifyQStashRequest({ rawBody, signature: request.headers.get('upstash-signature'), endpoint: qstashEndpoint(path),
    upstashRegion: request.headers.get('upstash-region') })) throw new AuthError('INVALID_QSTASH_SIGNATURE',403);
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { throw new AuthError('INVALID_REQUEST',400); }
  return schema.parse(body);
}
