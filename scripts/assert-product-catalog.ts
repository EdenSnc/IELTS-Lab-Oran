import 'dotenv/config';

import prisma from '../src/lib/prisma';
import { assertCatalogProductMatches } from '../src/lib/commerce/catalog-check';
import { ACADEMIC_MOCK_TEST_PRODUCT } from '../src/lib/commerce/catalog';

async function main() {
  const product = await prisma.product.findUnique({
    where: { code: ACADEMIC_MOCK_TEST_PRODUCT.code },
    select: {
      code: true,
      tier: true,
      name: true,
      priceMinor: true,
      currency: true,
      accessDays: true,
      maximumAttempts: true,
      active: true,
    },
  });
  if (!product) throw new Error('PRODUCT_CATALOG_DATABASE_ROW_MISSING');
  assertCatalogProductMatches(product);
  console.log(`Product catalog matches database row ${product.code}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'PRODUCT_CATALOG_DATABASE_MISMATCH');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
