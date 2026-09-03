import { ACADEMIC_MOCK_TEST_PRODUCT } from './catalog';

type CatalogProductRow = {
  code: string;
  tier: string;
  name: string;
  priceMinor: number;
  currency: string;
  accessDays: number | null;
  maximumAttempts: number | null;
  active: boolean;
};

export function assertCatalogProductMatches(product: CatalogProductRow) {
  const expected = ACADEMIC_MOCK_TEST_PRODUCT;
  const matches = product.code === expected.code
    && product.tier === expected.tier
    && product.name === expected.name
    && product.priceMinor === expected.priceMinor
    && product.currency === expected.currency
    && product.accessDays === expected.accessDays
    && product.maximumAttempts === expected.maximumAttempts
    && product.active
    && product.priceMinor % 100 === 0;
  if (!matches) throw new Error('PRODUCT_CATALOG_DATABASE_MISMATCH');
}
