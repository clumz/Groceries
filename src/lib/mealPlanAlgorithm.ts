import type {
  WeeklyMealPlan,
  PlannedMeal,
  UserPreferences,
  Recipe,
  CuisinePreference,
  FeedbackHistory,
  PreferenceEvolution,
} from "@/types";
import { filterSnacksByDiet } from "@/data/snacks";

// ─── PRNG utilities ────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// FNV-1a hash — stable seed derived from user preferences
function hashPreferences(p: UserPreferences): number {
  const str = [
    [...p.cuisinePreferences].sort().join(","),
    [...p.proteinPreferences].sort().join(","),
    [...p.dietaryRequirements].sort().join(","),
    p.budgetRange,
    p.cookTimePreference,
    String(p.defaultServings),
  ].join("|");
  let hash = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function budgetToCostCap(budgetRange: string): number {
  switch (budgetRange) {
    case "under-150": return 20;
    case "150-250": return 28;
    case "250-350": return 36;
    case "350-plus": return Infinity;
    default: return 28;
  }
}

// ─── Recipe library — loaded after MOCK_RECIPES is declared ───────────────────

let _bundledRecipes: Recipe[] | null = null;

function getRecipeLibrary(): Recipe[] {
  if (!_bundledRecipes) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require("../data/recipes.json") as Recipe[];
      _bundledRecipes = loaded.length > 0 ? loaded : MOCK_RECIPES;
    } catch {
      _bundledRecipes = MOCK_RECIPES;
    }
  }
  return _bundledRecipes;
}

// ─── Scoring ───────────────────────────────────────────────────────────────────

function scoreRecipe(
  recipe: Recipe,
  preferences: UserPreferences,
  feedbackHistory: FeedbackHistory | undefined,
  evolution: PreferenceEvolution | undefined,
  dayIndex: number,
  costCap: number,
  consecutiveCuisinePenalty = 0,
): number {
  let score = 0;

  if (preferences.cuisinePreferences.length > 0 && preferences.cuisinePreferences.includes(recipe.cuisine as CuisinePreference)) {
    score += 10;
  }
  if (
    preferences.proteinPreferences.length > 0 &&
    !preferences.proteinPreferences.includes("no-preference") &&
    recipe.primaryProtein &&
    preferences.proteinPreferences.includes(recipe.primaryProtein as never)
  ) {
    score += 10;
  }

  const totalTime = (recipe.cookTimeMinutes ?? 0) + (recipe.prepTimeMinutes ?? 0);
  const fits =
    (preferences.cookTimePreference === "under-20" && totalTime <= 20) ||
    (preferences.cookTimePreference === "20-40" && totalTime > 20 && totalTime <= 40) ||
    (preferences.cookTimePreference === "40-plus" && totalTime > 40);
  if (fits) score += 4;

  // Weekday vs weekend difficulty bonus
  if (dayIndex <= 3) {
    if (recipe.difficulty === "easy" || totalTime <= 40) score += 5;
  } else if (dayIndex >= 5) {
    if (recipe.difficulty === "hard" || recipe.tags.includes("dinner-party")) score += 3;
  }

  if (evolution) {
    if (recipe.cuisine && evolution.favoriteCuisines.includes(recipe.cuisine)) score += 6;
    if (recipe.primaryProtein && evolution.favoriteProteins.includes(recipe.primaryProtein)) score += 6;
    if (recipe.cuisine && evolution.reducedCuisines.includes(recipe.cuisine)) score -= 8;
    if (recipe.primaryProtein && evolution.reducedProteins.includes(recipe.primaryProtein)) score -= 8;
  }

  if (feedbackHistory) {
    for (const item of feedbackHistory.items) {
      if (item.recipeId !== recipe.id) continue;
      if (item.feedback === "thumbs-up") score += 4;
      else if (item.feedback === "thumbs-down") score -= 10;
      else if (item.feedback === "swapped") score -= 5;
    }
  }

  if (recipe.estimatedCost != null && recipe.estimatedCost > costCap) score -= 6;

  score += consecutiveCuisinePenalty;

  return score;
}

// ─── Main algorithm ────────────────────────────────────────────────────────────

export function generateMealPlan(
  preferences: UserPreferences,
  feedbackHistory?: FeedbackHistory,
  evolution?: PreferenceEvolution,
): WeeklyMealPlan {
  const planId = `plan-${Date.now()}`;
  const seed = Date.now();
  const costCap = budgetToCostCap(preferences.budgetRange);

  let pool = getRecipeLibrary();

  // Hard-exclude never-show recipes
  const neverShowIds = new Set(
    (feedbackHistory?.items ?? [])
      .filter((i) => i.feedback === "never-show")
      .map((i) => i.recipeId),
  );
  pool = pool.filter((r) => !neverShowIds.has(r.id));

  // Dietary hard constraints
  const diets = preferences.dietaryRequirements;
  if (diets.includes("vegan")) {
    const f = pool.filter((r) => r.tags.includes("vegan") || r.primaryProtein === "tofu");
    if (f.length >= 4) pool = f;
  } else if (diets.includes("vegetarian")) {
    const f = pool.filter((r) => r.tags.includes("vegan") || r.tags.includes("vegetarian") || r.primaryProtein === "tofu");
    if (f.length >= 4) pool = f;
  }
  if (diets.includes("gluten-free")) {
    const f = pool.filter((r) => r.tags.includes("gluten-free"));
    if (f.length >= 4) pool = f;
  }
  if (diets.includes("dairy-free")) {
    const f = pool.filter((r) => r.tags.includes("dairy-free"));
    if (f.length >= 4) pool = f;
  }
  if (diets.includes("pescatarian")) {
    const pescProteins = new Set(["seafood", "tofu", "eggs", null, undefined]);
    const f = pool.filter((r) => pescProteins.has(r.primaryProtein ?? null));
    if (f.length >= 4) pool = f;
  }

  // Cuisine soft filter
  if (preferences.cuisinePreferences.length > 0) {
    const f = pool.filter((r) => preferences.cuisinePreferences.includes(r.cuisine as CuisinePreference));
    if (f.length >= 4) pool = f;
  }

  // Protein soft filter
  if (preferences.proteinPreferences.length > 0 && !preferences.proteinPreferences.includes("no-preference")) {
    const f = pool.filter((r) => r.primaryProtein && preferences.proteinPreferences.includes(r.primaryProtein as never));
    if (f.length >= 4) pool = f;
  }

  // Seeded shuffle for variety between regenerations
  pool = seededShuffle(pool, seed);

  // ── Greedy dinner selection (Mon → Sun) ────────────────────────────────────
  const usedIds = new Set<string>();
  const dinners: PlannedMeal[] = [];
  let lastDinnerCuisine: string | null = null;

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const available = pool.filter((r) => !usedIds.has(r.id));
    if (available.length === 0) break;

    const reducedPenalty = available.length <= 10 ? -8 : -15;

    const best = available.reduce<{ recipe: Recipe; score: number } | null>((acc, recipe) => {
      const cuisinePenalty = recipe.cuisine === lastDinnerCuisine ? reducedPenalty : 0;
      const score = scoreRecipe(recipe, preferences, feedbackHistory, evolution, dayIndex, costCap, cuisinePenalty);
      return acc === null || score > acc.score ? { recipe, score } : acc;
    }, null);

    if (!best) break;
    usedIds.add(best.recipe.id);
    lastDinnerCuisine = best.recipe.cuisine;

    dinners.push({
      id: `meal-${planId}-${dayIndex}`,
      dayIndex,
      mealType: "dinner",
      recipe: { ...best.recipe, servings: preferences.defaultServings },
      servings: preferences.defaultServings,
    });
  }

  // ── Lunch selection (Mon–Fri only) ─────────────────────────────────────────
  const lunches: PlannedMeal[] = [];
  if (preferences.includeLunches) {
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const dinner = dinners.find((d) => d.dayIndex === dayIndex);
      const available = pool.filter((r) => !usedIds.has(r.id));
      if (available.length === 0) break;

      const best = available.reduce<{ recipe: Recipe; score: number } | null>((acc, recipe) => {
        const sameDayCuisinePenalty = recipe.cuisine === dinner?.recipe.cuisine ? -8 : 0;
        // Prefer quick lunches
        const quickBonus = recipe.tags.includes("quick") || (recipe.prepTimeMinutes + recipe.cookTimeMinutes) <= 30 ? 4 : 0;
        const score = scoreRecipe(recipe, preferences, feedbackHistory, evolution, dayIndex, costCap, sameDayCuisinePenalty) + quickBonus;
        return acc === null || score > acc.score ? { recipe, score } : acc;
      }, null);

      if (!best) break;
      usedIds.add(best.recipe.id);

      lunches.push({
        id: `lunch-${planId}-${dayIndex}`,
        dayIndex,
        mealType: "lunch",
        recipe: { ...best.recipe, id: `${best.recipe.id}-lunch`, name: `${best.recipe.name} (Lunch)`, servings: preferences.defaultServings },
        servings: preferences.defaultServings,
      });
    }
  }

  // ── Snack selection ────────────────────────────────────────────────────────
  const snackSeed = hashPreferences(preferences);
  const eligibleSnacks = filterSnacksByDiet(preferences.dietaryRequirements);
  const shuffledSnacks = seededShuffle(eligibleSnacks, snackSeed);
  const selectedSnacks = shuffledSnacks.slice(0, 6).map((s, i) => ({
    ...s,
    id: `snack-${planId}-${i}`,
  }));

  return {
    id: planId,
    generatedAt: Date.now(),
    meals: [...dinners, ...lunches],
    snacks: preferences.includeSnacks ? selectedSnacks : [],
    preferenceSnapshot: preferences,
  };
}

// ─── Inline mock recipes (fallback when recipes.json unavailable) ──────────────

export const MOCK_RECIPES: Recipe[] = [
  {
    id: "chicken-tikka-masala",
    name: "Chicken Tikka Masala",
    description: "A rich, creamy tomato-based curry with tender marinated chicken. A crowd-pleasing classic that feels special on a weeknight.",
    cuisine: "indian", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 35, prepTimeMinutes: 15, difficulty: "medium",
    ingredients: [
      { name: "chicken breast fillets", quantity: 800, unit: "g" },
      { name: "Greek yogurt", quantity: 200, unit: "g" },
      { name: "garam masala", quantity: 2, unit: "tsp" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
      { name: "turmeric", quantity: 1, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp" },
      { name: "brown onion", quantity: 1, unit: "each" },
      { name: "garlic", quantity: 4, unit: "clove" },
      { name: "fresh ginger", quantity: 30, unit: "g" },
      { name: "crushed tomatoes", quantity: 400, unit: "g" },
      { name: "thickened cream", quantity: 150, unit: "ml" },
      { name: "vegetable oil", quantity: 2, unit: "tbsp" },
      { name: "basmati rice", quantity: 300, unit: "g" },
      { name: "fresh coriander", quantity: 1, unit: "bunch" },
      { name: "sea salt", quantity: 1, unit: "tsp" },
    ],
    method: [
      "Cut chicken into chunks. Mix yogurt with half the spices, coat chicken and marinate 15 minutes.",
      "Cook rice according to packet instructions.",
      "Heat oil in a large pan over medium-high heat. Cook chicken in batches until charred, 3–4 minutes per side. Set aside.",
      "In the same pan, fry onion until golden, 5 minutes. Add garlic and ginger, cook 1 minute.",
      "Add remaining spices, stir 30 seconds. Pour in crushed tomatoes, simmer 10 minutes.",
      "Stir in cream and return chicken to pan. Simmer 5 minutes until cooked through.",
      "Season, garnish with coriander and serve with rice.",
    ],
    tags: ["family-friendly", "freezer-friendly", "dairy"],
    imageQuery: "chicken tikka masala curry bowl", estimatedCost: 22,
  },
  {
    id: "spaghetti-bolognese",
    name: "Spaghetti Bolognese",
    description: "A slow-simmered beef ragù with rich tomato depth. The kind of pasta that improves as it rests.",
    cuisine: "italian", primaryProtein: "beef", servings: 4,
    cookTimeMinutes: 45, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "beef mince", quantity: 500, unit: "g" },
      { name: "spaghetti", quantity: 400, unit: "g" },
      { name: "brown onion", quantity: 1, unit: "each" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "carrot", quantity: 1, unit: "each" },
      { name: "celery", quantity: 2, unit: "each" },
      { name: "crushed tomatoes", quantity: 400, unit: "g" },
      { name: "tomato paste", quantity: 2, unit: "tbsp" },
      { name: "beef stock", quantity: 250, unit: "ml" },
      { name: "dried oregano", quantity: 1, unit: "tsp" },
      { name: "olive oil extra virgin", quantity: 2, unit: "tbsp" },
      { name: "parmesan grated", quantity: 60, unit: "g" },
    ],
    method: [
      "Finely dice onion, carrot and celery. Mince garlic.",
      "Heat oil in a heavy-based pot. Cook onion, carrot and celery 8 minutes until softened.",
      "Add garlic and cook 1 minute. Add mince, breaking up with a spoon, cook until browned.",
      "Stir in tomato paste and cook 2 minutes. Add crushed tomatoes, stock and oregano.",
      "Simmer uncovered on low heat 30 minutes, stirring occasionally, until thickened.",
      "Cook spaghetti in salted boiling water until al dente. Reserve ½ cup pasta water.",
      "Toss pasta with ragù, adding pasta water to loosen. Serve with parmesan.",
    ],
    tags: ["family-friendly", "freezer-friendly", "classic"],
    imageQuery: "spaghetti bolognese pasta bowl", estimatedCost: 18,
  },
  {
    id: "thai-green-curry",
    name: "Thai Green Curry",
    description: "Fragrant coconut milk curry with tender chicken and vibrant vegetables. On the table in under 30 minutes.",
    cuisine: "thai", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 25, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "chicken thigh fillets", quantity: 700, unit: "g" },
      { name: "coconut milk", quantity: 400, unit: "ml" },
      { name: "green capsicum", quantity: 1, unit: "each" },
      { name: "zucchini", quantity: 2, unit: "each" },
      { name: "baby spinach", quantity: 120, unit: "g" },
      { name: "fish sauce", quantity: 2, unit: "tbsp" },
      { name: "basmati rice", quantity: 300, unit: "g" },
      { name: "lime", quantity: 2, unit: "each" },
      { name: "fresh coriander", quantity: 1, unit: "bunch" },
    ],
    method: [
      "Cook rice per packet instructions.",
      "Heat oil in a wok over high heat. Stir-fry chicken until golden, 4 minutes. Set aside.",
      "Pour coconut milk into wok. Add capsicum and zucchini, cook 5 minutes.",
      "Return chicken, add fish sauce. Simmer 3 minutes.",
      "Stir in spinach until wilted. Squeeze in lime juice. Serve over rice.",
    ],
    tags: ["quick", "gluten-free", "dairy-free"],
    imageQuery: "thai green curry coconut bowl", estimatedCost: 20,
  },
  {
    id: "greek-lamb-salad",
    name: "Greek Lamb Salad",
    description: "Marinated lamb backstrap over a vibrant Greek salad with feta and kalamata olives.",
    cuisine: "greek", primaryProtein: "lamb", servings: 4,
    cookTimeMinutes: 15, prepTimeMinutes: 20, difficulty: "easy",
    ingredients: [
      { name: "lamb cutlets", quantity: 600, unit: "g" },
      { name: "olive oil extra virgin", quantity: 4, unit: "tbsp" },
      { name: "dried oregano", quantity: 2, unit: "tsp" },
      { name: "lemon", quantity: 2, unit: "each" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "lebanese cucumber", quantity: 2, unit: "each" },
      { name: "kalamata olives", quantity: 150, unit: "g" },
      { name: "feta cheese", quantity: 200, unit: "g" },
      { name: "baby spinach", quantity: 120, unit: "g" },
    ],
    method: [
      "Combine olive oil, oregano and lemon zest. Coat lamb and rest 10 minutes.",
      "Toss salad ingredients with olive oil and lemon juice. Season.",
      "Grill lamb 3 minutes per side. Rest 3 minutes, then slice.",
      "Arrange over salad. Crumble feta over top.",
    ],
    tags: ["gluten-free", "quick", "low-carb"],
    imageQuery: "greek lamb salad feta olives", estimatedCost: 28,
  },
  {
    id: "salmon-traybake",
    name: "Lemon Herb Salmon Traybake",
    description: "One-pan salmon with roasted sweet potato and asparagus.",
    cuisine: "australian", primaryProtein: "seafood", servings: 4,
    cookTimeMinutes: 30, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "atlantic salmon portions", quantity: 600, unit: "g" },
      { name: "sweet potato", quantity: 600, unit: "g" },
      { name: "asparagus", quantity: 2, unit: "bunch" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "olive oil extra virgin", quantity: 3, unit: "tbsp" },
      { name: "lemon", quantity: 2, unit: "each" },
    ],
    method: [
      "Preheat oven to 200°C. Roast sweet potato 15 minutes.",
      "Add asparagus and tomatoes. Nestle salmon on top.",
      "Drizzle with olive oil and lemon. Roast 15 more minutes.",
    ],
    tags: ["gluten-free", "dairy-free", "one-pan", "healthy"],
    imageQuery: "salmon traybake sweet potato asparagus", estimatedCost: 32,
  },
  {
    id: "falafel-pita",
    name: "Crispy Falafel Pita",
    description: "Golden herb-packed falafel in warm pita with tahini and fresh salad.",
    cuisine: "middle-eastern", primaryProtein: "tofu", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 20, difficulty: "medium",
    ingredients: [
      { name: "chickpeas drained", quantity: 800, unit: "g" },
      { name: "brown onion", quantity: 1, unit: "each" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "fresh coriander", quantity: 1, unit: "bunch" },
      { name: "pita bread", quantity: 1, unit: "pack" },
      { name: "tahini", quantity: 4, unit: "tbsp" },
      { name: "lemon", quantity: 2, unit: "each" },
    ],
    method: [
      "Blitz chickpeas, onion, garlic, cumin and coriander until coarse. Season.",
      "Shape into 16 patties. Refrigerate 10 minutes.",
      "Fry in oil over medium-high heat, 3 minutes per side until golden.",
      "Mix tahini with lemon juice and water. Serve in warm pitas.",
    ],
    tags: ["vegan", "vegetarian", "dairy-free"],
    imageQuery: "crispy falafel pita tahini herbs", estimatedCost: 14,
  },
  {
    id: "pad-thai",
    name: "Prawn Pad Thai",
    description: "Classic Thai street noodles with king prawns, egg, and crispy bean sprouts.",
    cuisine: "thai", primaryProtein: "seafood", servings: 4,
    cookTimeMinutes: 15, prepTimeMinutes: 15, difficulty: "medium",
    ingredients: [
      { name: "raw king prawns", quantity: 500, unit: "g" },
      { name: "rice stick noodles", quantity: 300, unit: "g" },
      { name: "eggs", quantity: 3, unit: "each" },
      { name: "bean sprouts", quantity: 200, unit: "g" },
      { name: "fish sauce", quantity: 3, unit: "tbsp" },
      { name: "lime", quantity: 2, unit: "each" },
      { name: "roasted peanuts", quantity: 80, unit: "g" },
    ],
    method: [
      "Soak noodles in warm water 20 minutes, drain.",
      "Mix fish sauce and lime juice. Stir-fry prawns 2 minutes. Push to side.",
      "Add noodles and sauce, toss 2 minutes. Scramble eggs through.",
      "Fold in bean sprouts. Serve with peanuts and lime wedges.",
    ],
    tags: ["quick", "dairy-free", "gluten-free"],
    imageQuery: "pad thai prawns noodles lime", estimatedCost: 24,
  },
  {
    id: "beef-tacos",
    name: "Smoky Beef Tacos",
    description: "Spiced beef mince in warm tortillas with all the trimmings. Ready in 20 minutes.",
    cuisine: "mexican", primaryProtein: "beef", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "beef mince", quantity: 600, unit: "g" },
      { name: "tortillas", quantity: 1, unit: "pack" },
      { name: "smoked paprika", quantity: 2, unit: "tsp" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
      { name: "crushed tomatoes", quantity: 200, unit: "g" },
      { name: "hass avocados", quantity: 2, unit: "each" },
      { name: "lime", quantity: 2, unit: "each" },
      { name: "sour cream", quantity: 200, unit: "ml" },
    ],
    method: [
      "Cook onion then garlic and spices. Add mince, brown well.",
      "Add tomatoes, simmer 5 minutes. Mash avocado with lime.",
      "Warm tortillas. Build tacos with beef, avo, sour cream.",
    ],
    tags: ["quick", "family-friendly"],
    imageQuery: "beef tacos avocado lime mexican", estimatedCost: 22,
  },
  {
    id: "pork-stir-fry-noodles",
    name: "Pork & Vegetable Stir-Fry Noodles",
    description: "Silky rice noodles tossed with pork strips in a savoury soy-sesame sauce.",
    cuisine: "asian", primaryProtein: "pork", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 15, difficulty: "easy",
    ingredients: [
      { name: "pork stir fry strips", quantity: 500, unit: "g" },
      { name: "vermicelli rice noodles", quantity: 400, unit: "g" },
      { name: "bok choy", quantity: 3, unit: "each" },
      { name: "carrot", quantity: 2, unit: "each" },
      { name: "soy sauce", quantity: 3, unit: "tbsp" },
      { name: "oyster sauce", quantity: 2, unit: "tbsp" },
      { name: "sesame oil", quantity: 1, unit: "tbsp" },
    ],
    method: [
      "Soak noodles in boiling water, drain.",
      "Stir-fry pork until caramelised. Remove.",
      "Add vegetables, cook 2 minutes. Return pork and noodles. Toss with sauce.",
    ],
    tags: ["quick", "dairy-free"],
    imageQuery: "asian pork noodle stir fry wok", estimatedCost: 18,
  },
  {
    id: "butter-chicken",
    name: "Butter Chicken",
    description: "Silky, mild tomato-cream sauce with tender chicken pieces. A family favourite.",
    cuisine: "indian", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 30, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "chicken thigh fillets", quantity: 800, unit: "g" },
      { name: "butter", quantity: 60, unit: "g" },
      { name: "garam masala", quantity: 2, unit: "tsp" },
      { name: "crushed tomatoes", quantity: 400, unit: "g" },
      { name: "thickened cream", quantity: 200, unit: "ml" },
      { name: "basmati rice", quantity: 300, unit: "g" },
    ],
    method: [
      "Melt butter, cook onion, garlic and spices.",
      "Add tomatoes, simmer. Blend smooth. Stir in cream.",
      "Add chicken, cook 15 minutes. Serve with rice.",
    ],
    tags: ["family-friendly", "freezer-friendly"],
    imageQuery: "butter chicken curry rice", estimatedCost: 20,
  },
  {
    id: "mushroom-pasta",
    name: "Creamy Mushroom Pasta",
    description: "Earthy mushrooms in a rich garlic-parmesan cream sauce. A satisfying meat-free weeknight dinner.",
    cuisine: "italian", primaryProtein: "tofu", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "penne pasta", quantity: 400, unit: "g" },
      { name: "mixed mushrooms", quantity: 500, unit: "g" },
      { name: "thickened cream", quantity: 300, unit: "ml" },
      { name: "parmesan grated", quantity: 80, unit: "g" },
      { name: "garlic", quantity: 4, unit: "clove" },
      { name: "butter", quantity: 40, unit: "g" },
    ],
    method: [
      "Cook pasta. Fry mushrooms in butter until golden.",
      "Add garlic and cream, simmer 3 minutes.",
      "Toss with pasta and parmesan. Serve immediately.",
    ],
    tags: ["vegetarian", "quick"],
    imageQuery: "creamy mushroom pasta parmesan", estimatedCost: 15,
  },
  {
    id: "teriyaki-salmon-bowl",
    name: "Teriyaki Salmon Rice Bowl",
    description: "Glazed salmon over steamed rice with edamame and avocado.",
    cuisine: "japanese", primaryProtein: "seafood", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "atlantic salmon portions", quantity: 600, unit: "g" },
      { name: "jasmine rice", quantity: 300, unit: "g" },
      { name: "soy sauce", quantity: 4, unit: "tbsp" },
      { name: "honey", quantity: 2, unit: "tbsp" },
      { name: "edamame", quantity: 200, unit: "g" },
      { name: "hass avocados", quantity: 2, unit: "each" },
    ],
    method: [
      "Cook rice. Mix soy and honey for glaze.",
      "Pan-fry salmon skin-side down 4 minutes. Flip, brush with glaze, cook 2 more minutes.",
      "Serve over rice with edamame and avocado.",
    ],
    tags: ["gluten-free", "dairy-free", "healthy"],
    imageQuery: "teriyaki salmon rice bowl edamame avocado", estimatedCost: 28,
  },
  {
    id: "lamb-kofta-hummus",
    name: "Lamb Kofta & Hummus",
    description: "Spiced lamb meatballs on creamy hummus with warm pita.",
    cuisine: "middle-eastern", primaryProtein: "lamb", servings: 4,
    cookTimeMinutes: 25, prepTimeMinutes: 20, difficulty: "easy",
    ingredients: [
      { name: "lamb mince", quantity: 600, unit: "g" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "hummus", quantity: 400, unit: "g" },
      { name: "pita bread", quantity: 1, unit: "pack" },
      { name: "flat-leaf parsley", quantity: 1, unit: "bunch" },
      { name: "lemon", quantity: 1, unit: "each" },
    ],
    method: [
      "Mix lamb with spices and season. Shape into koftas.",
      "Grill 3–4 minutes per side until charred.",
      "Serve on hummus with parsley, lemon and warm pita.",
    ],
    tags: ["family-friendly"],
    imageQuery: "lamb kofta hummus middle eastern mezze", estimatedCost: 24,
  },
  {
    id: "chicken-quesadillas",
    name: "Chicken & Cheese Quesadillas",
    description: "Crispy golden tortillas stuffed with spiced chicken and melted cheese. Ready in 20 minutes.",
    cuisine: "mexican", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "chicken breast fillets", quantity: 600, unit: "g" },
      { name: "large flour tortillas", quantity: 1, unit: "pack" },
      { name: "tasty cheese block", quantity: 200, unit: "g" },
      { name: "red capsicum", quantity: 2, unit: "each" },
      { name: "hass avocados", quantity: 2, unit: "each" },
      { name: "lime", quantity: 1, unit: "each" },
    ],
    method: [
      "Cook seasoned chicken, slice thinly.",
      "Fill tortillas with cheese, chicken and capsicum. Fold and cook in dry pan until golden.",
      "Serve with mashed avocado and lime.",
    ],
    tags: ["quick", "family-friendly"],
    imageQuery: "chicken quesadillas avocado sour cream", estimatedCost: 20,
  },
  {
    id: "honey-garlic-chicken",
    name: "Honey Garlic Chicken Tray Bake",
    description: "Golden chicken thighs with potatoes in a sticky honey-garlic glaze. One tray, zero fuss.",
    cuisine: "australian", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 35, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "chicken thigh cutlets", quantity: 8, unit: "each" },
      { name: "baby potatoes", quantity: 600, unit: "g" },
      { name: "broccolini", quantity: 2, unit: "bunch" },
      { name: "honey", quantity: 3, unit: "tbsp" },
      { name: "soy sauce", quantity: 2, unit: "tbsp" },
      { name: "garlic", quantity: 4, unit: "clove" },
    ],
    method: [
      "Roast potatoes 20 minutes with glaze.",
      "Add chicken, brush with glaze. Roast 15 minutes.",
      "Add broccolini, roast 5 more minutes.",
    ],
    tags: ["one-pan", "gluten-free", "family-friendly"],
    imageQuery: "honey garlic chicken tray bake potatoes", estimatedCost: 22,
  },
  {
    id: "beef-fried-rice",
    name: "Beef & Egg Fried Rice",
    description: "Smoky wok-fried rice with tender beef strips and egg. Better than takeaway in 20 minutes.",
    cuisine: "asian", primaryProtein: "beef", servings: 4,
    cookTimeMinutes: 15, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "beef stir fry strips", quantity: 400, unit: "g" },
      { name: "steamed jasmine rice", quantity: 2, unit: "cups" },
      { name: "eggs", quantity: 3, unit: "each" },
      { name: "frozen peas & corn", quantity: 250, unit: "g" },
      { name: "soy sauce", quantity: 4, unit: "tbsp" },
      { name: "sesame oil", quantity: 1, unit: "tbsp" },
    ],
    method: [
      "Stir-fry beef until caramelised. Remove.",
      "Stir-fry vegetables. Scramble eggs through.",
      "Add cold rice and sauces. Toss on high heat. Return beef.",
    ],
    tags: ["quick", "dairy-free"],
    imageQuery: "beef fried rice wok egg", estimatedCost: 18,
  },
  {
    id: "chicken-pesto-pasta",
    name: "Chicken Pesto Pasta",
    description: "Grilled chicken with al dente pasta tossed in fresh basil pesto and cherry tomatoes.",
    cuisine: "mediterranean", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "chicken breast fillets", quantity: 600, unit: "g" },
      { name: "penne pasta", quantity: 400, unit: "g" },
      { name: "basil pesto", quantity: 190, unit: "g" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "parmesan grated", quantity: 60, unit: "g" },
    ],
    method: [
      "Cook pasta. Pan-fry chicken, rest then slice.",
      "Toss warm pasta with pesto and cherry tomatoes.",
      "Top with chicken and parmesan.",
    ],
    tags: ["quick", "family-friendly"],
    imageQuery: "chicken pesto pasta cherry tomatoes parmesan", estimatedCost: 20,
  },
  {
    id: "miso-ramen",
    name: "Miso Pork Ramen",
    description: "Richly flavoured miso broth with tender pork, ramen noodles and soft-boiled egg.",
    cuisine: "japanese", primaryProtein: "pork", servings: 4,
    cookTimeMinutes: 30, prepTimeMinutes: 15, difficulty: "medium",
    ingredients: [
      { name: "pork belly slices", quantity: 500, unit: "g" },
      { name: "ramen noodles", quantity: 400, unit: "g" },
      { name: "white miso paste", quantity: 4, unit: "tbsp" },
      { name: "chicken stock", quantity: 1200, unit: "ml" },
      { name: "eggs", quantity: 4, unit: "each" },
    ],
    method: [
      "Soft-boil eggs 7 minutes. Fry pork belly until crispy.",
      "Simmer stock with garlic and ginger. Whisk in miso.",
      "Cook noodles. Assemble bowls with broth, pork and egg.",
    ],
    tags: ["comfort-food", "dairy-free"],
    imageQuery: "miso ramen pork egg noodles japanese", estimatedCost: 22,
  },
  {
    id: "lamb-souvlaki",
    name: "Lamb Souvlaki Wraps",
    description: "Tender marinated lamb skewers in warm pita with tzatziki.",
    cuisine: "greek", primaryProtein: "lamb", servings: 4,
    cookTimeMinutes: 15, prepTimeMinutes: 20, difficulty: "easy",
    ingredients: [
      { name: "lamb leg diced", quantity: 700, unit: "g" },
      { name: "pita bread", quantity: 1, unit: "pack" },
      { name: "greek yogurt", quantity: 200, unit: "g" },
      { name: "lebanese cucumber", quantity: 1, unit: "each" },
      { name: "lemon", quantity: 2, unit: "each" },
    ],
    method: [
      "Marinate lamb in oil, oregano and lemon.",
      "Make tzatziki. Grill lamb skewers until charred.",
      "Assemble in warm pita with tzatziki and tomato.",
    ],
    tags: ["quick", "family-friendly"],
    imageQuery: "lamb souvlaki pita tzatziki", estimatedCost: 26,
  },
  {
    id: "seafood-paella",
    name: "Prawn & Chorizo Paella",
    description: "Saffron-scented Spanish rice with king prawns and chorizo.",
    cuisine: "mediterranean", primaryProtein: "seafood", servings: 4,
    cookTimeMinutes: 35, prepTimeMinutes: 15, difficulty: "medium",
    ingredients: [
      { name: "raw king prawns", quantity: 500, unit: "g" },
      { name: "chorizo", quantity: 200, unit: "g" },
      { name: "arborio rice", quantity: 300, unit: "g" },
      { name: "chicken stock", quantity: 800, unit: "ml" },
      { name: "saffron threads", quantity: 0.5, unit: "tsp" },
    ],
    method: [
      "Fry chorizo. Cook onion and capsicum.",
      "Add rice, tomatoes and saffron stock. Simmer without stirring 15 minutes.",
      "Add prawns and chorizo. Cook 5 more minutes.",
    ],
    tags: ["gluten-free", "dinner-party"],
    imageQuery: "seafood paella prawns chorizo saffron", estimatedCost: 32,
  },
  {
    id: "chicken-shawarma",
    name: "Chicken Shawarma Wraps",
    description: "Juicy marinated chicken with garlic sauce in warm flatbread.",
    cuisine: "middle-eastern", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 15, difficulty: "easy",
    ingredients: [
      { name: "chicken thigh fillets", quantity: 800, unit: "g" },
      { name: "greek yogurt", quantity: 150, unit: "g" },
      { name: "smoked paprika", quantity: 2, unit: "tsp" },
      { name: "flatbreads", quantity: 1, unit: "pack" },
      { name: "cherry tomatoes", quantity: 200, unit: "g" },
    ],
    method: [
      "Marinate chicken in yogurt and spices. Cook in hot pan.",
      "Make garlic sauce. Slice chicken.",
      "Assemble in warm flatbreads with sauce and tomatoes.",
    ],
    tags: ["quick"],
    imageQuery: "chicken shawarma flatbread garlic sauce", estimatedCost: 20,
  },
  {
    id: "chicken-katsu-curry",
    name: "Chicken Katsu Curry",
    description: "Crispy panko chicken with Japanese curry sauce over steamed rice.",
    cuisine: "japanese", primaryProtein: "chicken", servings: 4,
    cookTimeMinutes: 30, prepTimeMinutes: 20, difficulty: "medium",
    ingredients: [
      { name: "chicken breast fillets", quantity: 4, unit: "each" },
      { name: "panko breadcrumbs", quantity: 150, unit: "g" },
      { name: "Japanese curry roux", quantity: 1, unit: "pack" },
      { name: "jasmine rice", quantity: 300, unit: "g" },
    ],
    method: [
      "Make curry with onion, carrot and potato.",
      "Bread chicken and pan-fry 4 minutes per side.",
      "Slice chicken. Serve with rice and curry.",
    ],
    tags: ["family-friendly", "comfort-food"],
    imageQuery: "chicken katsu curry japanese rice panko", estimatedCost: 24,
  },
  {
    id: "gyudon-beef-bowl",
    name: "Gyudon Beef Rice Bowl",
    description: "Thinly sliced beef and onion simmered in a sweet soy broth over rice.",
    cuisine: "japanese", primaryProtein: "beef", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "beef stir fry strips", quantity: 500, unit: "g" },
      { name: "soy sauce", quantity: 4, unit: "tbsp" },
      { name: "mirin", quantity: 3, unit: "tbsp" },
      { name: "dashi stock", quantity: 200, unit: "ml" },
      { name: "jasmine rice", quantity: 300, unit: "g" },
    ],
    method: [
      "Cook onions in broth mixture. Add beef, cook 2–3 minutes.",
      "Ladle over rice bowls. Top with pickled ginger.",
    ],
    tags: ["quick", "dairy-free"],
    imageQuery: "gyudon beef rice bowl japanese soy", estimatedCost: 20,
  },
  {
    id: "beef-tagine",
    name: "Slow-Cooked Beef Tagine",
    description: "Moroccan-spiced beef with dried apricots and chickpeas over couscous.",
    cuisine: "middle-eastern", primaryProtein: "beef", servings: 4,
    cookTimeMinutes: 90, prepTimeMinutes: 15, difficulty: "medium",
    ingredients: [
      { name: "beef chuck diced", quantity: 800, unit: "g" },
      { name: "ras el hanout spice", quantity: 2, unit: "tbsp" },
      { name: "dried apricots", quantity: 100, unit: "g" },
      { name: "chickpeas drained", quantity: 400, unit: "g" },
      { name: "couscous", quantity: 300, unit: "g" },
    ],
    method: [
      "Brown beef, cook onion and spices.",
      "Add tomatoes, apricots, chickpeas and stock. Braise 1.5 hours.",
      "Serve over couscous.",
    ],
    tags: ["freezer-friendly", "slow-cook"],
    imageQuery: "moroccan beef tagine couscous apricot", estimatedCost: 28,
  },
  {
    id: "baked-mediterranean-fish",
    name: "Mediterranean Baked Fish",
    description: "White fish baked on olives, capers and tomatoes — simple, bright and healthy.",
    cuisine: "mediterranean", primaryProtein: "seafood", servings: 4,
    cookTimeMinutes: 20, prepTimeMinutes: 10, difficulty: "easy",
    ingredients: [
      { name: "barramundi fillets", quantity: 700, unit: "g" },
      { name: "cherry tomatoes", quantity: 300, unit: "g" },
      { name: "kalamata olives", quantity: 120, unit: "g" },
      { name: "olive oil extra virgin", quantity: 3, unit: "tbsp" },
      { name: "lemon", quantity: 2, unit: "each" },
    ],
    method: [
      "Roast tomatoes with olives and capers 10 minutes.",
      "Add fish. Bake 12–15 minutes until flaky. Serve with bread.",
    ],
    tags: ["healthy", "one-pan", "gluten-free", "dairy-free"],
    imageQuery: "baked barramundi mediterranean tomatoes olives", estimatedCost: 26,
  },
];
