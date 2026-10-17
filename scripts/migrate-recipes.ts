/**
 * One-shot migration: imports all recipes from src/data/recipes.json into Postgres.
 * Run with: npx tsx scripts/migrate-recipes.ts
 * Safe to re-run (upserts).
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import recipesData from "../src/data/recipes.json";


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
  // Search vectors/indexes are maintained by triggers from the migrations.
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
