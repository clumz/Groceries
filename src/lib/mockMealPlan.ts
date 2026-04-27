import type { WeeklyMealPlan, PlannedMeal, SnackItem, UserPreferences, Recipe } from "@/types";

const MOCK_RECIPES: Recipe[] = [
  {
    id: "chicken-tikka-masala",
    name: "Chicken Tikka Masala",
    description: "A rich, creamy tomato-based curry with tender marinated chicken. A crowd-pleasing classic that feels special on a weeknight.",
    cuisine: "indian",
    primaryProtein: "chicken",
    servings: 4,
    cookTimeMinutes: 35,
    prepTimeMinutes: 15,
    difficulty: "medium",
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
    imageQuery: "chicken tikka masala curry bowl",
    estimatedCost: 22,
  },
  {
    id: "spaghetti-bolognese",
    name: "Spaghetti Bolognese",
    description: "A slow-simmered beef ragù with rich tomato depth. The kind of pasta that improves as it rests.",
    cuisine: "italian",
    primaryProtein: "beef",
    servings: 4,
    cookTimeMinutes: 45,
    prepTimeMinutes: 10,
    difficulty: "easy",
    ingredients: [
      { name: "beef mince", quantity: 500, unit: "g" },
      { name: "spaghetti", quantity: 400, unit: "g" },
      { name: "brown onion", quantity: 1, unit: "each" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "carrot", quantity: 1, unit: "each" },
      { name: "celery", quantity: 2, unit: "each", notes: "stalks" },
      { name: "crushed tomatoes", quantity: 400, unit: "g" },
      { name: "tomato paste", quantity: 2, unit: "tbsp" },
      { name: "beef stock", quantity: 250, unit: "ml" },
      { name: "dried oregano", quantity: 1, unit: "tsp" },
      { name: "olive oil extra virgin", quantity: 2, unit: "tbsp" },
      { name: "parmesan grated", quantity: 60, unit: "g" },
      { name: "sea salt", quantity: 1, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
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
    imageQuery: "spaghetti bolognese pasta bowl",
    estimatedCost: 18,
  },
  {
    id: "thai-green-curry",
    name: "Thai Green Curry",
    description: "Fragrant coconut milk curry with tender chicken and vibrant vegetables. On the table in under 30 minutes.",
    cuisine: "thai",
    primaryProtein: "chicken",
    servings: 4,
    cookTimeMinutes: 25,
    prepTimeMinutes: 10,
    difficulty: "easy",
    ingredients: [
      { name: "chicken thigh fillets", quantity: 700, unit: "g" },
      { name: "coconut milk", quantity: 400, unit: "ml" },
      { name: "coconut cream", quantity: 200, unit: "ml" },
      { name: "green capsicum", quantity: 1, unit: "each" },
      { name: "zucchini", quantity: 2, unit: "each" },
      { name: "baby spinach", quantity: 120, unit: "g" },
      { name: "fish sauce", quantity: 2, unit: "tbsp" },
      { name: "basmati rice", quantity: 300, unit: "g" },
      { name: "lime", quantity: 2, unit: "each" },
      { name: "fresh coriander", quantity: 1, unit: "bunch" },
      { name: "spring onions", quantity: 1, unit: "bunch" },
      { name: "vegetable oil", quantity: 1, unit: "tbsp" },
    ],
    method: [
      "Cook rice per packet instructions.",
      "Slice chicken into strips. Chop capsicum and zucchini into bite-sized pieces.",
      "Heat oil in a wok over high heat. Stir-fry chicken until golden, 4 minutes. Set aside.",
      "Pour coconut milk and cream into wok. Bring to a simmer, add capsicum and zucchini.",
      "Cook vegetables 5 minutes. Return chicken, add fish sauce. Simmer 3 minutes.",
      "Stir in spinach until wilted. Squeeze in lime juice.",
      "Serve over rice, garnished with coriander and sliced spring onions.",
    ],
    tags: ["quick", "gluten-free", "dairy-free"],
    imageQuery: "thai green curry coconut bowl",
    estimatedCost: 20,
  },
  {
    id: "greek-lamb-salad",
    name: "Greek Lamb Salad",
    description: "Marinated lamb backstrap over a vibrant Greek salad with feta and kalamata olives. Mediterranean at its best.",
    cuisine: "greek",
    primaryProtein: "lamb",
    servings: 4,
    cookTimeMinutes: 15,
    prepTimeMinutes: 20,
    difficulty: "easy",
    ingredients: [
      { name: "lamb cutlets", quantity: 600, unit: "g" },
      { name: "olive oil extra virgin", quantity: 4, unit: "tbsp" },
      { name: "garlic", quantity: 2, unit: "clove" },
      { name: "dried oregano", quantity: 2, unit: "tsp" },
      { name: "lemon", quantity: 2, unit: "each" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "lebanese cucumber", quantity: 2, unit: "each" },
      { name: "red onion", quantity: 0.5, unit: "each" },
      { name: "kalamata olives", quantity: 150, unit: "g" },
      { name: "feta cheese", quantity: 200, unit: "g" },
      { name: "baby spinach", quantity: 120, unit: "g" },
      { name: "sea salt", quantity: 1, unit: "tsp" },
    ],
    method: [
      "Combine 2 tbsp olive oil, crushed garlic, oregano and lemon zest. Coat lamb and rest 10 minutes.",
      "Halve tomatoes, slice cucumber, thinly slice red onion.",
      "Toss salad ingredients with remaining olive oil and lemon juice. Season.",
      "Heat a grill pan over high heat. Cook lamb cutlets 3 minutes per side for medium. Rest 3 minutes.",
      "Slice lamb and arrange over salad. Crumble feta over top.",
    ],
    tags: ["gluten-free", "quick", "low-carb"],
    imageQuery: "greek lamb salad feta olives",
    estimatedCost: 28,
  },
  {
    id: "pork-stir-fry-noodles",
    name: "Pork & Vegetable Stir-Fry Noodles",
    description: "Silky rice noodles tossed with pork strips and crisp vegetables in a savoury soy-sesame sauce.",
    cuisine: "asian",
    primaryProtein: "pork",
    servings: 4,
    cookTimeMinutes: 20,
    prepTimeMinutes: 15,
    difficulty: "easy",
    ingredients: [
      { name: "pork stir fry strips", quantity: 500, unit: "g" },
      { name: "vermicelli rice noodles", quantity: 400, unit: "g" },
      { name: "bok choy", quantity: 3, unit: "each" },
      { name: "carrot", quantity: 2, unit: "each" },
      { name: "snow peas", quantity: 150, unit: "g" },
      { name: "soy sauce", quantity: 3, unit: "tbsp" },
      { name: "oyster sauce", quantity: 2, unit: "tbsp" },
      { name: "sesame oil", quantity: 1, unit: "tbsp" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "fresh ginger", quantity: 20, unit: "g" },
      { name: "vegetable oil", quantity: 2, unit: "tbsp" },
      { name: "spring onions", quantity: 1, unit: "bunch" },
    ],
    method: [
      "Soak noodles in boiling water 4 minutes, drain and rinse with cold water.",
      "Mix soy sauce, oyster sauce and sesame oil in a bowl. Set aside.",
      "Heat wok over very high heat. Add oil, stir-fry pork 3 minutes until caramelised. Remove.",
      "Add garlic and ginger, cook 30 seconds. Add carrot and snow peas, stir-fry 2 minutes.",
      "Add bok choy, toss 1 minute until wilted. Return pork and add noodles.",
      "Pour sauce over and toss everything together over high heat, 1 minute.",
      "Serve topped with sliced spring onions.",
    ],
    tags: ["quick", "dairy-free"],
    imageQuery: "asian pork noodle stir fry wok",
    estimatedCost: 18,
  },
  {
    id: "salmon-traybake",
    name: "Lemon Herb Salmon Traybake",
    description: "One-pan salmon with roasted sweet potato and asparagus. Effortless, healthy, and packed with flavour.",
    cuisine: "australian",
    primaryProtein: "seafood",
    servings: 4,
    cookTimeMinutes: 30,
    prepTimeMinutes: 10,
    difficulty: "easy",
    ingredients: [
      { name: "tasmanian atlantic salmon portions", quantity: 600, unit: "g" },
      { name: "sweet potato", quantity: 600, unit: "g" },
      { name: "asparagus", quantity: 2, unit: "bunch" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "olive oil extra virgin", quantity: 3, unit: "tbsp" },
      { name: "lemon", quantity: 2, unit: "each" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "fresh thyme", quantity: 1, unit: "pack" },
      { name: "sea salt", quantity: 1, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
    ],
    method: [
      "Preheat oven to 200°C. Peel and cube sweet potato into 2cm pieces.",
      "Toss sweet potato with 2 tbsp olive oil, salt and pepper. Roast 15 minutes.",
      "Add asparagus and cherry tomatoes to tray. Nestle salmon portions on top.",
      "Drizzle salmon with remaining olive oil, top with sliced garlic and thyme sprigs.",
      "Squeeze half the lemon over everything. Roast 15 minutes until salmon is just cooked.",
      "Serve with remaining lemon wedges.",
    ],
    tags: ["gluten-free", "dairy-free", "one-pan", "healthy"],
    imageQuery: "salmon traybake sweet potato asparagus",
    estimatedCost: 32,
  },
  {
    id: "beef-tacos",
    name: "Smoky Beef Tacos",
    description: "Spiced beef mince in warm tortillas with all the trimmings. A crowd favourite that comes together in 20 minutes.",
    cuisine: "mexican",
    primaryProtein: "beef",
    servings: 4,
    cookTimeMinutes: 20,
    prepTimeMinutes: 10,
    difficulty: "easy",
    ingredients: [
      { name: "beef mince", quantity: 600, unit: "g" },
      { name: "tortillas", quantity: 1, unit: "pack" },
      { name: "brown onion", quantity: 1, unit: "each" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "smoked paprika", quantity: 2, unit: "tsp" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
      { name: "chilli flakes", quantity: 0.5, unit: "tsp" },
      { name: "crushed tomatoes", quantity: 200, unit: "g" },
      { name: "hass avocados", quantity: 2, unit: "each" },
      { name: "lime", quantity: 2, unit: "each" },
      { name: "cherry tomatoes", quantity: 250, unit: "g" },
      { name: "sour cream", quantity: 200, unit: "ml" },
      { name: "tasty cheese block", quantity: 100, unit: "g" },
      { name: "vegetable oil", quantity: 1, unit: "tbsp" },
    ],
    method: [
      "Dice onion, halve cherry tomatoes. Mash avocado with lime juice and salt.",
      "Heat oil in a pan. Cook onion until soft, 4 minutes. Add garlic and spices, cook 1 minute.",
      "Add mince, breaking up, cook until browned 5 minutes. Pour in tomatoes, simmer 5 minutes.",
      "Warm tortillas in a dry pan or microwave.",
      "Set up a taco bar: beef, avocado, cherry tomatoes, sour cream, grated cheese.",
      "Build tacos at the table — squeeze fresh lime over the top.",
    ],
    tags: ["quick", "family-friendly", "crowd-pleaser"],
    imageQuery: "beef tacos avocado lime mexican",
    estimatedCost: 22,
  },
];

const MOCK_SNACKS: SnackItem[] = [
  { id: "snack-1", name: "Mixed Nuts", description: "A daily handful — heart-healthy and filling", quantity: 1, unit: "bag (500g)", estimatedCost: 9.00 },
  { id: "snack-2", name: "Fresh Fruit", description: "Bananas, apples and whatever's in season", quantity: 2, unit: "kg mixed", estimatedCost: 8.00 },
  { id: "snack-3", name: "Hummus & Rice Crackers", description: "A satisfying afternoon snack", quantity: 1, unit: "pack each", estimatedCost: 6.00 },
  { id: "snack-4", name: "Dark Chocolate 70%", description: "A square or two after dinner", quantity: 2, unit: "bars (100g)", estimatedCost: 7.00 },
  { id: "snack-5", name: "Greek Yogurt", description: "Breakfast or snack with a drizzle of honey", quantity: 2, unit: "tubs (500g)", estimatedCost: 11.00 },
];

export function generateMockMealPlan(preferences: UserPreferences): WeeklyMealPlan {
  const planId = `mock-plan-${Date.now()}`;

  // Filter recipes by dietary requirements and protein preferences
  let pool = [...MOCK_RECIPES];

  if (preferences.proteinPreferences.length > 0 && !preferences.proteinPreferences.includes("no-preference")) {
    const filtered = pool.filter(
      (r) => r.primaryProtein && preferences.proteinPreferences.includes(r.primaryProtein as never)
    );
    if (filtered.length >= 4) pool = filtered;
  }

  if (preferences.dietaryRequirements.includes("vegan") || preferences.dietaryRequirements.includes("vegetarian")) {
    pool = pool.filter((r) => r.tags.includes("vegan") || r.tags.includes("vegetarian") || r.primaryProtein === "tofu");
    if (pool.length === 0) pool = MOCK_RECIPES; // fallback
  }

  // Pick 7 dinners, cycling through pool
  const dinners: PlannedMeal[] = Array.from({ length: 7 }, (_, i) => {
    const recipe = pool[i % pool.length];
    return {
      id: `meal-${planId}-${i}`,
      dayIndex: i,
      mealType: "dinner" as const,
      recipe: { ...recipe, servings: preferences.defaultServings },
      servings: preferences.defaultServings,
    };
  });

  // Pick 5 lunches if requested (simpler versions)
  const lunches: PlannedMeal[] = preferences.includeLunches
    ? Array.from({ length: 5 }, (_, i) => {
        const recipe = pool[(i + 3) % pool.length];
        return {
          id: `lunch-${planId}-${i}`,
          dayIndex: i,
          mealType: "lunch" as const,
          recipe: { ...recipe, id: `${recipe.id}-lunch`, name: `${recipe.name} (Lunch)`, servings: preferences.defaultServings },
          servings: preferences.defaultServings,
        };
      })
    : [];

  return {
    id: planId,
    generatedAt: Date.now(),
    meals: [...dinners, ...lunches],
    snacks: preferences.includeSnacks ? MOCK_SNACKS : [],
    preferenceSnapshot: preferences,
  };
}
