import { test } from "node:test";
import assert from "node:assert/strict";
import type { DietaryRequirement, Recipe } from "@/types";
import { recipeMeetsDiets, SUPPORTED_DIETS } from "@/lib/dietCompliance";
import { getCandidatePool } from "@/lib/mealPlanAlgorithm";
import { plans, prefs } from "./helpers";

const ing = (name: string) => ({ ingredients: [{ name, quantity: 1, unit: "each" }] }) as unknown as Recipe;
const fits = (name: string, diet: string) => recipeMeetsDiets(ing(name), [diet]);

test("ingredient-level diet checks", () => {
  const cases: [string, string, boolean][] = [
    ["oz. white chocolate", "vegan", false],
    ["plain greek-styleyogurt", "vegan", false],
    ["thickened cream", "vegan", false],
    ["links fresh chorizo, casings removed", "vegetarian", false],
    ["fish sauce", "vegetarian", false],
    ["fish sauce", "pescatarian", true],
    ["worcestershire sauce", "vegetarian", false],
    ["honey", "vegan", false],
    ["coconut milk", "vegan", true],
    ["coconut yoghurt", "dairy-free", true],
    ["eggplant", "vegan", true],
    ["butternut squash", "dairy-free", true],
    ["creamy peanut butter", "vegan", true],
    ["creamy peanut butter", "nut-free", false],
    ["nutmeg", "nut-free", true],
    ["soy sauce", "gluten-free", false],
    ["tamari", "gluten-free", true],
    ["flatbreads", "gluten-free", false],
    ["lb. fresh shanghai or lo mein noodles", "gluten-free", false],
    ["rice noodles", "gluten-free", true],
    ["fettuccine shirataki noodles", "gluten-free", true],
    ["corn tortillas", "gluten-free", true],
    ["flour tortillas", "gluten-free", false],
    ["pork stir fry strips", "halal", false],
    ["dry white wine", "halal", false],
    ["red wine vinegar", "halal", true],
    ["fresh ginger", "halal", true],
    ["prawns", "kosher", false],
    ["minced garlic", "vegetarian", true],
    ["beef mince", "vegetarian", false],
  ];
  for (const [name, diet, want] of cases) assert.equal(fits(name, diet), want, `"${name}" for ${diet}`);
});

test("meat and dairy together aren't kosher", () => {
  const r = { ingredients: [{ name: "chicken thighs" }, { name: "butter" }] } as unknown as Recipe;
  assert.equal(recipeMeetsDiets(r, ["kosher"]), false);
});

test("unsupported diets are not enforced and not offered", () => {
  assert.ok(!SUPPORTED_DIETS.includes("low-fodmap"));
  assert.ok(!SUPPORTED_DIETS.includes("diabetic-friendly"));
  assert.equal(recipeMeetsDiets(ing("anything"), ["low-fodmap"]), true);
});

for (const diet of SUPPORTED_DIETS) {
  test(`every planned meal suits a ${diet} diet`, () => {
    for (const p of plans(prefs({ dietaryRequirements: [diet], includeLunches: true }))) {
      for (const m of p.meals) assert.ok(recipeMeetsDiets(m.recipe, [diet]), `${m.recipe.name} planned for ${diet}`);
    }
  });
}

test("combined diets are never silently relaxed (vegan + gluten-free + nut-free)", () => {
  const diets: DietaryRequirement[] = ["vegan", "gluten-free", "nut-free"];
  for (const p of plans(prefs({ dietaryRequirements: diets, includeLunches: true }))) {
    for (const m of p.meals) assert.ok(recipeMeetsDiets(m.recipe, diets), m.recipe.name);
  }
});

test("a diet with too few recipes gives fewer meals rather than unsuitable ones", () => {
  // Vegan + Australian cuisine + lamb leaves almost nothing; diets must still win.
  const p = prefs({ dietaryRequirements: ["vegan"], cuisinePreferences: ["australian"], proteinPreferences: ["lamb"] });
  const pool = getCandidatePool(p);
  assert.ok(pool.every((r) => recipeMeetsDiets(r, ["vegan"])));
  for (const pl of plans(p, 3)) assert.ok(pl.meals.every((m) => recipeMeetsDiets(m.recipe, ["vegan"])));
});

test("common diets still fill a full week with lunches", () => {
  for (const diet of ["vegetarian", "gluten-free", "dairy-free", "halal"] as DietaryRequirement[]) {
    const p = plans(prefs({ dietaryRequirements: [diet], includeLunches: true }), 3);
    for (const pl of p) assert.equal(pl.meals.length, 12, `${diet}: ${pl.meals.length} meals`);
  }
});
