import assert from 'node:assert/strict';
import test from 'node:test';
import { ACADEMIC_MOCK_TEST_PRODUCT } from '../../src/lib/commerce/catalog';
import { assertCatalogProductMatches } from '../../src/lib/commerce/catalog-check';

test('catalog seed values match the authoritative product row and whole-DZD boundary', () => {
  assert.doesNotThrow(() => assertCatalogProductMatches({
    ...ACADEMIC_MOCK_TEST_PRODUCT,
    active: true,
  }));
  assert.throws(() => assertCatalogProductMatches({
    ...ACADEMIC_MOCK_TEST_PRODUCT,
    priceMinor: ACADEMIC_MOCK_TEST_PRODUCT.priceMinor + 1,
    active: true,
  }), /PRODUCT_CATALOG_DATABASE_MISMATCH/u);
});
