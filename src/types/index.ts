// ─── User & Preferences ───────────────────────────────────────────────────────

export type StorePreference = "woolworths" | "coles";

export type DietaryRequirement =
  | "vegan"
  | "vegetarian"
  | "pescatarian"
  | "gluten-free"
  | "dairy-free"
  | "halal"
  | "kosher"
  | "nut-free"
  | "low-fodmap"
  | "diabetic-friendly";

export type CuisinePreference =
  | "italian"
  | "asian"
  | "mediterranean"
  | "mexican"
  | "middle-eastern"
  | "indian"
  | "australian"
  | "japanese"
  | "thai"
  | "greek";

export type ProteinPreference =
  | "chicken"
  | "beef"
  | "lamb"
  | "pork"
  | "seafood"
  | "tofu"
  | "eggs"
  | "no-preference";

export type BudgetRange = "under-150" | "150-250" | "250-350" | "350-plus";

export type CookTimePreference = "under-20" | "20-40" | "40-plus";

export interface UserPreferences {
  preferredStore: StorePreference;
  suburb: string;
  postcode: string;
  dietaryRequirements: DietaryRequirement[];
  cuisinePreferences: CuisinePreference[];
  proteinPreferences: ProteinPreference[];
  householdSize: number;
  defaultServings: number;
  budgetRange: BudgetRange;
  cookTimePreference: CookTimePreference;
  includeLunches: boolean;
  includeSnacks: boolean;
}

// ─── Feedback & Learning ───────────────────────────────────────────────────────

export type FeedbackType = "thumbs-up" | "thumbs-down" | "never-show";

export interface RecipeFeedback {
  recipeId: string;
  recipeName: string;
  feedback: FeedbackType;
  timestamp: number;
  cuisineType?: string;
  primaryProtein?: string;
}

export interface FeedbackHistory {
  items: RecipeFeedback[];
  servingAdjustments: { recipeId: string; originalServings: number; adjustedServings: number }[];
  substituteDecisions: { productId: string; accepted: boolean; timestamp: number }[];
}

export interface PreferenceEvolution {
  reducedProteins: string[];
  reducedCuisines: string[];
  favoriteCuisines: string[];
  favoriteProteins: string[];
}

// ─── Recipes & Meal Plan ──────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: CuisinePreference;
  primaryProtein?: string;
  servings: number;
  cookTimeMinutes: number;
  prepTimeMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  ingredients: RecipeIngredient[];
  method: string[];
  tags: string[];
  imageQuery: string;
  estimatedCost?: number;
}

export type MealType = "dinner" | "lunch" | "snack";

export interface PlannedMeal {
  id: string;
  dayIndex: number;
  mealType: MealType;
  recipe: Recipe;
  servings: number;
  feedback?: FeedbackType;
}

export interface WeeklyMealPlan {
  id: string;
  generatedAt: number;
  meals: PlannedMeal[];
  snacks: SnackItem[];
  preferenceSnapshot: UserPreferences;
}

export interface SnackItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

// ─── Products & Catalogue ─────────────────────────────────────────────────────

export type Retailer = "woolworths" | "coles";

export interface Product {
  id: string;
  retailer: Retailer;
  name: string;
  brand?: string;
  category: ProductCategory;
  price: number;
  unit: string;
  unitSize: number;
  unitOfMeasure: string;
  available: boolean;
  imageUrl?: string;
  barcode?: string;
}

export type ProductCategory =
  | "produce"
  | "meat"
  | "seafood"
  | "dairy"
  | "bakery"
  | "pantry"
  | "frozen"
  | "snacks"
  | "beverages"
  | "deli"
  | "health";

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  matchedProduct: Product | null;
  matchConfidence: number;
  sourceRecipeIds: string[];
  substitute?: Product;
  substituteApproved?: boolean;
  isUnavailable: boolean;
}

export interface Cart {
  id: string;
  retailer: Retailer;
  items: CartItem[];
  estimatedTotal: number;
  createdAt: number;
  mealPlanId: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "confirmed" | "placed";

export interface Order {
  id: string;
  retailer: Retailer;
  cart: Cart;
  status: OrderStatus;
  estimatedDeliveryDate: string;
  estimatedDeliveryWindow: string;
  deliveryAddress: string;
  placedAt?: number;
  confirmationNumber?: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  isOnboarded: boolean;
  preferences: UserPreferences | null;
  feedbackHistory: FeedbackHistory;
  currentMealPlan: WeeklyMealPlan | null;
  currentCart: Cart | null;
  currentOrder: Order | null;
  isGeneratingPlan: boolean;
  isBuildingCart: boolean;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface GeneratePlanRequest {
  preferences: UserPreferences;
  feedbackHistory: FeedbackHistory;
  preferenceEvolution: PreferenceEvolution;
}

export interface GeneratePlanResponse {
  mealPlan: WeeklyMealPlan;
}

export interface MapIngredientsRequest {
  ingredients: RecipeIngredient[];
  retailer: Retailer;
  recipeId: string;
}

export interface MapIngredientsResponse {
  mappings: { ingredientName: string; product: Product | null; confidence: number }[];
}
