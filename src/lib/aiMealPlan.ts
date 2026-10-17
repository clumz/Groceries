import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type {
  WeeklyMealPlan,
  PlannedMeal,
  UserPreferences,
  Recipe,
  FeedbackHistory,
  PreferenceEvolution,
} from "@/types";
import { generateMealPlan, getCandidatePool } from "@/lib/mealPlanAlgorithm";
import { buildMealPlanSystemPrompt } from "@/lib/prompts";

const MODEL = "claude-opus-5-5";

const PlanSelection = z.object({
  meals: z.array(
    z.object({
      dayIndex: z.number(),
      mealType: z.enum(["dinner", "lunch"]),
      recipeId: z.string(),
    })
  ),
});

function catalogueLine(r: Recipe): string {
  const minutes = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
  const cost = r.estimatedCost != null ? `A$${r.estimatedCost}` : "cost n/a";
  return [r.id, r.name, r.cuisine, r.primaryProtein ?? "none", `${minutes} min`, r.difficulty, cost, r.tags.join(",")].join(" | ");
}

/**
 * Premium plan: Claude picks this week's recipes from the user's eligible
 * library. Picks are checked against that library, and any slot Claude leaves
 * empty or fills with an unknown/duplicate id falls back to the deterministic
 * algorithm's pick, so the result is always a complete, saveable plan.
 */
export async function generateAiMealPlan(
  preferences: UserPreferences,
  feedbackHistory: FeedbackHistory,
  evolution: PreferenceEvolution
): Promise<WeeklyMealPlan> {
  const basePlan = generateMealPlan(preferences, feedbackHistory, evolution);
  const pool = getCandidatePool(preferences, feedbackHistory);
  const byId = new Map(pool.map((r) => [r.id, r]));

  // Keep well inside the route's maxDuration; the caller falls back on error.
  const client = new Anthropic({ timeout: 50_000, maxRetries: 1 });
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PlanSelection) },
    system: buildMealPlanSystemPrompt(preferences, feedbackHistory, evolution),
    messages: [
      {
        role: "user",
        content:
          "Recipe library — one per line: id | name | cuisine | protein | total time | difficulty | estimated cost | tags\n\n" +
          pool.map(catalogueLine).join("\n") +
          "\n\nPick this week's meals.",
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Meal plan request was declined");
  if (!response.parsed_output) throw new Error(`No parseable plan (stop_reason: ${response.stop_reason})`);

  const picks = new Map<string, Recipe>();
  for (const m of response.parsed_output.meals) {
    const recipe = byId.get(m.recipeId);
    if (recipe) picks.set(`${m.mealType}:${m.dayIndex}`, recipe);
  }

  const used = new Set<string>();
  const meals: PlannedMeal[] = [];
  for (const fallback of basePlan.meals) {
    const key = `${fallback.mealType}:${fallback.dayIndex}`;
    const recipe = [picks.get(key), fallback.recipe, ...pool].find((r) => r && !used.has(r.id));
    if (!recipe) continue;
    used.add(recipe.id);
    meals.push({ ...fallback, recipe: { ...recipe, servings: preferences.defaultServings } });
  }

  return { ...basePlan, meals };
}
