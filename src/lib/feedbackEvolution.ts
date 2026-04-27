import type { FeedbackHistory, PreferenceEvolution, UserPreferences } from "@/types";

const REDUCE_THRESHOLD = 3;
const BOOST_THRESHOLD = 3;

export function computePreferenceEvolution(history: FeedbackHistory): PreferenceEvolution {
  const proteinDownCount: Record<string, number> = {};
  const cuisineDownCount: Record<string, number> = {};
  const proteinUpCount: Record<string, number> = {};
  const cuisineUpCount: Record<string, number> = {};

  for (const item of history.items) {
    if (item.feedback === "thumbs-down" || item.feedback === "never-show") {
      if (item.primaryProtein) {
        proteinDownCount[item.primaryProtein] = (proteinDownCount[item.primaryProtein] ?? 0) + 1;
      }
      if (item.cuisineType) {
        cuisineDownCount[item.cuisineType] = (cuisineDownCount[item.cuisineType] ?? 0) + 1;
      }
    }
    if (item.feedback === "thumbs-up") {
      if (item.primaryProtein) {
        proteinUpCount[item.primaryProtein] = (proteinUpCount[item.primaryProtein] ?? 0) + 1;
      }
      if (item.cuisineType) {
        cuisineUpCount[item.cuisineType] = (cuisineUpCount[item.cuisineType] ?? 0) + 1;
      }
    }
  }

  return {
    reducedProteins: Object.entries(proteinDownCount)
      .filter(([, count]) => count >= REDUCE_THRESHOLD)
      .map(([protein]) => protein),
    reducedCuisines: Object.entries(cuisineDownCount)
      .filter(([, count]) => count >= REDUCE_THRESHOLD)
      .map(([cuisine]) => cuisine),
    favoriteCuisines: Object.entries(cuisineUpCount)
      .filter(([, count]) => count >= BOOST_THRESHOLD)
      .map(([cuisine]) => cuisine),
    favoriteProteins: Object.entries(proteinUpCount)
      .filter(([, count]) => count >= BOOST_THRESHOLD)
      .map(([protein]) => protein),
  };
}

export function buildFeedbackContext(
  history: FeedbackHistory,
  evolution: PreferenceEvolution
): string {
  const lines: string[] = [];

  const neverShow = history.items.filter((i) => i.feedback === "never-show").map((i) => i.recipeName);
  if (neverShow.length > 0) {
    lines.push(`NEVER suggest these recipes again: ${neverShow.join(", ")}.`);
  }

  const dislikedRecipes = history.items
    .filter((i) => i.feedback === "thumbs-down")
    .slice(-10)
    .map((i) => i.recipeName);
  if (dislikedRecipes.length > 0) {
    lines.push(`The user disliked these recently: ${dislikedRecipes.join(", ")}. Avoid similar dishes.`);
  }

  const likedRecipes = history.items
    .filter((i) => i.feedback === "thumbs-up")
    .slice(-10)
    .map((i) => i.recipeName);
  if (likedRecipes.length > 0) {
    lines.push(`The user enjoyed these recently: ${likedRecipes.join(", ")}. Suggest similar dishes.`);
  }

  if (evolution.reducedProteins.length > 0) {
    lines.push(`Significantly reduce frequency of: ${evolution.reducedProteins.join(", ")} dishes.`);
  }

  if (evolution.reducedCuisines.length > 0) {
    lines.push(`Avoid or minimise these cuisines: ${evolution.reducedCuisines.join(", ")}.`);
  }

  if (evolution.favoriteCuisines.length > 0) {
    lines.push(`Prioritise these favourite cuisines: ${evolution.favoriteCuisines.join(", ")}.`);
  }

  if (evolution.favoriteProteins.length > 0) {
    lines.push(`The user loves dishes featuring: ${evolution.favoriteProteins.join(", ")}.`);
  }

  return lines.join("\n");
}
