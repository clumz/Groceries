import { test } from "node:test";
import assert from "node:assert/strict";
import { cartItemCost, estimatePantrySavings, formatItemCost } from "@/lib/cartAggregator";
import { convertQuantity } from "@/lib/units";
import { updatePantryAfterOrder } from "@/lib/pantryManager";
import { cartItem, product } from "./helpers";

test("unit conversion", () => {
  assert.equal(convertQuantity(1.2, "kg", "g"), 1200);
  assert.equal(convertQuantity(750, "ml", "L"), 0.75);
  assert.equal(convertQuantity(3, "clove", "head"), null);
});

test("pricing by packs needed", () => {
  assert.deepEqual(cartItemCost(cartItem()), { product: cartItem().matchedProduct, packs: 2, total: 4 });
  assert.equal(cartItemCost(cartItem({ totalQuantity: 1.2, unit: "kg" })).packs, 3);
  assert.equal(cartItemCost(cartItem({ totalQuantity: 0.5, unit: "kg" })).packs, 1, "exact size isn't rounded up");
  assert.equal(cartItemCost(cartItem({ totalQuantity: 3, unit: "clove", matchedProduct: product({ unitSize: 1, unitOfMeasure: "head" }) })).packs, 1);
  assert.equal(formatItemCost(cartItem()), "2 × A$2.00");
});

test("what's not bought costs nothing", () => {
  assert.equal(cartItemCost(cartItem({ isStaple: true })).total, 0);
  assert.equal(cartItemCost(cartItem({ markedAsHave: true })).total, 0);
  assert.equal(cartItemCost(cartItem({ pantryContribution: 400 })).packs, 1);
  assert.equal(cartItemCost(cartItem({ substitute: product({ price: 9, unitSize: 1000 }), substituteApproved: true })).total, 9);
});

test("pantry savings count pantry stock only, not staples", () => {
  assert.equal(estimatePantrySavings([cartItem({ isStaple: true })]), 0);
  assert.equal(estimatePantrySavings([cartItem({ pantryContribution: 400 })]), 2);
});

test("pantry after an order keeps only leftovers", () => {
  assert.deepEqual(
    updatePantryAfterOrder([cartItem({ ingredientName: "rice" })], [], "o").map((p) => [p.ingredientName, p.quantity, p.unit]),
    [["rice", 400, "g"]]
  );
  assert.equal(updatePantryAfterOrder([cartItem({ totalQuantity: 500 })], [], "o").length, 0, "exact use");
  assert.equal(updatePantryAfterOrder([cartItem({ unit: "cup" })], [], "o").length, 0, "incomparable units");
  assert.equal(updatePantryAfterOrder([cartItem({ isStaple: true }), cartItem({ markedAsHave: true, ingredientName: "x" })], [], "o").length, 0);
  const used = updatePantryAfterOrder(
    [cartItem({ ingredientName: "rice", totalQuantity: 300, pantryContribution: 300 })],
    [{ ingredientName: "rice", quantity: 400, unit: "g", addedAt: 1 }],
    "o"
  );
  assert.equal(used[0].quantity, 100);
});
