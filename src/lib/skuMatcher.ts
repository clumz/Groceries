import type { Product, Retailer } from "@/types";
import { woolworthsCatalogue } from "@/data/woolworths";
import { colesCatalogue } from "@/data/coles";

interface MatchResult {
  product: Product | null;
  confidence: number;
}

function singular(t: string): string {
  if (t.length > 4 && t.endsWith("oes")) return t.slice(0, -2); // tomatoes → tomato
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

const STOP_WORDS = new Set([
  "fresh", "dried", "frozen", "canned", "tinned", "organic", "free", "range",
  "plain", "whole", "raw", "cooked", "boneless", "skinless", "unsalted", "salted",
  "large", "small", "medium", "ripe", "extra", "virgin", "ground", "crushed",
  "diced", "sliced", "chopped", "minced", "peeled", "the", "of", "and", "or",
]);

// Words in catalogue names that say nothing about what the product is.
const PRODUCT_NOISE = new Set(["woolworth", "cole", "loose", "pack", "pk", "punnet", "bag", "each", "rspca", "approved"]);
const SIZE_TOKEN = /^\d+(\.\d+)?(g|kg|ml|l|pk|pack|x)?$/;

function meaningfulTokens(str: string): string[] {
  return tokenize(str).filter((t) => !STOP_WORDS.has(t));
}

function productTokens(name: string): string[] {
  return meaningfulTokens(name).filter((t) => !PRODUCT_NOISE.has(t) && !SIZE_TOKEN.test(t));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((t) => setB.has(t)).length;
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return intersection / union;
}

// Words that describe rather than identify; sharing only these isn't a match
// ("red" wine vs "red" capsicum, "white" rice vs "white" wine vinegar).
const MODIFIERS = new Set([
  "red", "green", "yellow", "white", "brown", "black", "purple", "baby", "sweet", "hot", "mild",
  "mixed", "long", "short", "thick", "thin", "light", "dark", "sea", "fine", "coarse", "soft", "hard",
  "lean", "fat", "full", "low", "reduced", "skin", "on", "off", "in", "with", "style", "bunch",
]);

// Quantities, units and packaging that recipe text puts before the ingredient.
const LEADING_NOISE = /^(\d[\d\/.¼½¾⅓⅔⅛\s-]*|a|an|about|lb|lbs|oz|g|kg|ml|l|tsp|tbsp|cup|cups|can|cans|jar|jars|package|packages|envelope|bunch|bunches|head|heads|clove|cloves|in|inch|square|sprig|sprigs|pinch|handful|small|medium|large)\b\.?\s*/i;

/** "1 lb. mushrooms, trimmed (about 4 cups)" → "mushrooms" */
function cleanIngredient(name: string): string {
  const segments = name.toLowerCase().split(/[,()]/);
  // First segment that still names a food once quantities are gone
  // ("lb. skinless, boneless chicken thighs" → "boneless chicken thighs").
  for (const segment of segments) {
    let s = segment.trim();
    for (let prev = ""; prev !== s; ) {
      prev = s;
      s = s.replace(LEADING_NOISE, "").trim();
    }
    if (meaningfulTokens(s).length > 0) return s;
  }
  return name.toLowerCase();
}

// Preparation words that imply a supermarket aisle.
const FORM_CATEGORY: Record<string, string> = { tinned: "pantry", canned: "pantry", dried: "pantry", frozen: "frozen" };

/**
 * How well an ingredient phrase describes a product, 0–1. At least one shared
 * word must identify the food, not just describe it.
 */
function matchScore(ingredient: string[], product: string[]): number {
  if (ingredient.length === 0 || product.length === 0) return 0;
  const prodSet = new Set(product);
  if (!ingredient.some((t) => prodSet.has(t) && !MODIFIERS.has(t))) return 0;
  const jaccard = jaccardSimilarity(ingredient, product);
  // Every ingredient word appears in the product name: a strong match that
  // only loses a little for extra product words (e.g. "spinach" → "baby spinach").
  const covered = ingredient.every((t) => prodSet.has(t));
  return covered ? Math.max(jaccard, 0.6 + 0.4 * jaccard) : jaccard;
}

const INGREDIENT_ALIASES: Record<string, string[]> = {
  "spring onion": ["shallot", "green onion", "scallion"],
  "coriander": ["cilantro"],
  "eggplant": ["aubergine"],
  "zucchini": ["courgette"],
  "capsicum": ["bell pepper", "pepper"],
  "prawn": ["shrimp"],
  "mince": ["ground beef", "ground lamb", "ground chicken"],
  "chicken breast": ["chicken breast fillet", "chicken breast fillets"],
  "chicken thigh": ["chicken thigh fillet", "chicken thigh fillets"],
};

function expandAliases(name: string): string[] {
  const lower = name.toLowerCase();
  const variants = [lower];
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    if (lower.includes(canonical)) {
      aliases.forEach((a) => variants.push(lower.replace(canonical, a)));
    }
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        variants.push(lower.replace(alias, canonical));
      }
    }
  }
  return variants;
}

/** Score one catalogue product against a recipe ingredient, 0–1. */
export function scoreIngredientProduct(
  ingredientName: string,
  product: { name: string; category: string; available: boolean }
): number {
  const cleaned = cleanIngredient(ingredientName);
  const variants = expandAliases(cleaned).map(meaningfulTokens);
  const tokens = productTokens(product.name);
  let score = Math.max(...variants.map((v) => matchScore(v, tokens)));
  const formCategory = tokenize(cleaned).map((t) => FORM_CATEGORY[t]).find(Boolean);
  if (score > 0 && formCategory === product.category) score = Math.min(1, score + 0.1);
  // Penalise unavailable products slightly to prefer available ones
  if (!product.available) score *= 0.85;
  return score;
}

export const MIN_MATCH_CONFIDENCE = 0.15;

export function matchIngredientToProduct(
  ingredientName: string,
  retailer: Retailer,
  catalogue?: Product[]
): MatchResult {
  const products = catalogue ?? (retailer === "woolworths" ? woolworthsCatalogue : colesCatalogue);

  let bestMatch: Product | null = null;
  let bestScore = 0;
  for (const product of products) {
    const score = scoreIngredientProduct(ingredientName, product);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }

  if (bestScore < MIN_MATCH_CONFIDENCE) return { product: null, confidence: 0 };
  return { product: bestMatch, confidence: Math.min(bestScore, 1) };
}

export function matchAllIngredients(
  ingredients: string[],
  retailer: Retailer
): Map<string, MatchResult> {
  const catalogue = retailer === "woolworths" ? woolworthsCatalogue : colesCatalogue;
  const results = new Map<string, MatchResult>();
  for (const name of ingredients) {
    results.set(name.toLowerCase().trim(), matchIngredientToProduct(name, retailer, catalogue));
  }
  return results;
}

export function findSubstitute(product: Product, retailer: Retailer): Product | null {
  const catalogue = retailer === "woolworths" ? woolworthsCatalogue : colesCatalogue;
  const tokens = productTokens(product.name);

  let best: Product | null = null;
  let bestScore = 0;

  for (const candidate of catalogue) {
    if (candidate.id === product.id || !candidate.available) continue;
    if (candidate.category !== product.category) continue;
    const score = jaccardSimilarity(tokens, productTokens(candidate.name));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0.2 ? best : null;
}
