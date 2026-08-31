import { z } from 'zod';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { createCheckoutForProduct } from '@/lib/payments/payment-service';

const checkoutRequestSchema = z.object({
  productCode: z.string().min(1).max(80),
  locale: z.enum(['ar', 'en', 'fr']).default('en'),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) return noStoreJson({ error: 'IDEMPOTENCY_KEY_REQUIRED' }, 400);
    const input = checkoutRequestSchema.parse(await request.json());
    const checkout = await createCheckoutForProduct({
      userId: user.id,
      idempotencyKey,
      ...input,
    });
    return noStoreJson({
      orderId: checkout.orderId,
      paymentAttemptId: checkout.paymentAttemptId,
      checkoutUrl: checkout.checkoutUrl,
    }, 201);
  } catch (error) {
    return apiError(error, 'CHECKOUT_CREATION_FAILED');
  }
}
