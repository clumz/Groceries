import { test } from "node:test";
import assert from "node:assert/strict";
import { matchIngredientToProduct } from "@/lib/skuMatcher";
import { aggregateIngredients } from "@/lib/cartAggregator";
import { matchAllIngredients } from "@/lib/skuMatcher";
import { DEFAULT_STAPLES } from "@/lib/pantryManager";
import { plan, prefs } from "./helpers";

const best = (name: string, store: "woolworths" | "coles" = "woolworths") => matchIngredientToProduct(name, store).product?.name ?? "";

test("matches common ingredients", () => {
  assert.match(best("garlic"), /garlic/i);
  assert.match(best("2 tbsp soy sauce"), /soy sauce/i);
  assert.match(best("boneless chicken thighs"), /chicken thigh/i);
  assert.match(best("red capsicum"), /capsicum/i);
  assert.match(best("tinned tomatoes"), /(crushed|diced) tomato/i);
  assert.match(best("coconut milk", "coles"), /coconut milk/i);
});

test("avoids modifier-only false matches", () => {
  assert.doesNotMatch(best("shredded cheese"), /onion/i);
  assert.doesNotMatch(best("red wine"), /onion|capsicum/i);
  assert.doesNotMatch(best("mixed berries"), /nut/i);
  assert.equal(best("unflavored powdered gelatin"), "");
});

test("the cart keeps every product the matcher found", () => {
  const p = prefs({ householdSize: 4, defaultServings: 4, includeLunches: true });
  const pl = plan(p);
  const names = Array.from(new Set(pl.meals.flatMap((m) => m.recipe.ingredients.map((i) => i.name))));
  const mappings = matchAllIngredients(names, "woolworths");
  const items = aggregateIngredients(pl.meals, pl.snacks, mappings, DEFAULT_STAPLES, []);
  const lost = items.filter((i) => !i.isStaple && !i.matchedProduct && mappings.get(i.ingredientName.toLowerCase().trim())?.product);
  assert.equal(lost.length, 0, lost.map((i) => i.ingredientName).join(", "));
});
