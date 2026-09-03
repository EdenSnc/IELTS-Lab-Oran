# Payments runbook

## Runtime configuration

- `CHARGILY_MODE` must be `test` or `live` and must match incoming webhook `livemode`.
- `CHARGILY_SECRET_KEY` is server-only and signs/verifies Chargily Pay V2 traffic.
- `PAYMENT_CALLBACK_BASE_URL` is the public application origin. Production is `https://www.ieltslab.org`.
- `CHECKOUT_ENABLED=false` disables new checkout creation without changing existing orders.
- `ATTEMPTS_ENABLED=false` disables new attempt creation without changing saved work or results.

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

An attempt deadline is fixed at creation to the earlier of the manifest time limit and entitlement end. Submission and writing-grading enqueue both require an active entitlement window. An unstarted DRAFT may be released after 30 minutes with `npm run attempts:release-stale`; release is idempotent and restores its reserved attempt.

Checkout creation commits the local `Order` and `PaymentAttempt` before calling Chargily. The client supplies only a product code and locale; price, currency, identity, ownership, and entitlement are server-derived. A caller-generated `Idempotency-Key` is scoped to the authenticated user.

Webhook processing verifies the raw body before parsing. It validates environment, checkout identity, metadata, amount, and currency, then atomically records the unique `PaymentEvent`, marks payment/order paid, and creates at most one entitlement per order. Duplicate delivery is a successful no-op. After an ambiguous checkout creation, a matching signed webhook may atomically bind the missing provider checkout ID and complete the existing payment; never create a second payment automatically.

## Recovery

1. Look up the local order through `GET /api/payments/orders/{orderId}` as its owner.
2. Compare the stored provider checkout identifier, amount, currency, and mode with Chargily.
3. If a valid paid webhook was not delivered, use Chargily's webhook retry facility. Do not edit payment rows manually.
4. A payment with an ambiguous `failureCode` remains non-entitling until authoritative provider confirmation arrives.

Before enabling live mode, complete a low-value live checkout and confirm exactly one `PaymentEvent` and one `Entitlement` are created after duplicate webhook delivery.

Refunds mark the order and payment `REFUNDED`. Unused access is revoked; access is retained when an attempt reached ACTIVE, while inconsistent histories receive `REFUND_REVIEW_REQUIRED` for staff review. Configure a QStash schedule every 15 minutes to POST `{"version":1,"type":"RECONCILE_PAYMENTS"}` to `/api/internal/payments/reconcile`; it expires local PENDING orders after 60 minutes and reports ambiguous PROCESSING payments without a provider checkout ID.
