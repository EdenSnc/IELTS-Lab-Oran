import { apiError, noStoreJson } from '@/lib/http/api';
import { processChargilyWebhook } from '@/lib/payments/payment-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 128_000) {
      return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    }
    const result = await processChargilyWebhook(rawBody, request.headers.get('signature'));
    return noStoreJson({ received: true, duplicate: result.duplicate });
  } catch (error) {
    return apiError(error, 'PAYMENT_WEBHOOK_FAILED');
  }
}
