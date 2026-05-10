/**
 * One-shot migration: imports all products from the static TS catalogues into Postgres.
 * Run with: npx tsx scripts/migrate-products.ts
 * Safe to re-run (upserts).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Dynamic imports to avoid TypeScript path alias issues in scripts/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { woolworthsCatalogue } = require("../src/data/woolworths");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { colesCatalogue } = require("../src/data/coles");

const prisma = new PrismaClient();

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

  // Set up trigram-based product search
  console.log("Setting up product trigram search...");
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE products SET search_vector =
      to_tsvector('english',
        name || ' ' ||
        COALESCE(brand, '') || ' ' ||
        category
      )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS products_fts_idx ON products USING GIN(search_vector)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING GIN(name gin_trgm_ops)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        to_tsvector('english',
          NEW.name || ' ' ||
          COALESCE(NEW.brand, '') || ' ' ||
          NEW.category
        );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
    CREATE TRIGGER products_search_vector_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_update()
  `);
  console.log("✅ Product trigram search configured.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
