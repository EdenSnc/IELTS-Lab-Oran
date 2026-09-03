import { apiError, noStoreJson } from '@/lib/http/api';
import { processChargilyWebhook, recordPaymentWebhookFailure } from '@/lib/payments/payment-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let rawBody = '';
  try {
    rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 128_000) {
      return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    }
    const result = await processChargilyWebhook(rawBody, request.headers.get('signature'));
    return noStoreJson({ received: true, duplicate: result.duplicate });
  } catch (error) {
    try {
      await recordPaymentWebhookFailure(rawBody, error);
    } catch (loggingError) {
      console.error('PAYMENT_WEBHOOK_FAILURE_AUDIT_FAILED', {
        code: loggingError instanceof Error ? loggingError.message : 'UNKNOWN',
      });
    }
    return apiError(error, 'PAYMENT_WEBHOOK_FAILED');
  }
}
