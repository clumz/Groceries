import { NextRequest, NextResponse } from "next/server";
import { matchAllIngredients, findSubstitute } from "@/lib/skuMatcher";
import type { MapIngredientsRequest, CartItem } from "@/types";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const body: MapIngredientsRequest = await req.json();
    const { ingredients, retailer, recipeId } = body;

    const ingredientNames = ingredients.map((i) => i.name);
    const mappings = matchAllIngredients(ingredientNames, retailer);

    const result = ingredients.map((ingredient) => {
      const key = ingredient.name.toLowerCase().trim();
      const match = mappings.get(key) ?? { product: null, confidence: 0 };
      const substitute = match.product && !match.product.available
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
  } catch (error) {
    console.error("map-ingredients error:", error);
    return NextResponse.json({ error: "Mapping failed" }, { status: 500 });
  }
}
