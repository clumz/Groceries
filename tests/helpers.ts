import type { CartItem, FeedbackHistory, Product, UserPreferences, WeeklyMealPlan } from "@/types";
import { generateMealPlan } from "@/lib/mealPlanAlgorithm";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";

export const prefs = (o: Partial<UserPreferences> = {}): UserPreferences => ({
  preferredStore: "woolworths",
  suburb: "",
  postcode: "",
  dietaryRequirements: [],
  cuisinePreferences: [],
  proteinPreferences: [],
  householdSize: 2,
  defaultServings: 2,
  budgetRange: "150-250",
  cookTimePreference: "20-40",
  includeLunches: false,
  includeSnacks: true,
  ...o,
});

export const emptyFeedback = (): FeedbackHistory => ({ items: [], servingAdjustments: [], substituteDecisions: [] });

export function plan(p: UserPreferences, fb: FeedbackHistory = emptyFeedback()): WeeklyMealPlan {
  return generateMealPlan(p, fb, computePreferenceEvolution(fb));
}

/** Plans are randomised; checking several catches violations a single run might miss. */
export const plans = (p: UserPreferences, n = 8, fb?: FeedbackHistory) => Array.from({ length: n }, () => plan(p, fb));

export const product = (o: Partial<Product> = {}): Product => ({
  id: "p",
  retailer: "woolworths",
  name: "Test product",
  category: "pantry",
  price: 2,
  unit: "pack",
  unitSize: 500,
  unitOfMeasure: "g",
  available: true,
  ...o,
});

export const cartItem = (o: Partial<CartItem> = {}): CartItem => ({
  id: "i",
  ingredientName: "test",
  totalQuantity: 600,
  unit: "g",
  matchedProduct: product(),
  matchConfidence: 1,
  sourceRecipeIds: [],
  isUnavailable: false,
  ...o,
});
