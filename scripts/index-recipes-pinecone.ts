import { config } from "dotenv";
config({ path: ".env.local" });

// Must import after env is loaded
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { getRecipeIndex, embedText, recipeToText } = await import("../src/lib/pinecone");

  console.log("Fetching recipes from DB...");
  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      cuisine: true,
      primaryProtein: true,
      difficulty: true,
      tags: true,
      cookTimeMinutes: true,
      estimatedCost: true,
    },
  });
  console.log(`Found ${recipes.length} recipes. Starting indexing...`);

  const index = getRecipeIndex();
  const BATCH = 50;

  for (let i = 0; i < recipes.length; i += BATCH) {
    const batch = recipes.slice(i, i + BATCH);
    const vectors = await Promise.all(
      batch.map(async (r) => ({
        id: r.id,
        values: await embedText(recipeToText(r)),
        metadata: {
          cuisine: r.cuisine,
          primaryProtein: r.primaryProtein ?? "",
          difficulty: r.difficulty,
          tags: r.tags,
          cookTimeMinutes: r.cookTimeMinutes,
          estimatedCost: r.estimatedCost ?? 0,
        },
      }))
    );

    await index.namespace(process.env.PINECONE_NAMESPACE ?? "prod").upsert({ records: vectors });
    console.log(`Indexed ${Math.min(i + BATCH, recipes.length)}/${recipes.length}`);
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
