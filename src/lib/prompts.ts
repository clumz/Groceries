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

  return `You are an expert meal planner for Australian households. Generate personalised weekly meal plans that are realistic, varied, and delicious.

USER PREFERENCES:
- Household size: ${preferences.householdSize} people, default servings: ${preferences.defaultServings}
- Dietary requirements: ${dietaryStr}
- Cuisine preferences: ${cuisinesStr}
- Protein preferences: ${proteinsStr}
- Weekly grocery budget: ${budgetMap[preferences.budgetRange] ?? "flexible"}
- Cooking time preference: ${cookTimeMap[preferences.cookTimePreference] ?? "flexible"}
- Preferred supermarket: ${preferences.preferredStore === "woolworths" ? "Woolworths" : "Coles"}
- Include lunches: ${preferences.includeLunches ? "yes" : "no"}
- Include snacks section: ${preferences.includeSnacks ? "yes" : "no"}

${feedbackContext ? `LEARNING FROM FEEDBACK:\n${feedbackContext}\n` : ""}

INSTRUCTIONS:
1. Generate exactly 7 dinners (one per day, Monday–Sunday)
${preferences.includeLunches ? "2. Generate 5 lunches (Monday–Friday)" : ""}
${preferences.includeSnacks ? "3. Generate 5–8 snack items suitable for the household" : ""}
- Vary cuisines across the week — avoid repeating the same cuisine on consecutive days
- Respect ALL dietary requirements strictly — this is critical
- Keep ingredients practical and available at Australian supermarkets
- Aim for a balance of simple weeknight meals and one or two more special weekend meals
- Include recipe methods as clear numbered steps
- Each recipe ingredient must be specific enough to match a supermarket product (e.g. "chicken breast fillets" not "chicken")
- Ingredient quantities should be per the recipe's stated servings count
- For pantry staples like salt, pepper, oil — include them in ingredients

RESPONSE FORMAT:
Respond with a valid JSON object matching this TypeScript type:
{
  meals: Array<{
    dayIndex: number;          // 0=Monday, 1=Tuesday ... 6=Sunday
    mealType: "dinner" | "lunch";
    recipe: {
      id: string;              // unique slug e.g. "spaghetti-bolognese"
      name: string;
      description: string;     // 1–2 sentences
      cuisine: string;         // e.g. "italian"
      primaryProtein: string;  // e.g. "beef"
      servings: number;
      cookTimeMinutes: number;
      prepTimeMinutes: number;
      difficulty: "easy" | "medium" | "hard";
      ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        notes?: string;
      }>;
      method: string[];        // numbered cooking steps
      tags: string[];          // e.g. ["quick", "family-friendly"]
      imageQuery: string;      // descriptive search query for a food photo
    };
  }>;
  snacks: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedCost: number;
  }>;
}

Respond ONLY with the JSON object, no markdown fences, no commentary.`;
}

export function buildIngredientMappingPrompt(
  ingredientNames: string[],
  retailer: "woolworths" | "coles"
): string {
  return `You are a grocery product matcher for Australian supermarkets. Map these recipe ingredients to the most suitable ${retailer} product.

Ingredients to match:
${ingredientNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}

For each ingredient, identify:
1. The most appropriate product name that would be found at ${retailer}
2. Confidence score 0–1 (1 = perfect match, 0 = no match)
3. Whether the ingredient might be unavailable

Respond with a JSON array:
[
  { "ingredientName": "...", "suggestedProductName": "...", "confidence": 0.9, "notes": "..." }
]

Respond ONLY with the JSON array.`;
}
