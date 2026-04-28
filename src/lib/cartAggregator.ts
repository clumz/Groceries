import type { PlannedMeal, SnackItem, CartItem, Product, PantryItem } from "@/types";
import { isStaple, checkPantryContribution } from "@/lib/pantryManager";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface IngredientTotal {
  name: string;
  totalQuantity: number;
  unit: string;
  sourceRecipeIds: string[];
}

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = {
    grams: "g", gram: "g",
    kilograms: "kg", kilogram: "kg",
    milliliters: "ml", millilitres: "ml", milliliter: "ml",
    liters: "L", litres: "L", liter: "L",
    tablespoons: "tbsp", tablespoon: "tbsp",
    teaspoons: "tsp", teaspoon: "tsp",
    cups: "cup",
    pieces: "each", piece: "each", pcs: "each",
    cloves: "clove",
    cans: "can",
    bunches: "bunch",
    heads: "head",
    slices: "slice",
    fillets: "fillet",
    portions: "portion",
  };
  return map[unit.toLowerCase()] ?? unit.toLowerCase();
}

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|dried|frozen|canned|tinned|large|small|medium|ripe|whole|raw|cooked|boneless|skinless)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function aggregateIngredients(
  meals: PlannedMeal[],
  snacks: SnackItem[],
  productMappings: Map<string, { product: Product | null; confidence: number }>,
  stapleIngredientList?: string[],
  pantryItems?: PantryItem[]
): CartItem[] {
  const totals = new Map<string, IngredientTotal>();

  for (const meal of meals) {
    const scaleFactor = meal.servings / meal.recipe.servings;
    for (const ingredient of meal.recipe.ingredients) {
      const key = normalizeIngredientName(ingredient.name);
      const unit = normalizeUnit(ingredient.unit);
      const existing = totals.get(key);
      if (existing && existing.unit === unit) {
        existing.totalQuantity += ingredient.quantity * scaleFactor;
        existing.sourceRecipeIds.push(meal.id);
    } else if (existing) {
        // Different unit — keep as separate entry with unit suffix
        const altKey = `${key}__${unit}`;
        const altExisting = totals.get(altKey);
        if (altExisting) {
          altExisting.totalQuantity += ingredient.quantity * scaleFactor;
          altExisting.sourceRecipeIds.push(meal.id);
        } else {
          totals.set(altKey, {
            name: ingredient.name,
            totalQuantity: ingredient.quantity * scaleFactor,
            unit,
            sourceRecipeIds: [meal.id],
          });
        }
      } else {
        totals.set(key, {
          name: ingredient.name,
          totalQuantity: ingredient.quantity * scaleFactor,
          unit,
          sourceRecipeIds: [meal.id],
        });
      }
    }
  }

  const items: CartItem[] = [];

  totals.forEach((total) => {
    const normalizedName = normalizeIngredientName(total.name);
    const mapping = productMappings.get(normalizedName);
    const product = mapping?.product ?? null;
    const confidence = mapping?.confidence ?? 0;

    const totalQty = Math.ceil(total.totalQuantity * 10) / 10;
    const staple = stapleIngredientList ? isStaple(total.name, stapleIngredientList) : false;
    const { contribution } = pantryItems && !staple
      ? checkPantryContribution(total.name, totalQty, total.unit, pantryItems)
      : { contribution: 0 };

    items.push({
      id: generateId(),
      ingredientName: total.name,
      totalQuantity: totalQty,
      unit: total.unit,
      matchedProduct: product,
      matchConfidence: confidence,
      sourceRecipeIds: Array.from(new Set(total.sourceRecipeIds)),
      isUnavailable: product !== null && !product.available,
      isStaple: staple,
      pantryContribution: staple ? totalQty : contribution,
    });
  });

  return items.sort((a, b) => {
    const catOrder = ["produce", "meat", "seafood", "dairy", "pantry", "frozen", "snacks", "bakery", "health", "deli", "beverages"];
    const catA = a.matchedProduct?.category ?? "pantry";
    const catB = b.matchedProduct?.category ?? "pantry";
    return catOrder.indexOf(catA) - catOrder.indexOf(catB);
  });
}

export function estimateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (item.isStaple) return sum;
    const net = item.totalQuantity - (item.pantryContribution ?? 0);
    if (net <= 0) return sum;
    if (!item.matchedProduct) return sum;
    const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
    return sum + product.price;
  }, 0);
}

export function estimatePantrySavings(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (!item.matchedProduct) return sum;
    const covered = item.isStaple || (item.pantryContribution ?? 0) >= item.totalQuantity;
    if (!covered) return sum;
    return sum + item.matchedProduct.price;
  }, 0);
}
