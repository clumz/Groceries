import { getRecipeIndex, embedText } from "./pinecone";
import type { UserPreferences } from "@/types";

interface PreferenceEvolution {
  favoriteCuisines: string[];
  reducedCuisines: string[];
}

export async function getSemanticRecipeIds(
  preferences: UserPreferences,
  evolution: PreferenceEvolution,
  topK = 30,
  excludeIds: string[] = []
): Promise<string[]> {
  const query = [
    preferences.cuisinePreferences.length
      ? `${preferences.cuisinePreferences.join(", ")} cuisine`
      : "",
    preferences.proteinPreferences.length
      ? preferences.proteinPreferences.join(", ")
      : "",
    evolution.favoriteCuisines.length
      ? `I love ${evolution.favoriteCuisines.join(" and ")}`
      : "",
    evolution.reducedCuisines.length
      ? `avoid ${evolution.reducedCuisines.join(" and ")}`
      : "",
  ]
    .filter(Boolean)
    .join(". ");

  if (!query) return [];

  const queryVector = await embedText(query);
  const index = getRecipeIndex();

  const filter: Record<string, unknown> = {};
  if (preferences.cuisinePreferences.length) {
    filter["cuisine"] = { $in: preferences.cuisinePreferences };
  }

  const results = await index.namespace(process.env.PINECONE_NAMESPACE ?? "prod").query({
    vector: queryVector,
    topK: topK + excludeIds.length,
    filter: Object.keys(filter).length ? filter : undefined,
    includeMetadata: true,
  });

  return results.matches
    .map((m) => m.id)
    .filter((id) => !excludeIds.includes(id))
    .slice(0, topK);
}
