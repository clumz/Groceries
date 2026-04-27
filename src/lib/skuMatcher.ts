import type { Product, Retailer } from "@/types";
import { woolworthsCatalogue } from "@/data/woolworths";
import { colesCatalogue } from "@/data/coles";

interface MatchResult {
  product: Product | null;
  confidence: number;
}

function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

const STOP_WORDS = new Set([
  "fresh", "dried", "frozen", "canned", "tinned", "organic", "free", "range",
  "plain", "whole", "raw", "cooked", "boneless", "skinless", "unsalted", "salted",
  "large", "small", "medium", "ripe", "extra", "virgin", "ground", "crushed",
  "diced", "sliced", "chopped", "minced", "peeled", "the", "of", "and", "or",
]);

function meaningfulTokens(str: string): string[] {
  return tokenize(str).filter((t) => !STOP_WORDS.has(t));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((t) => setB.has(t)).length;
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return intersection / union;
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

export function matchIngredientToProduct(
  ingredientName: string,
  retailer: Retailer,
  catalogue?: Product[]
): MatchResult {
  const products = catalogue ?? (retailer === "woolworths" ? woolworthsCatalogue : colesCatalogue);
  const variants = expandAliases(ingredientName);
  const ingredientTokens = meaningfulTokens(ingredientName);

  let bestMatch: Product | null = null;
  let bestScore = 0;

  for (const product of products) {
    const productTokens = meaningfulTokens(product.name);

    let maxScore = 0;
    for (const variant of variants) {
      const variantTokens = meaningfulTokens(variant);
      const score = jaccardSimilarity(variantTokens, productTokens);
      maxScore = Math.max(maxScore, score);
    }

    // Boost for substring containment
    const productLower = product.name.toLowerCase();
    for (const variant of variants) {
      const varLower = variant.toLowerCase();
      if (productLower.includes(varLower) || varLower.includes(productLower.split(" ")[1] ?? "")) {
        maxScore = Math.max(maxScore, 0.7);
      }
    }

    // Penalise unavailable products slightly to prefer available ones
    if (!product.available) maxScore *= 0.85;

    if (maxScore > bestScore) {
      bestScore = maxScore;
      bestMatch = product;
    }
  }

  if (bestScore < 0.15) return { product: null, confidence: 0 };
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
  const tokens = meaningfulTokens(product.name);

  let best: Product | null = null;
  let bestScore = 0;

  for (const candidate of catalogue) {
    if (candidate.id === product.id || !candidate.available) continue;
    if (candidate.category !== product.category) continue;
    const score = jaccardSimilarity(tokens, meaningfulTokens(candidate.name));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0.2 ? best : null;
}
