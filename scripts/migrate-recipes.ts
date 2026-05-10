/**
 * One-shot migration: imports all recipes from src/data/recipes.json into Postgres.
 * Run with: npx tsx scripts/migrate-recipes.ts
 * Safe to re-run (upserts).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import recipesData from "../src/data/recipes.json";

const prisma = new PrismaClient();

interface RawRecipe {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  primaryProtein?: string;
  servings: number;
  cookTimeMinutes: number;
  prepTimeMinutes: number;
  difficulty: string;
  ingredients: unknown;
  method: string[];
  tags: string[];
  imageQuery: string;
  estimatedCost?: number;
}

async function main() {
  const recipes = recipesData as RawRecipe[];
  console.log(`Migrating ${recipes.length} recipes...`);

  let count = 0;
  for (const r of recipes) {
    await prisma.recipe.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        description: r.description,
        cuisine: r.cuisine,
        primaryProtein: r.primaryProtein ?? null,
        servings: r.servings,
        cookTimeMinutes: r.cookTimeMinutes,
        prepTimeMinutes: r.prepTimeMinutes,
        difficulty: r.difficulty,
        ingredients: r.ingredients as object,
        method: r.method,
        tags: r.tags,
        imageQuery: r.imageQuery,
        estimatedCost: r.estimatedCost ?? null,
        isActive: true,
      },
      create: {
        id: r.id,
        name: r.name,
        description: r.description,
        cuisine: r.cuisine,
        primaryProtein: r.primaryProtein ?? null,
        servings: r.servings,
        cookTimeMinutes: r.cookTimeMinutes,
        prepTimeMinutes: r.prepTimeMinutes,
        difficulty: r.difficulty,
        ingredients: r.ingredients as object,
        method: r.method,
        tags: r.tags,
        imageQuery: r.imageQuery,
        estimatedCost: r.estimatedCost ?? null,
        isActive: true,
      },
    });
    count++;
    if (count % 50 === 0) console.log(`  ${count}/${recipes.length}`);
  }

  console.log(`\n✅ Migrated ${count} recipes.`);

  // Enable pg_trgm and full-text search trigger
  console.log("Setting up full-text search trigger...");
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS search_vector tsvector
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE recipes SET search_vector =
      setweight(to_tsvector('english', name), 'A') ||
      setweight(to_tsvector('english', array_to_string(tags, ' ')), 'B') ||
      setweight(to_tsvector('english', cuisine), 'C')
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS recipes_fts_idx ON recipes USING GIN(search_vector)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION recipes_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', NEW.name), 'A') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'B') ||
        setweight(to_tsvector('english', NEW.cuisine), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS recipes_search_vector_trigger ON recipes;
    CREATE TRIGGER recipes_search_vector_trigger
    BEFORE INSERT OR UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION recipes_search_vector_update()
  `);
  console.log("✅ Full-text search configured.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
