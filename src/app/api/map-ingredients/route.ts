import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchAllIngredients, findSubstitute } from "@/lib/skuMatcher";
import type { MapIngredientsRequest, Product } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: MapIngredientsRequest = await req.json();
    const { ingredients, retailer } = body;

    try {
      // Try DB-backed trigram matching first
      const results = await Promise.all(
        ingredients.map(async (ingredient) => {
          const name = ingredient.name;

          // Use pg_trgm similarity + tsvector ranking
          const matches = await prisma.$queryRaw<{
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
            similarity: number;
          }[]>`
            SELECT
              id, name, brand, category, price, unit,
              unit_size, unit_of_measure, available,
              image_url, barcode,
              similarity(name, ${name}) as similarity
            FROM products
            WHERE retailer = ${retailer}
              AND available = true
            ORDER BY
              similarity(name, ${name}) DESC,
              ts_rank(search_vector, plainto_tsquery('english', ${name})) DESC
            LIMIT 3
          `;

          if (matches.length === 0 || matches[0].similarity < 0.12) {
            return { ingredientName: name, product: null, confidence: 0, substitute: null };
          }

          const best = matches[0];
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

          // If best match is unavailable, find a substitute
          let substitute: Product | null = null;
          if (!product.available && matches.length > 1) {
            const sub = matches.find((m) => m.available);
            if (sub) {
              substitute = {
                id: sub.id,
                retailer: retailer as "woolworths" | "coles",
                name: sub.name,
                brand: sub.brand ?? undefined,
                category: sub.category as Product["category"],
                price: sub.price,
                unit: sub.unit,
                unitSize: sub.unit_size,
                unitOfMeasure: sub.unit_of_measure,
                available: sub.available,
                imageUrl: sub.image_url ?? undefined,
                barcode: sub.barcode ?? undefined,
              };
            }
          }

          return {
            ingredientName: name,
            product: product.available ? product : null,
            confidence: Math.min(best.similarity, 1),
            substitute,
          };
        })
      );

      return NextResponse.json({ mappings: results });
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
