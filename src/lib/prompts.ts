import type { UserPreferences, FeedbackHistory, PreferenceEvolution } from "@/types";
import { buildFeedbackContext } from "./feedbackEvolution";

export function buildMealPlanSystemPrompt(
  preferences: UserPreferences,
  feedbackHistory: FeedbackHistory,
  evolution: PreferenceEvolution
): string {
  const feedbackContext = buildFeedbackContext(feedbackHistory, evolution);
  const dietaryStr = preferences.dietaryRequirements.length > 0
    ? preferences.dietaryRequirements.join(", ")
    : "none";
  const cuisinesStr = preferences.cuisinePreferences.length > 0
    ? preferences.cuisinePreferences.join(", ")
    : "varied";
  const proteinsStr = preferences.proteinPreferences.length > 0
    ? preferences.proteinPreferences.join(", ")
    : "varied";

  const budgetMap: Record<string, string> = {
    "under-150": "under A$150/week",
    "150-250": "A$150–250/week",
    "250-350": "A$250–350/week",
    "350-plus": "A$350+/week",
  };
  const cookTimeMap: Record<string, string> = {
    "under-20": "under 20 minutes",
    "20-40": "20–40 minutes",
    "40-plus": "40+ minutes is fine",
  };

  const nutritionStr = preferences.calorieGoal
    ? `- Daily calorie target: ${preferences.calorieGoal} kcal per person${
        preferences.macroGoal
          ? ` (${preferences.macroGoal.proteinPct}% protein · ${preferences.macroGoal.carbsPct}% carbs · ${preferences.macroGoal.fatPct}% fat)`
          : ""
      }`
    : null;

  return `You are an expert meal planner for Australian households. You build a realistic, varied, delicious week of meals by choosing recipes from the household's recipe library, which is provided in the user message. You only choose recipes — you never invent new ones.

USER PREFERENCES:
- Household size: ${preferences.householdSize} people, default servings: ${preferences.defaultServings}
- Dietary requirements: ${dietaryStr}
- Cuisine preferences: ${cuisinesStr}
- Protein preferences: ${proteinsStr}
- Weekly grocery budget: ${budgetMap[preferences.budgetRange] ?? "flexible"}
- Cooking time preference: ${cookTimeMap[preferences.cookTimePreference] ?? "flexible"}${nutritionStr ? `\n${nutritionStr}` : ""}

${feedbackContext ? `LEARNING FROM FEEDBACK:\n${feedbackContext}\n` : ""}
WHAT TO PICK:
- Exactly 7 dinners, one for each dayIndex 0 (Monday) to 6 (Sunday).
${preferences.includeLunches ? "- Exactly 5 lunches, one for each dayIndex 0 (Monday) to 4 (Friday). Favour quick dishes that also work as leftovers or packed lunches." : "- No lunches."}
- Use each recipe id at most once across the whole week, and copy ids exactly as listed.

HOW TO CHOOSE:
- The library has already been filtered for this household's dietary requirements, so focus on fit and balance. Dietary requirements still win over every other consideration.
- Lean towards the preferred cuisines and proteins, and away from anything the feedback says they disliked.
- Avoid the same cuisine or the same protein on consecutive days, so the week feels varied.
- Keep Monday to Thursday quick and easy; Saturday and Sunday can be more involved.
- Keep the total cost of the week (estimated cost per recipe is listed) within the weekly budget, leaving room for breakfasts and staples.
${preferences.calorieGoal ? `- Prefer recipes that make the ${preferences.calorieGoal} kcal/day target achievable.` : ""}`;
}
