import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lifecycleSources = new Map([
  ['PRODUCT_VIEWED', 'src/components/MockTestOffer.tsx'],
  ['SIGNUP_STARTED', 'src/app/api/auth/password/route.ts'],
  ['ONBOARDING_COMPLETED', 'src/app/api/account/onboarding/route.ts'],
  ['CHECKOUT_CREATED', 'src/lib/payments/payment-service.ts'],
  ['ENTITLEMENT_GRANTED', 'src/lib/payments/payment-service.ts'],
  ['ATTEMPT_STARTED', 'src/lib/attempts/execution-lease.ts'],
  ['ATTEMPT_SUBMITTED', 'src/lib/attempts/objective-attempt-grading.ts'],
  ['RESULT_VIEWED', 'src/app/api/attempts/[attemptId]/results/route.ts'],
]);

test('every required funnel lifecycle transition is wired server-side', () => {
  for (const [event, path] of lifecycleSources) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, new RegExp(`type:\\s*['\"]${event}['\"]`, 'u'), `${event} must be emitted by ${path}`);
    assert.doesNotMatch(source, /^['"]use client['"];?/mu, `${path} must remain server-side`);
  }
});

test('OAuth sign-in is not counted as signup started', () => {
  const route = readFileSync('src/app/api/auth/oauth/route.ts', 'utf8');
  assert.match(route, /input\.intent === ['"]sign-up['"]/u);
});
