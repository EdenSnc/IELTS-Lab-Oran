import { noStoreJson } from '@/lib/http/api';
import { reconcilePaymentOperations } from '@/lib/payments/payment-service';
import {
  paymentReconciliationJobSchema,
  qstashEndpoint,
  verifyQStashRequest,
} from '@/lib/qstash/verification';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 1_024) return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  const verified = await verifyQStashRequest({
    rawBody,
    signature: request.headers.get('upstash-signature'),
    endpoint: qstashEndpoint('/api/internal/payments/reconcile'),
    upstashRegion: request.headers.get('upstash-region'),
  });
  if (!verified) return noStoreJson({ error: 'INVALID_QSTASH_SIGNATURE' }, 403);
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return noStoreJson({ error: 'INVALID_JOB' }, 400); }
  if (!paymentReconciliationJobSchema.safeParse(body).success) return noStoreJson({ error: 'INVALID_JOB' }, 400);
  return noStoreJson(await reconcilePaymentOperations());
}
