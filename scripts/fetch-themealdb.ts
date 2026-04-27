/**
 * Fetches recipes from TheMealDB (free, no API key) and writes src/data/recipes.json.
 * Run: npx tsx scripts/fetch-themealdb.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Map TheMealDB areas → our CuisinePreference enum
const AREA_MAP: Record<string, string> = {
  Italian: "italian",
  Indian: "indian",
  Thai: "thai",
  Japanese: "japanese",
  Mexican: "mexican",
  Greek: "greek",
  Chinese: "asian",
  Malaysian: "asian",
  Vietnamese: "asian",
  Korean: "asian",
  Moroccan: "middle-eastern",
  Egyptian: "middle-eastern",
  Turkish: "middle-eastern",
  Spanish: "mediterranean",
  French: "mediterranean",
  Portuguese: "mediterranean",
  British: "australian",
  American: "australian",
  Canadian: "australian",
  Australian: "australian",
  Irish: "australian",
  Jamaican: "mexican",
  Croatian: "mediterranean",
  Dutch: "mediterranean",
  Filipino: "asian",
  Russian: "mediterranean",
  Tunisian: "middle-eastern",
  Kenyan: "middle-eastern",
  Uruguayan: "mexican",
  Polish: "mediterranean",
};

// Map TheMealDB category → primaryProtein
const PROTEIN_MAP: Record<string, string> = {
  Chicken: "chicken",
  Beef: "beef",
  Lamb: "lamb",
  Pork: "pork",
  Seafood: "seafood",
  "Pasta": "beef",
  Vegetarian: "tofu",
  Vegan: "tofu",
  Breakfast: "eggs",
  Dessert: "eggs",
  Side: "tofu",
  Starter: "tofu",
  Goat: "lamb",
  Miscellaneous: "chicken",
};

const BASE = "https://www.themealdb.com/api/json/v1/1";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function parseMeasure(measure: string): { quantity: number; unit: string } {
  const s = measure.trim();
  if (!s) return { quantity: 1, unit: "serving" };

  // Handle fractions like "1/2", "1 1/2"
  const fracMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (fracMatch) {
    const whole = parseInt(fracMatch[1]);
    const num = parseInt(fracMatch[2]);
    const den = parseInt(fracMatch[3]);
    const quantity = whole + num / den;
    return { quantity: Math.round(quantity * 100) / 100, unit: fracMatch[4].trim() || "unit" };
  }
  const simpleFrac = s.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (simpleFrac) {
    const quantity = parseInt(simpleFrac[1]) / parseInt(simpleFrac[2]);
    return { quantity: Math.round(quantity * 100) / 100, unit: simpleFrac[3].trim() || "unit" };
  }

  // Normal number at start
  const numMatch = s.match(/^([\d.]+)\s*(.*)$/);
  if (numMatch) {
    return {
      quantity: parseFloat(numMatch[1]),
      unit: numMatch[2].trim() || "unit",
    };
  }

  // Words like "a pinch", "handful", "to taste"
  return { quantity: 1, unit: s.toLowerCase() };
}

function parseInstructions(raw: string): string[] {
  if (!raw) return ["Cook as directed."];
  // Split by numbered steps or double newlines
  const steps = raw
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|\n(?=\d+[\.\)])|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((s) => s.length > 10);
  return steps.length >= 2 ? steps.slice(0, 8) : [raw.trim()];
}

function inferDifficulty(cookTime: number, ingredientCount: number): "easy" | "medium" | "hard" {
  if (cookTime <= 20 && ingredientCount <= 8) return "easy";
  if (cookTime >= 60 || ingredientCount >= 14) return "hard";
  return "medium";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface MealDetail {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  [key: string]: any;
}

async function getMealsByArea(area: string): Promise<MealSummary[]> {
  try {
    const data = await fetchJSON(`${BASE}/filter.php?a=${encodeURIComponent(area)}`);
    return data.meals ?? [];
  } catch {
    return [];
  }
}

async function getMealDetail(id: string): Promise<MealDetail | null> {
  try {
    const data = await fetchJSON(`${BASE}/lookup.php?i=${id}`);
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
}

function transformMeal(meal: MealDetail, cuisine: string): any {
  // Extract ingredients (up to 20 slots)
  const ingredients: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (!name) break;
    const { quantity, unit } = parseMeasure(measure ?? "");
    ingredients.push({ name, quantity, unit });
  }

  const instructions = parseInstructions(meal.strInstructions);
  const cookTime = Math.max(15, Math.min(90, instructions.length * 8 + 10));
  const prepTime = Math.max(5, Math.min(30, Math.floor(ingredients.length * 1.5)));
  const difficulty = inferDifficulty(cookTime, ingredients.length);
  const protein = PROTEIN_MAP[meal.strCategory] ?? "chicken";

  const tags: string[] = [];
  if (meal.strTags) {
    meal.strTags.split(",").forEach((t: string) => {
      const clean = t.trim().toLowerCase().replace(/\s+/g, "-");
      if (clean) tags.push(clean);
    });
  }
  if (difficulty === "easy") tags.push("quick");
  if (ingredients.length <= 8) tags.push("simple");

  return {
    id: slugify(meal.strMeal),
    name: meal.strMeal,
    description: `A ${meal.strArea ?? cuisine} classic featuring ${ingredients.slice(0, 3).map((i) => i.name.toLowerCase()).join(", ")} and more.`,
    cuisine,
    primaryProtein: protein,
    servings: 4,
    cookTimeMinutes: cookTime,
    prepTimeMinutes: prepTime,
    difficulty,
    ingredients,
    method: instructions,
    tags: [...new Set(tags)],
    imageUrl: meal.strMealThumb,
    imageQuery: meal.strMeal.toLowerCase(),
    estimatedCost: 18 + ingredients.length,
  };
}

async function main() {
  console.log("Fetching areas from TheMealDB...");
  const areasData = await fetchJSON(`${BASE}/list.php?a=list`);
  const areas: string[] = areasData.meals.map((m: any) => m.strArea);

  const recipes: any[] = [];
  const seenIds = new Set<string>();

  for (const area of areas) {
    const cuisine = AREA_MAP[area];
    if (!cuisine) {
      console.log(`  Skipping unmapped area: ${area}`);
      continue;
    }

    console.log(`  Fetching ${area} → ${cuisine}...`);
    const meals = await getMealsByArea(area);
    console.log(`    Found ${meals.length} meals`);

    for (const summary of meals) {
      await sleep(150); // be polite to the free API
      const detail = await getMealDetail(summary.idMeal);
      if (!detail) continue;

      const recipe = transformMeal(detail, cuisine);

      // Deduplicate by slug id
      if (seenIds.has(recipe.id)) {
        recipe.id = `${recipe.id}-${area.toLowerCase()}`;
      }
      seenIds.add(recipe.id);
      recipes.push(recipe);
      process.stdout.write(`\r    Progress: ${recipes.length} recipes fetched`);
    }
    console.log();
    await sleep(500);
  }

  const outDir = join(process.cwd(), "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "recipes.json");
  writeFileSync(outPath, JSON.stringify(recipes, null, 2));
  console.log(`\nDone! Wrote ${recipes.length} recipes to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
