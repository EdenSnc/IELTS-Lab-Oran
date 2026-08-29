# Payments runbook

## Runtime configuration

- `CHARGILY_MODE` must be `test` or `live` and must match incoming webhook `livemode`.
- `CHARGILY_SECRET_KEY` is server-only and signs/verifies Chargily Pay V2 traffic.
- `PAYMENT_CALLBACK_BASE_URL` is the public application origin. Production is `https://www.ieltslab.org`.

Never expose these values to browser code. Configure the Chargily webhook to `POST /api/payments/webhooks/chargily` and preserve the exact request body and `signature` header.

`Product.priceMinor` and all local order/payment amounts are stored in minor
units. Chargily Pay V2 checkout amounts are whole DZD, so the provider adapter
converts once at the boundary and rejects prices that are not whole dinars.

## Current mock-test product

Run `npm run commerce:provision` after the committed database migrations are
applied. It idempotently provisions the published Academic full-test blueprint
and the `academic-mock-test-1` product: 3,900 DZD, one attempt, and 30 days of
test/result access. If more than one eligible published Academic TestVersion
exists, pass `-- --test-version-id=<uuid>` rather than guessing.

## Operational invariants

Checkout creation commits the local `Order` and `PaymentAttempt` before calling Chargily. The client supplies only a product code and locale; price, currency, identity, ownership, and entitlement are server-derived. A caller-generated `Idempotency-Key` is scoped to the authenticated user.

Webhook processing verifies the raw body before parsing. It validates environment, checkout identity, metadata, amount, and currency, then atomically records the unique `PaymentEvent`, marks payment/order paid, and creates at most one entitlement per order. Duplicate delivery is a successful no-op. An ambiguous checkout creation must be reconciled from the provider dashboard/webhook; do not grant an entitlement or create a second payment automatically.

## Recovery

1. Look up the local order through `GET /api/payments/orders/{orderId}` as its owner.
2. Compare the stored provider checkout identifier, amount, currency, and mode with Chargily.
3. If a valid paid webhook was not delivered, use Chargily's webhook retry facility. Do not edit payment rows manually.
4. A payment with an ambiguous `failureCode` remains non-entitling until authoritative provider confirmation arrives.

Before enabling live mode, complete a low-value live checkout and confirm exactly one `PaymentEvent` and one `Entitlement` are created after duplicate webhook delivery.
