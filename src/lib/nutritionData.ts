import type { RecipeIngredient } from "@/types";

// Nutrition per 100g (or per unit for count-based items like eggs)
// Values: calories (kcal), protein (g), carbs (g), fat (g)
const NUTRITION_PER_100G: Record<string, { cal: number; protein: number; carbs: number; fat: number }> = {
  // Proteins
  "chicken breast":       { cal: 165, protein: 31, carbs: 0,    fat: 3.6 },
  "chicken thigh":        { cal: 209, protein: 26, carbs: 0,    fat: 11  },
  "chicken":              { cal: 185, protein: 28, carbs: 0,    fat: 8   },
  "beef mince":           { cal: 250, protein: 26, carbs: 0,    fat: 17  },
  "beef":                 { cal: 217, protein: 26, carbs: 0,    fat: 12  },
  "steak":                { cal: 271, protein: 26, carbs: 0,    fat: 18  },
  "lamb":                 { cal: 258, protein: 25, carbs: 0,    fat: 17  },
  "pork":                 { cal: 242, protein: 27, carbs: 0,    fat: 14  },
  "bacon":                { cal: 417, protein: 12, carbs: 1,    fat: 42  },
  "salmon":               { cal: 208, protein: 20, carbs: 0,    fat: 13  },
  "tuna":                 { cal: 132, protein: 28, carbs: 0,    fat: 1   },
  "prawns":               { cal: 99,  protein: 20, carbs: 1,    fat: 1.7 },
  "shrimp":               { cal: 99,  protein: 20, carbs: 1,    fat: 1.7 },
  "fish":                 { cal: 136, protein: 20, carbs: 0,    fat: 6   },
  "tofu":                 { cal: 76,  protein: 8,  carbs: 2,    fat: 4.5 },
  // Dairy
  "greek yogurt":         { cal: 59,  protein: 10, carbs: 3.6,  fat: 0.4 },
  "yogurt":               { cal: 61,  protein: 3.5,carbs: 7,    fat: 3.3 },
  "cream":                { cal: 340, protein: 2.1,carbs: 2.8,  fat: 36  },
  "coconut cream":        { cal: 330, protein: 3,  carbs: 6,    fat: 34  },
  "coconut milk":         { cal: 197, protein: 2,  carbs: 6,    fat: 21  },
  "cheese":               { cal: 400, protein: 25, carbs: 1.3,  fat: 33  },
  "feta":                 { cal: 264, protein: 14, carbs: 4,    fat: 21  },
  "butter":               { cal: 717, protein: 0.9,carbs: 0.1,  fat: 81  },
  // Carbs & grains
  "rice":                 { cal: 130, protein: 2.7,carbs: 28,   fat: 0.3 },
  "pasta":                { cal: 158, protein: 5.8,carbs: 31,   fat: 0.9 },
  "spaghetti":            { cal: 158, protein: 5.8,carbs: 31,   fat: 0.9 },
  "noodles":              { cal: 138, protein: 4.5,carbs: 26,   fat: 2   },
  "bread":                { cal: 265, protein: 9,  carbs: 49,   fat: 3.2 },
  "flour":                { cal: 364, protein: 10, carbs: 76,   fat: 1   },
  "oats":                 { cal: 389, protein: 17, carbs: 66,   fat: 7   },
  "lentils":              { cal: 116, protein: 9,  carbs: 20,   fat: 0.4 },
  "chickpeas":            { cal: 164, protein: 9,  carbs: 27,   fat: 2.6 },
  // Vegetables
  "onion":                { cal: 40,  protein: 1.1,carbs: 9,    fat: 0.1 },
  "garlic":               { cal: 149, protein: 6,  carbs: 33,   fat: 0.5 },
  "tomato":               { cal: 18,  protein: 0.9,carbs: 3.9,  fat: 0.2 },
  "potato":               { cal: 77,  protein: 2,  carbs: 17,   fat: 0.1 },
  "broccoli":             { cal: 34,  protein: 2.8,carbs: 7,    fat: 0.4 },
  "spinach":              { cal: 23,  protein: 2.9,carbs: 3.6,  fat: 0.4 },
  "capsicum":             { cal: 31,  protein: 1,  carbs: 7.2,  fat: 0.3 },
  "zucchini":             { cal: 17,  protein: 1.2,carbs: 3.1,  fat: 0.3 },
  "carrot":               { cal: 41,  protein: 0.9,carbs: 10,   fat: 0.2 },
  "mushroom":             { cal: 22,  protein: 3.1,carbs: 3.3,  fat: 0.3 },
  "eggplant":             { cal: 25,  protein: 1,  carbs: 6,    fat: 0.2 },
  "beans":                { cal: 127, protein: 9,  carbs: 23,   fat: 0.5 },
  "peas":                 { cal: 81,  protein: 5,  carbs: 14,   fat: 0.4 },
  "corn":                 { cal: 86,  protein: 3.2,carbs: 19,   fat: 1.2 },
  "celery":               { cal: 16,  protein: 0.7,carbs: 3,    fat: 0.2 },
  // Oils & fats
  "olive oil":            { cal: 884, protein: 0,  carbs: 0,    fat: 100 },
  "oil":                  { cal: 884, protein: 0,  carbs: 0,    fat: 100 },
  // Sauces & condiments
  "soy sauce":            { cal: 60,  protein: 10, carbs: 5.6,  fat: 0.1 },
  "tomato paste":         { cal: 82,  protein: 4.3,carbs: 19,   fat: 0.4 },
  "canned tomatoes":      { cal: 32,  protein: 1.5,carbs: 7,    fat: 0.3 },
};

// For items sold by count (not weight)
const NUTRITION_PER_UNIT: Record<string, { cal: number; protein: number; carbs: number; fat: number }> = {
  "egg":   { cal: 78,  protein: 6,  carbs: 0.6, fat: 5   },
  "eggs":  { cal: 78,  protein: 6,  carbs: 0.6, fat: 5   },
  "lime":  { cal: 20,  protein: 0.5,carbs: 7,   fat: 0.1 },
  "lemon": { cal: 29,  protein: 1.1,carbs: 9,   fat: 0.3 },
};

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1, kg: 1000,
  ml: 1, L: 1000,
  cup: 240, tbsp: 15, tsp: 5,
  clove: 3, bunch: 80, head: 200,
  slice: 25, fillet: 150, portion: 150,
  can: 400, each: 100, unit: 100,
};

function normalizeForLookup(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|dried|frozen|canned|tinned|boneless|skinless|minced|diced|sliced|chopped|large|small|medium|ripe|whole|raw|cooked|lean|extra)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lookupNutrition(name: string) {
  const n = normalizeForLookup(name);
  // Exact match
  if (NUTRITION_PER_100G[n]) return { data: NUTRITION_PER_100G[n], perUnit: false };
  if (NUTRITION_PER_UNIT[n]) return { data: NUTRITION_PER_UNIT[n], perUnit: true };
  // Partial match (first token)
  for (const [key, val] of Object.entries(NUTRITION_PER_100G)) {
    if (n.includes(key) || key.includes(n)) return { data: val, perUnit: false };
  }
  for (const [key, val] of Object.entries(NUTRITION_PER_UNIT)) {
    if (n.includes(key) || key.includes(n)) return { data: val, perUnit: true };
  }
  return null;
}

export interface NutritionEstimate {
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function estimateRecipeNutrition(
  ingredients: RecipeIngredient[],
  servings: number
): NutritionEstimate {
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const ing of ingredients) {
    const match = lookupNutrition(ing.name);
    if (!match) continue;

    const { data, perUnit } = match;
    let grams: number;

    if (perUnit) {
      grams = ing.quantity; // treat quantity as unit count
    } else {
      const unitGrams = UNIT_TO_GRAMS[ing.unit.toLowerCase()] ?? 100;
      grams = ing.quantity * unitGrams;
    }

    const factor = perUnit ? 1 : grams / 100;
    totalCal     += data.cal     * factor;
    totalProtein += data.protein * factor;
    totalCarbs   += data.carbs   * factor;
    totalFat     += data.fat     * factor;
  }

  const s = Math.max(1, servings);
  return {
    caloriesPerServing: Math.round(totalCal / s),
    proteinG:           Math.round(totalProtein / s),
    carbsG:             Math.round(totalCarbs / s),
    fatG:               Math.round(totalFat / s),
  };
}
