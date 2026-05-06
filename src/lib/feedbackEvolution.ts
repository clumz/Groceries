import type { FeedbackHistory, PreferenceEvolution } from "@/types";

const REDUCE_THRESHOLD = 2;
const BOOST_THRESHOLD = 2;

const DAY_MS = 86_400_000;

function computeRecencyWeight(timestamp: number): number {
  const ageDays = (Date.now() - timestamp) / DAY_MS;
  if (ageDays <= 14) return 2.0;
  if (ageDays <= 60) return 1.0;
  return 0.5;
}

// Weight for each feedback type: swapped = soft negative (0.5), thumbs-down/never-show = full negative (1.0)
function negativeWeight(feedback: string): number {
  if (feedback === "swapped") return 0.5;
  return 1.0;
}

export function computePreferenceEvolution(history: FeedbackHistory): PreferenceEvolution {
  const proteinDownScore: Record<string, number> = {};
  const cuisineDownScore: Record<string, number> = {};
  const proteinUpScore: Record<string, number> = {};
  const cuisineUpScore: Record<string, number> = {};

  for (const item of history.items) {
    const recency = computeRecencyWeight(item.timestamp);

    if (item.feedback === "thumbs-down" || item.feedback === "never-show" || item.feedback === "swapped") {
      const w = recency * negativeWeight(item.feedback);
      if (item.primaryProtein) {
        proteinDownScore[item.primaryProtein] = (proteinDownScore[item.primaryProtein] ?? 0) + w;
      }
      if (item.cuisineType) {
        cuisineDownScore[item.cuisineType] = (cuisineDownScore[item.cuisineType] ?? 0) + w;
      }
    }

    if (item.feedback === "thumbs-up") {
      if (item.primaryProtein) {
        proteinUpScore[item.primaryProtein] = (proteinUpScore[item.primaryProtein] ?? 0) + recency;
      }
      if (item.cuisineType) {
        cuisineUpScore[item.cuisineType] = (cuisineUpScore[item.cuisineType] ?? 0) + recency;
      }
    }
  }

  return {
    reducedProteins: Object.entries(proteinDownScore)
      .filter(([, score]) => score >= REDUCE_THRESHOLD)
      .map(([protein]) => protein),
    reducedCuisines: Object.entries(cuisineDownScore)
      .filter(([, score]) => score >= REDUCE_THRESHOLD)
      .map(([cuisine]) => cuisine),
    favoriteCuisines: Object.entries(cuisineUpScore)
      .filter(([, score]) => score >= BOOST_THRESHOLD)
      .map(([cuisine]) => cuisine),
    favoriteProteins: Object.entries(proteinUpScore)
      .filter(([, score]) => score >= BOOST_THRESHOLD)
      .map(([protein]) => protein),
  };
}

export function buildFeedbackContext(
  history: FeedbackHistory,
  evolution: PreferenceEvolution
): string {
  const lines: string[] = [];

  const neverShow = history.items
    .filter((i) => i.feedback === "never-show")
    .map((i) => i.recipeName);
  if (neverShow.length > 0) {
    lines.push(`EXCLUDED — never suggest these recipes: ${neverShow.join(", ")}.`);
  }

  const softAvoid = history.items
    .filter((i) => i.feedback === "thumbs-down" || i.feedback === "swapped")
    .slice(-10)
    .map((i) => i.recipeName);
  if (softAvoid.length > 0) {
    lines.push(`SOFT AVOID — user disliked or swapped out: ${softAvoid.join(", ")}. Do not repeat these; avoid very similar dishes.`);
  }

  const recentLikes = history.items
    .filter((i) => i.feedback === "thumbs-up")
    .slice(-5)
    .map((i) => i.recipeName);
  if (recentLikes.length > 0) {
    lines.push(`RECENT FAVOURITES — suggest dishes similar to: ${recentLikes.join(", ")}.`);
  }

  if (evolution.reducedCuisines.length > 0) {
    lines.push(`REDUCED CUISINES — minimise or avoid: ${evolution.reducedCuisines.join(", ")}.`);
  }

  if (evolution.reducedProteins.length > 0) {
    lines.push(`REDUCED PROTEINS — minimise or avoid: ${evolution.reducedProteins.join(", ")}.`);
  }

  if (evolution.favoriteCuisines.length > 0) {
    lines.push(`FAVOURITE CUISINES — PRIORITISE heavily: ${evolution.favoriteCuisines.join(", ")}.`);
  }

  if (evolution.favoriteProteins.length > 0) {
    lines.push(`FAVOURITE PROTEINS — PRIORITISE heavily: ${evolution.favoriteProteins.join(", ")}.`);
  }

  return lines.join("\n");
}
