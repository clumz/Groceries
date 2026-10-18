import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchAllIngredients, findSubstitute, scoreIngredientProduct, MIN_MATCH_CONFIDENCE } from "@/lib/skuMatcher";
import type { MapIngredientsRequest, Product } from "@/types";
import { mapIngredientsLimiter, cacheGet, cacheSet, rateLimitKey } from "@/lib/upstash";
import { auth } from "@clerk/nextjs/server";

function hashIngredients(ingredients: { name: string }[], retailer: string): string {
  const key = retailer + ":" + ingredients.map((i) => i.name.toLowerCase()).sort().join(",");
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export async function POST(req: NextRequest) {
  // Rate limiting
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { userId } = await auth();
    const identifier = rateLimitKey(req.headers, userId);
    const { success } = await mapIngredientsLimiter.limit(identifier).catch(() => ({ success: true }));
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body: MapIngredientsRequest = await req.json();
    const { ingredients, retailer } = body;

    // Cache lookup
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const cacheKey = `map:${hashIngredients(ingredients, retailer)}`;
      const cached = await cacheGet<{ mappings: unknown[] }>(cacheKey).catch(() => null);
      if (cached) return NextResponse.json(cached);
    }

    try {
      // Trigram search narrows the catalogue to candidates; the shared scorer
      // picks the winner so DB and in-memory matching agree.
      const results = await Promise.all(
        ingredients.map(async (ingredient) => {
          const name = ingredient.name;
          const candidates = await prisma.$queryRaw<{
            id: string;
            name: string;
            brand: string | null;
            category: string;
            price: number;
            unit: string;
            unit_size: number;
            unit_of_measure: string;
            available: boolean;
            image_url: string | null;
            barcode: string | null;
          }[]>`
            SELECT id, name, brand, category, price, unit,
                   unit_size, unit_of_measure, available, image_url, barcode
            FROM products
            WHERE retailer = ${retailer}
              AND available = true
            ORDER BY
              similarity(regexp_replace(name, '^(woolworths|coles)[[:space:]]+', '', 'i'), ${name}) DESC,
              ts_rank(search_vector, plainto_tsquery('english', ${name})) DESC
            LIMIT 10
          `;

          let best: (typeof candidates)[number] | null = null;
          let bestScore = 0;
          for (const c of candidates) {
            const score = scoreIngredientProduct(name, c);
            if (score > bestScore) {
              bestScore = score;
              best = c;
            }
          }
          if (!best || bestScore < MIN_MATCH_CONFIDENCE) {
            return { ingredientName: name, product: null, confidence: 0, substitute: null };
          }

          const product: Product = {
            id: best.id,
            retailer: retailer as "woolworths" | "coles",
            name: best.name,
            brand: best.brand ?? undefined,
            category: best.category as Product["category"],
            price: best.price,
            unit: best.unit,
            unitSize: best.unit_size,
            unitOfMeasure: best.unit_of_measure,
            available: best.available,
            imageUrl: best.image_url ?? undefined,
            barcode: best.barcode ?? undefined,
          };
          return { ingredientName: name, product, confidence: Math.min(bestScore, 1), substitute: null };
        })
      );

      const response = { mappings: results };
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const cacheKey = `map:${hashIngredients(ingredients, retailer)}`;
        cacheSet(cacheKey, response, 24 * 60 * 60).catch(() => {}); // 24h TTL, fire-and-forget
      }
      return NextResponse.json(response);
    } catch {
      // DB unavailable — fall back to in-memory Jaccard matching
      console.warn("DB unavailable for map-ingredients, using in-memory fallback");
      return mapIngredientsWithFallback(ingredients, retailer);
    }
  } catch (error) {
    console.error("map-ingredients error:", error);
    return NextResponse.json({ error: "Mapping failed" }, { status: 500 });
  }
}

function mapIngredientsWithFallback(
  ingredients: MapIngredientsRequest["ingredients"],
  retailer: MapIngredientsRequest["retailer"]
) {
  const ingredientNames = ingredients.map((i) => i.name);
  const mappings = matchAllIngredients(ingredientNames, retailer);

  const result = ingredients.map((ingredient) => {
    const key = ingredient.name.toLowerCase().trim();
    const match = mappings.get(key) ?? { product: null, confidence: 0 };
    const substitute =
      match.product && !match.product.available
        ? findSubstitute(match.product, retailer)
        : null;

    return {
      ingredientName: ingredient.name,
      product: match.product,
      confidence: match.confidence,
      substitute,
    };
  });

  return NextResponse.json({ mappings: result });
}
