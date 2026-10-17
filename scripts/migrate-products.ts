/**
 * One-shot migration: imports all products from the static TS catalogues into Postgres.
 * Run with: npx tsx scripts/migrate-products.ts
 * Safe to re-run (upserts).
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Dynamic imports to avoid TypeScript path alias issues in scripts/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { woolworthsCatalogue } = require("../src/data/woolworths");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { colesCatalogue } = require("../src/data/coles");


interface RawProduct {
  id: string;
  retailer: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  unit: string;
  unitSize: number;
  unitOfMeasure: string;
  available: boolean;
  imageUrl?: string;
  barcode?: string;
}

async function main() {
  const all: RawProduct[] = [...woolworthsCatalogue, ...colesCatalogue];
  console.log(`Migrating ${all.length} products (${woolworthsCatalogue.length} Woolworths + ${colesCatalogue.length} Coles)...`);

  let count = 0;
  for (const p of all) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        retailer: p.retailer,
        name: p.name,
        brand: p.brand ?? null,
        category: p.category,
        price: p.price,
        unit: p.unit,
        unitSize: p.unitSize,
        unitOfMeasure: p.unitOfMeasure,
        available: p.available,
        imageUrl: p.imageUrl ?? null,
        barcode: p.barcode ?? null,
        lastVerified: new Date(),
      },
      create: {
        id: p.id,
        retailer: p.retailer,
        name: p.name,
        brand: p.brand ?? null,
        category: p.category,
        price: p.price,
        unit: p.unit,
        unitSize: p.unitSize,
        unitOfMeasure: p.unitOfMeasure,
        available: p.available,
        imageUrl: p.imageUrl ?? null,
        barcode: p.barcode ?? null,
      },
    });
    count++;
    if (count % 50 === 0) console.log(`  ${count}/${all.length}`);
  }
  console.log(`\n✅ Migrated ${count} products.`);
  // Search vectors/indexes are maintained by triggers from the migrations.
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
