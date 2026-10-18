import type { Product } from "@/types";

// Units that convert to a common base (g, ml, each); anything else isn't comparable.
const UNIT_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  each: { base: "each", factor: 1 },
};

/** Convert `qty` of `fromUnit` into `toUnit`, or null when the units don't compare. */
export function convertQuantity(qty: number, fromUnit: string, toUnit: string): number | null {
  const from = UNIT_BASE[fromUnit.toLowerCase()];
  const to = UNIT_BASE[toUnit.toLowerCase()];
  if (!from || !to || from.base !== to.base) return null;
  return (qty * from.factor) / to.factor;
}

/** Packs of `product` needed for `qty` `unit`; 1 when the units can't be compared. */
export function packsNeeded(qty: number, unit: string, product: Product): number {
  if (qty <= 0) return 0;
  const needed = convertQuantity(qty, unit, product.unitOfMeasure);
  if (needed == null || !(product.unitSize > 0)) return 1;
  return Math.max(1, Math.ceil(needed / product.unitSize - 1e-9));
}
