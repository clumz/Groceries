/**
 * Downloads and transforms the josephrmartinez/recipe-dataset (13k Epicurious recipes)
 * into our Recipe schema. Selects up to 20 recipes per cuisine.
 *
 * Run: npx tsx scripts/import-epicurious.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CSV_URL =
  "https://raw.githubusercontent.com/josephrmartinez/recipe-dataset/main/13k-recipes.csv";

const CUISINE_KEYWORDS: [string, RegExp][] = [
  ["indian",        /tikka|masala|biryani|curry|dal|paneer|korma|vindaloo|naan|chapati|chutney|samosa|tandoori|saag|aloo|palak|makhani|raita/i],
  ["italian",       /pasta|parmigiana|risotto|linguine|carbonara|lasagna|gnocchi|pizza|bruschetta|minestrone|osso buco|saltimbocca|arrabiata|puttanesca|bolognese|tiramisu|pesto/i],
  ["thai",          /\bthai\b|pad thai|lemongrass|galangal|nam prik|green curry|red curry|massaman|tom yum|tom kha|satay|pad see ew/i],
  ["mexican",       /taco|burrito|enchilada|quesadilla|salsa|guacamole|chile|chipotle|tamale|mole|fajita|pozole|carnitas|ceviche|jalapeño/i],
  ["japanese",      /ramen|teriyaki|sushi|miso|katsu|gyoza|edamame|dashi|sake|mirin|wasabi|udon|soba|tempura|tonkatsu|gyudon|yakitori/i],
  ["middle-eastern",/hummus|shawarma|kofta|falafel|tagine|tahini|za.atar|sumac|kebab|tabouleh|fattoush|muhammara|harissa|shakshuka|ras el hanout/i],
  ["mediterranean", /paella|gazpacho|bouillabaisse|ratatouille|provençal|tapenade|aioli|nicoise|pissaladiere|moules|souvlaki(?!.*greek)|tzatziki(?!.*greek)/i],
  ["asian",         /stir.fry|fried rice|dim sum|wonton|dumpling|hoisin|oyster sauce|bok choy|szechuan|sichuan|peking|kung pao|mapo|chow mein|lo mein|bibimbap|bulgogi|japchae/i],
  ["greek",         /greek|souvlaki|moussaka|spanakopita|feta|kalamata|dolma|gyro|tzatziki|baklava|orzo.*lemon|avgolemono/i],
  ["australian",    /barramundi|vegemite|pavlova|lamington|anzac|meat pie|sausage roll|tim tam/i],
];

const PROTEIN_KEYWORDS: [string, RegExp][] = [
  ["chicken",  /\bchicken\b|\bpoultry\b|\bhen\b|\bturkey\b/i],
  ["beef",     /\bbeef\b|\bsteak\b|\bbrisket\b|\btenderloin\b|\bground beef\b|\bmince\b|\bribs\b|\bsirloin\b/i],
  ["lamb",     /\blamb\b|\bmutton\b/i],
  ["pork",     /\bpork\b|\bbacon\b|\bham\b|\bprosciutto\b|\bpancetta\b|\bsausage\b|\bribs\b/i],
  ["seafood",  /\bfish\b|\bsalmon\b|\btuna\b|\bshrimp\b|\bprawn\b|\bseafood\b|\bcod\b|\bhalibut\b|\bbass\b|\bcrab\b|\blobster\b|\bscallop\b|\bclam\b|\bmussel\b|\bsquid\b|\boxster\b/i],
  ["tofu",     /\btofu\b|\btempeh\b|\bseitan\b|\bvegetarian\b|\bvegan\b|\bchickpea\b|\blentil\b|\bbean\b/i],
  ["eggs",     /\begg\b|\bfrittata\b|\bquiche\b|\bomelette\b/i],
];

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

const UNITS = [
  "tablespoons","tablespoon","tbsp","tsp","teaspoons","teaspoon",
  "cups","cup","oz","ounces","ounce","lbs","lb","pounds","pound",
  "grams","gram","g","kg","kilograms","kilogram","ml","milliliters",
  "liters","liter","l","cloves","clove","bunches","bunch","cans","can",
  "packages","package","pkg","slices","slice","pieces","piece",
  "sprigs","sprig","stalks","stalk","heads","head","inches","inch",
  "quarts","quart","pints","pint","gallons","gallon",
];

function detectCuisine(title: string, ingredients: string): string | null {
  const text = title + " " + ingredients;
  for (const [cuisine, re] of CUISINE_KEYWORDS) {
    if (re.test(text)) return cuisine;
  }
  return null;
}

function detectProtein(title: string, ingredients: string): string {
  const text = title + " " + ingredients;
  for (const [protein, re] of PROTEIN_KEYWORDS) {
    if (re.test(text)) return protein;
  }
  return "chicken";
}

function parseFractionStr(s: string): number {
  s = s.trim();
  // Replace unicode fractions
  for (const [ch, val] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(ch, ` ${val}`);
  }
  // "1 0.5" → 1.5
  const parts = s.trim().split(/\s+/);
  if (parts.length === 2) return parseFloat(parts[0]) + parseFloat(parts[1]);
  // "1/2"
  if (s.includes("/")) {
    const [n, d] = s.split("/").map(Number);
    return n / d;
  }
  return parseFloat(s) || 1;
}

function parseIngredient(raw: string): { name: string; quantity: number; unit: string } | null {
  if (!raw || raw.length < 2) return null;
  // Remove notes after comma: "2 cups flour, sifted" → "2 cups flour"
  const clean = raw.replace(/,\s*(to taste|divided|sifted|chopped|minced|diced|sliced|plus more.*|or more.*|optional.*)$/i, "").trim();

  // Match leading number/fraction
  const numRe = /^([½¼¾⅓⅔⅛⅜⅝⅞\d][½¼¾⅓⅔⅛⅜⅝⅞\d/. -]*)\s+(.+)$/;
  const m = clean.match(numRe);
  if (!m) {
    // No number — treat as "1 unit <name>"
    return { name: clean.replace(/^(a|an)\s+/i, ""), quantity: 1, unit: "unit" };
  }

  const quantity = parseFractionStr(m[1]);
  let rest = m[2].trim();

  // Try to strip unit
  for (const unit of UNITS) {
    const re = new RegExp(`^${unit}s?\\s+(.+)$`, "i");
    const um = rest.match(re);
    if (um) {
      return { name: um[1].replace(/\s*\(.*?\)\s*/g, "").trim(), quantity, unit };
    }
  }

  // No unit matched — name is the rest
  return { name: rest.replace(/\s*\(.*?\)\s*/g, "").trim(), quantity, unit: "unit" };
}

function parsePythonList(raw: string): string[] {
  // Input: "['item one', 'item two', \"item three\"]"
  const items: string[] = [];
  // Remove outer brackets
  const inner = raw.trim().replace(/^\[|\]$/g, "");
  // Split by ', ' but respect quotes
  const re = /['"](.+?)['"]/g;
  let match;
  while ((match = re.exec(inner)) !== null) {
    const s = match[1].replace(/""/g, '"').trim();
    if (s) items.push(s);
  }
  return items;
}

function parseInstructions(raw: string): string[] {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter((s) => s.length > 15)
    .slice(0, 8);
}

function inferDifficulty(ingredients: number, steps: number): "easy" | "medium" | "hard" {
  if (ingredients <= 7 && steps <= 4) return "easy";
  if (ingredients >= 14 || steps >= 7) return "hard";
  return "medium";
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/** Minimal CSV parser — handles double-quoted fields with "" escapes */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length && text[i] !== "\n") {
      if (text[i] === '"') {
        i++; // skip opening quote
        let field = "";
        while (i < text.length) {
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { field += text[i++]; }
        }
        row.push(field);
        if (text[i] === ",") i++;
      } else {
        let field = "";
        while (i < text.length && text[i] !== "," && text[i] !== "\n") field += text[i++];
        row.push(field);
        if (text[i] === ",") i++;
      }
    }
    if (text[i] === "\n") i++;
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

async function main() {
  console.log("Downloading recipe dataset (26MB)…");
  const res = await fetch(CSV_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const csvText = await res.text();
  console.log(`Downloaded. Parsing…`);

  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length} rows`);

  // Counters per cuisine
  const LIMIT_PER_CUISINE = 20;
  const counts: Record<string, number> = {};
  const results: any[] = [];
  const seenSlugs = new Set<string>();

  for (const row of rows) {
    // Columns: 0=idx, 1=Title, 2=Ingredients, 3=Instructions, 4=Image_Name, 5=Cleaned_Ingredients
    if (row.length < 4) continue;
    const title = row[1]?.trim();
    const ingredientsRaw = row[2]?.trim();
    const instructionsRaw = row[3]?.trim();
    if (!title || !ingredientsRaw || !instructionsRaw) continue;

    const cuisine = detectCuisine(title, ingredientsRaw);
    if (!cuisine) continue;
    if ((counts[cuisine] ?? 0) >= LIMIT_PER_CUISINE) continue;

    const ingredientStrings = parsePythonList(ingredientsRaw);
    const ingredients = ingredientStrings
      .map(parseIngredient)
      .filter((x): x is NonNullable<typeof x> => x !== null && x.name.length > 1)
      .slice(0, 15);

    if (ingredients.length < 3) continue;

    const method = parseInstructions(instructionsRaw);
    if (method.length < 2) continue;

    const slug = slugify(title);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const protein = detectProtein(title, ingredientsRaw);
    const cookTime = Math.max(15, Math.min(90, method.length * 9 + 8));
    const prepTime = Math.max(5, Math.min(30, Math.floor(ingredients.length * 1.5)));

    const recipe = {
      id: slug,
      name: title,
      description: `A ${cuisine} dish with ${ingredientStrings.slice(0, 2).join(" and ").toLowerCase()}.`,
      cuisine,
      primaryProtein: protein,
      servings: 4,
      cookTimeMinutes: cookTime,
      prepTimeMinutes: prepTime,
      difficulty: inferDifficulty(ingredients.length, method.length),
      ingredients,
      method,
      tags: [] as string[],
      imageQuery: title.toLowerCase(),
      estimatedCost: 15 + ingredients.length,
    };

    results.push(recipe);
    counts[cuisine] = (counts[cuisine] ?? 0) + 1;
    process.stdout.write(`\r  ${results.length} recipes (${Object.entries(counts).map(([c, n]) => `${c}:${n}`).join(" ")})`);
  }
  console.log();

  // Also include the 26 existing hand-crafted recipes
  const { MOCK_RECIPES } = await import("../src/lib/mockMealPlan.js");
  const existingSlugs = new Set(MOCK_RECIPES.map((r: any) => r.id));
  const filtered = results.filter((r) => !existingSlugs.has(r.id));

  const allRecipes = [...MOCK_RECIPES, ...filtered];

  const outDir = join(process.cwd(), "src", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "recipes.json"), JSON.stringify(allRecipes, null, 2));
  console.log(`\nWrote ${allRecipes.length} recipes to src/data/recipes.json`);
  console.log("Breakdown:", counts);
}

main().catch((e) => { console.error(e); process.exit(1); });
