import type { CartItem, PantryItem } from "@/types";

export const DEFAULT_STAPLES: string[] = [
  // Oils & fats
  "olive oil", "vegetable oil", "canola oil", "sesame oil", "sunflower oil",
  // Seasoning
  "salt", "pepper", "black pepper", "white pepper", "chilli flakes",
  // Spices
  "cumin", "coriander", "paprika", "turmeric", "cinnamon", "oregano",
  "thyme", "bay leaves", "garlic powder", "onion powder",
  // Sauces & condiments
  "soy sauce", "fish sauce", "tomato paste", "rice vinegar", "balsamic vinegar",
  "white vinegar", "worcestershire sauce",
  // Baking
  "plain flour", "flour", "sugar", "brown sugar", "baking powder", "baking soda",
  // Stock
  "chicken stock", "beef stock", "vegetable stock",
];

export const STAPLE_GROUPS: { label: string; items: string[] }[] = [
  { label: "Oils & Fats",        items: ["olive oil", "vegetable oil", "canola oil", "sesame oil", "sunflower oil"] },
  { label: "Salt & Pepper",      items: ["salt", "pepper", "black pepper", "white pepper", "chilli flakes"] },
  { label: "Spices",             items: ["cumin", "coriander", "paprika", "turmeric", "cinnamon", "oregano", "thyme", "bay leaves", "garlic powder", "onion powder"] },
  { label: "Sauces",             items: ["soy sauce", "fish sauce", "tomato paste", "rice vinegar", "balsamic vinegar", "white vinegar", "worcestershire sauce"] },
  { label: "Baking",             items: ["plain flour", "flour", "sugar", "brown sugar", "baking powder", "baking soda"] },
  { label: "Stock",              items: ["chicken stock", "beef stock", "vegetable stock"] },
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isStaple(ingredientName: string, stapleList: string[]): boolean {
  const norm = normalize(ingredientName);
  return stapleList.some((s) => {
    const sn = normalize(s);
    // Match if the ingredient name contains the staple token as a word boundary substring
    return norm === sn || norm.includes(sn) || sn.includes(norm);
  });
}

export function checkPantryContribution(
  ingredientName: string,
  quantity: number,
  unit: string,
  pantryItems: PantryItem[]
): { contribution: number; remaining: number } {
  const norm = normalize(ingredientName);
  const match = pantryItems.find(
    (p) => normalize(p.ingredientName) === norm && p.unit === unit
  );
  if (!match || match.quantity <= 0) return { contribution: 0, remaining: quantity };
  const contribution = Math.min(match.quantity, quantity);
  const remaining = Math.max(0, quantity - contribution);
  return { contribution, remaining };
}

export function updatePantryAfterOrder(
  cartItems: CartItem[],
  pantryItems: PantryItem[],
  orderId: string
): PantryItem[] {
  const updated = pantryItems.map((p) => ({ ...p }));

  for (const item of cartItems) {
    const norm = normalize(item.ingredientName);

    if (item.isStaple) continue;

    const pantryContribution = item.pantryContribution ?? 0;
    const netNeeded = item.totalQuantity - pantryContribution;

    if (netNeeded > 0 && item.matchedProduct) {
      // Item was purchased — add product.unitSize worth to pantry
      const existing = updated.find(
        (p) => normalize(p.ingredientName) === norm && p.unit === item.unit
      );
      const addedQty = item.matchedProduct.unitSize > 0 ? item.matchedProduct.unitSize : item.totalQuantity;
      if (existing) {
        existing.quantity += addedQty;
      } else {
        updated.push({
          ingredientName: norm,
          quantity: addedQty,
          unit: item.unit,
          addedAt: Date.now(),
          sourceOrderId: orderId,
        });
      }
    }

    if (pantryContribution > 0) {
      // Deduct what was consumed from pantry
      const pantryEntry = updated.find(
        (p) => normalize(p.ingredientName) === norm && p.unit === item.unit
      );
      if (pantryEntry) {
        pantryEntry.quantity = Math.max(0, pantryEntry.quantity - pantryContribution);
      }
    }
  }

  // Remove depleted entries
  return updated.filter((p) => p.quantity > 0);
}
