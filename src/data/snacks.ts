import type { SnackItem } from "@/types";

type DietaryTag = "vegan" | "vegetarian" | "gluten-free" | "dairy-free" | "nut-free" | "low-carb";

interface SnackCatalogueItem extends SnackItem {
  dietaryTags: DietaryTag[];
}

export const SNACK_CATALOGUE: SnackCatalogueItem[] = [
  {
    id: "sc-01", name: "Mixed Nuts", description: "Heart-healthy handful — almonds, cashews, walnuts",
    quantity: 1, unit: "bag (500g)", estimatedCost: 9.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "low-carb"],
  },
  {
    id: "sc-02", name: "Greek Yogurt", description: "Protein-rich with a drizzle of honey",
    quantity: 2, unit: "tubs (500g)", estimatedCost: 11.00,
    dietaryTags: ["vegetarian", "gluten-free", "nut-free"],
  },
  {
    id: "sc-03", name: "Rice Crackers & Hummus", description: "Satisfying crunch with creamy dip",
    quantity: 1, unit: "pack each", estimatedCost: 6.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-04", name: "Fresh Fruit", description: "Bananas, apples and whatever is in season",
    quantity: 2, unit: "kg mixed", estimatedCost: 8.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-05", name: "Popcorn", description: "Air-popped, lightly salted",
    quantity: 2, unit: "bags (100g)", estimatedCost: 4.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-06", name: "Edamame", description: "Frozen edamame — steam and sprinkle with sea salt",
    quantity: 1, unit: "bag (500g)", estimatedCost: 5.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-07", name: "Carrot & Celery with Hummus", description: "Crunchy veggies and creamy hummus",
    quantity: 1, unit: "serve", estimatedCost: 5.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-08", name: "Hard Boiled Eggs", description: "Meal-prepped for the week — high protein, zero effort",
    quantity: 6, unit: "eggs", estimatedCost: 4.00,
    dietaryTags: ["vegetarian", "gluten-free", "dairy-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-09", name: "Dark Chocolate 70%", description: "A square or two — antioxidant-rich treat",
    quantity: 2, unit: "bars (100g)", estimatedCost: 7.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-10", name: "Blueberries & Strawberries", description: "Fresh seasonal berries — vitamin C and antioxidants",
    quantity: 1, unit: "punnet each", estimatedCost: 9.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-11", name: "Avocado Rice Cakes", description: "Smashed avo with lemon and chilli flakes on rice cakes",
    quantity: 1, unit: "pack (130g) + 2 avocados", estimatedCost: 6.50,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-12", name: "Apple Slices & Almond Butter", description: "Classic combo — natural sweetness with healthy fats",
    quantity: 2, unit: "apples + 1 jar", estimatedCost: 8.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "low-carb"],
  },
  {
    id: "sc-13", name: "Trail Mix", description: "Dried cranberries, seeds and chocolate chips",
    quantity: 1, unit: "bag (400g)", estimatedCost: 7.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
  },
  {
    id: "sc-14", name: "Cottage Cheese & Pineapple", description: "High-protein snack with tropical sweetness",
    quantity: 1, unit: "tub (500g) + 1 can", estimatedCost: 7.00,
    dietaryTags: ["vegetarian", "gluten-free", "nut-free"],
  },
  {
    id: "sc-15", name: "Corn Chips & Guacamole", description: "Classic combo — great for sharing",
    quantity: 1, unit: "pack each", estimatedCost: 8.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
  {
    id: "sc-16", name: "Seaweed Snacks", description: "Crispy toasted nori — salty, umami and very low calorie",
    quantity: 3, unit: "packs (5g each)", estimatedCost: 4.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-17", name: "Pumpkin Seeds", description: "Roasted pepitas — magnesium-rich and satisfying",
    quantity: 1, unit: "bag (300g)", estimatedCost: 5.50,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-18", name: "Coconut Yogurt & Granola", description: "Dairy-free yogurt topped with crunchy granola",
    quantity: 2, unit: "tubs + 1 bag", estimatedCost: 12.00,
    dietaryTags: ["vegan", "vegetarian", "dairy-free", "nut-free"],
  },
  {
    id: "sc-19", name: "Cheese & Crackers", description: "Vintage cheddar with wholegrain crackers",
    quantity: 1, unit: "serve", estimatedCost: 7.00,
    dietaryTags: ["vegetarian", "nut-free"],
  },
  {
    id: "sc-20", name: "Cherry Tomatoes & Bocconcini", description: "Caprese skewers with a drizzle of olive oil",
    quantity: 1, unit: "punnet + 200g", estimatedCost: 7.00,
    dietaryTags: ["vegetarian", "gluten-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-21", name: "Protein Bars", description: "Convenient high-protein snack for busy days",
    quantity: 4, unit: "bars", estimatedCost: 10.00,
    dietaryTags: ["vegetarian", "gluten-free", "nut-free"],
  },
  {
    id: "sc-22", name: "Banana & Peanut Butter", description: "Natural energy boost — great pre or post workout",
    quantity: 4, unit: "bananas + 1 jar", estimatedCost: 6.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
  },
  {
    id: "sc-23", name: "Oat Bliss Balls", description: "No-bake rolled oat, honey and coconut balls",
    quantity: 12, unit: "balls", estimatedCost: 5.00,
    dietaryTags: ["vegetarian", "dairy-free", "nut-free"],
  },
  {
    id: "sc-24", name: "Cucumber & Tzatziki", description: "Cool, refreshing dip with sliced cucumber",
    quantity: 1, unit: "serve", estimatedCost: 5.50,
    dietaryTags: ["vegetarian", "gluten-free", "nut-free", "low-carb"],
  },
  {
    id: "sc-25", name: "Frozen Mango Chunks", description: "Natural frozen mango — cooling tropical snack",
    quantity: 1, unit: "bag (500g)", estimatedCost: 6.00,
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
  },
];

export function filterSnacksByDiet(
  dietaryRequirements: string[]
): SnackCatalogueItem[] {
  return SNACK_CATALOGUE.filter((snack) => {
    if (dietaryRequirements.includes("vegan") && !snack.dietaryTags.includes("vegan")) return false;
    if (dietaryRequirements.includes("vegetarian") && !snack.dietaryTags.includes("vegan") && !snack.dietaryTags.includes("vegetarian")) return false;
    if (dietaryRequirements.includes("gluten-free") && !snack.dietaryTags.includes("gluten-free")) return false;
    if (dietaryRequirements.includes("dairy-free") && !snack.dietaryTags.includes("dairy-free")) return false;
    if (dietaryRequirements.includes("nut-free") && !snack.dietaryTags.includes("nut-free")) return false;
    return true;
  });
}
