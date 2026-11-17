import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACQUISITION_REDIRECT_HEADERS,
  actionSchema,
  codeSchema,
  destinationForPlacement,
  EXTERNAL_DESTINATIONS,
  isFirstPartyDestination,
} from '../../src/lib/acquisition/validation';
import { publicAcquisitionLink, publicAcquisitionOrigin } from '../../src/lib/acquisition/public-link';

test('placement destinations stay on a localized first-party path with bounded attribution and fragment order', () => {
  assert.equal(
    destinationForPlacement('/fr/waitlist', 'oran-posters', 'poster', 'abcDEF1234'),
    '/fr/waitlist?utm_source=ieltslab&utm_medium=poster&utm_campaign=oran-posters&utm_content=abcDEF1234',
  );
  assert.equal(
    destinationForPlacement('/fr#intake', 'oran-posters', 'poster', 'abcDEF1234'),
    '/fr?utm_source=ieltslab&utm_medium=poster&utm_campaign=oran-posters&utm_content=abcDEF1234#intake',
  );
  assert.equal(
    destinationForPlacement('/ar/articles/first-ielts-preparation-cohort-oran', 'oran-posters', 'poster', 'abcDEF1234'),
    '/ar/articles/first-ielts-preparation-cohort-oran?utm_source=ieltslab&utm_medium=poster&utm_campaign=oran-posters&utm_content=abcDEF1234',
  );
  assert.equal(actionSchema.safeParse({
    action: 'placement',
    campaignId: crypto.randomUUID(),
    label: 'Library',
    medium: 'poster',
    destination: 'https://evil.example',
  }).success, false);
  assert.equal(actionSchema.safeParse({
    action: 'update_placement',
    placementId: crypto.randomUUID(),
    destination: '/fr/waitlist',
    active: true,
  }).success, true);
  assert.equal(actionSchema.safeParse({ action: 'campaign', name: 'Oran', slug: 'oran', unexpected: true }).success, false);
  assert.equal(codeSchema.safeParse('../admin').success, false);
});

test('every destination uses a finite allowlist and external links do not gain campaign parameters', () => {
  for (const locale of ['en', 'fr', 'ar']) {
    for (const suffix of ['', '#intake', '/waitlist', '/articles/first-ielts-preparation-cohort-oran']) {
      const path = `/${locale}${suffix}`;
      assert.equal(isFirstPartyDestination(path), true);
      const resolved = destinationForPlacement(path, 'oran', 'poster', 'abcDEF1234');
      assert.ok(resolved.includes('utm_content=abcDEF1234'));
      if (suffix === '#intake') {
        assert.ok(resolved.indexOf('?utm_source=') < resolved.indexOf('#intake'));
      }
    }
  }
  for (const [symbol, url] of Object.entries(EXTERNAL_DESTINATIONS)) {
    assert.equal(isFirstPartyDestination(symbol), false);
    assert.equal(destinationForPlacement(symbol, 'oran', 'social', 'abcDEF1234'), url);
    assert.equal(new URL(url).protocol, 'https:');
  }
  for (const candidate of ['https://www.instagram.com/ieltslab.oran/', '//evil.example', '/en/../admin', 'javascript:alert(1)', 'instagram?next=https://evil.example']) {
    assert.equal(actionSchema.safeParse({
      action: 'placement',
      campaignId: crypto.randomUUID(),
      label: 'Library',
      medium: 'poster',
      destination: candidate,
    }).success, false);
    assert.throws(() => destinationForPlacement(candidate, 'oran', 'poster', 'abcDEF1234'));
  }
  assert.equal(ACQUISITION_REDIRECT_HEADERS['Referrer-Policy'], 'no-referrer');
  assert.equal(ACQUISITION_REDIRECT_HEADERS['Cache-Control'], 'no-store');
});

test('printed QR targets use a fixed or explicitly configured origin', () => {
  const previous = process.env.ACQUISITION_PUBLIC_ORIGIN;
  try {
    delete process.env.ACQUISITION_PUBLIC_ORIGIN;
    assert.equal(publicAcquisitionLink('abcDEF1234'), 'https://www.ieltslab.org/r/abcDEF1234');
    process.env.ACQUISITION_PUBLIC_ORIGIN = 'https://preview.example';
    assert.equal(publicAcquisitionLink('abcDEF1234'), 'https://preview.example/r/abcDEF1234');
    assert.equal(new URL('/fr?utm_source=ieltslab', publicAcquisitionOrigin()).href, 'https://preview.example/fr?utm_source=ieltslab');
    process.env.ACQUISITION_PUBLIC_ORIGIN = 'https://preview.example/path';
    assert.throws(() => publicAcquisitionLink('abcDEF1234'));
  } finally {
    if (previous === undefined) delete process.env.ACQUISITION_PUBLIC_ORIGIN;
    else process.env.ACQUISITION_PUBLIC_ORIGIN = previous;
  }
});
