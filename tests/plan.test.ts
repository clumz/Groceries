import { test } from "node:test";
import assert from "node:assert/strict";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";
import { PreferencesPatchSchema, PreferencesPutSchema } from "@/lib/validation";
import { emptyFeedback, plan, plans, prefs } from "./helpers";

test("a default week has 7 different dinners", () => {
  for (const p of plans(prefs(), 5)) {
    assert.equal(p.meals.filter((m) => m.mealType === "dinner").length, 7);
    assert.equal(new Set(p.meals.map((m) => m.recipe.id)).size, p.meals.length);
  }
});

test("lunches, snacks and servings follow preferences", () => {
  const withLunch = plan(prefs({ includeLunches: true }));
  assert.equal(withLunch.meals.filter((m) => m.mealType === "lunch" && m.dayIndex <= 4).length, 5);
  assert.equal(plan(prefs({ includeSnacks: false })).snacks.length, 0);
  assert.ok(plan(prefs({ defaultServings: 12 })).meals.every((m) => m.servings === 12));
});

test("never-show recipes never come back", () => {
  const first = plan(prefs()).meals[0].recipe;
  const fb = emptyFeedback();
  fb.items.push({ recipeId: first.id, recipeName: first.name, feedback: "never-show", timestamp: Date.now() });
  for (const p of plans(prefs(), 15, fb)) assert.ok(!p.meals.some((m) => m.recipe.id === first.id));
});

test("feedback shifts preferences", () => {
  const fb = emptyFeedback();
  for (let i = 0; i < 3; i++) {
    fb.items.push({ recipeId: `d${i}`, recipeName: "x", feedback: "thumbs-down", timestamp: Date.now(), cuisineType: "thai" });
    fb.items.push({ recipeId: `u${i}`, recipeName: "x", feedback: "thumbs-up", timestamp: Date.now(), cuisineType: "greek" });
  }
  const evo = computePreferenceEvolution(fb);
  assert.ok(evo.reducedCuisines.includes("thai"));
  assert.ok(evo.favoriteCuisines.includes("greek"));
});

test("preference PATCH only touches fields it sends", () => {
  assert.deepEqual(PreferencesPatchSchema.parse({ theme: "dark" }), { theme: "dark" });
  assert.ok(!PreferencesPutSchema.safeParse(prefs({ householdSize: 0 })).success);
});
