"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  UserPreferences,
  WeeklyMealPlan,
  Cart,
  Order,
  FeedbackHistory,
  RecipeFeedback,
  FeedbackType,
  PlannedMeal,
  Retailer,
  CartItem,
  Product,
  PantryItem,
} from "@/types";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";
import { DEFAULT_STAPLES, updatePantryAfterOrder } from "@/lib/pantryManager";
import { toast } from "@/lib/toast";

const EMPTY_FEEDBACK: FeedbackHistory = {
  items: [],
  servingAdjustments: [],
  substituteDecisions: [],
};

// ─── Background server sync helpers ────────────────────────────────────────────

async function bgSync(url: string, opts: RequestInit = {}): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (res.status === 401) return; // Not signed in — skip silently
  } catch {
    // Offline or network error — skip
  }
}

let prefsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function syncPrefsDebounced(preferences: UserPreferences) {
  if (prefsDebounceTimer) clearTimeout(prefsDebounceTimer);
  prefsDebounceTimer = setTimeout(() => {
    bgSync("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
  }, 800);
}

// ─── Interface ────────────────────────────────────────────────────────────────

interface AppActions {
  completeOnboarding: (prefs: UserPreferences) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setMealPlan: (plan: WeeklyMealPlan) => void;
  setGeneratingPlan: (val: boolean) => void;
  setBuildingCart: (val: boolean) => void;
  swapMeal: (mealId: string, newMeal: PlannedMeal) => void;
  updateServings: (mealId: string, servings: number) => void;
  addFeedback: (feedback: RecipeFeedback) => void;
  setCart: (cart: Cart) => void;
  switchRetailer: (retailer: Retailer) => void;
  approveSubstitute: (cartItemId: string) => void;
  rejectSubstitute: (cartItemId: string) => void;
  setOrder: (order: Order) => void;
  clearOrderHistory: () => void;
  toggleItemHave: (cartItemId: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  reset: () => void;
  addMealToPlan: (dayIndex: number, mealType: "dinner" | "lunch", recipe: import("@/types").Recipe, servings: number) => void;
  toggleStaple: (name: string) => void;
  clearPantryItem: (ingredientName: string) => void;
  adjustPantryItem: (ingredientName: string, quantity: number) => void;
  setPantryFromOrder: (orderId: string, cartItems: CartItem[]) => void;
}

type Store = AppState & AppActions;

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      // ─── State ─────────────────────────────────────────────────────────────
      isOnboarded: false,
      preferences: null,
      feedbackHistory: EMPTY_FEEDBACK,
      currentMealPlan: null,
      currentCart: null,
      orderHistory: [],
      isGeneratingPlan: false,
      isBuildingCart: false,
      pantryItems: [],
      stapleIngredients: DEFAULT_STAPLES,
      theme: "system" as const,

      // ─── Actions ───────────────────────────────────────────────────────────
      completeOnboarding: (prefs) => {
        set({ isOnboarded: true, preferences: prefs });
        bgSync("/api/user/preferences", {
          method: "PUT",
          body: JSON.stringify({ ...prefs, isOnboarded: true }),
        });
      },

      updatePreferences: (prefs) => {
        set((s) => ({
          preferences: s.preferences ? { ...s.preferences, ...prefs } : null,
        }));
        const merged = get().preferences;
        if (merged) syncPrefsDebounced(merged);
      },

      setMealPlan: (plan) => set({ currentMealPlan: plan, currentCart: null }),

      setGeneratingPlan: (val) => set({ isGeneratingPlan: val }),

      setBuildingCart: (val) => set({ isBuildingCart: val }),

      swapMeal: (mealId, newMeal) => {
        const planId = get().currentMealPlan?.id;
        set((s) => {
          if (!s.currentMealPlan) return s;
          return {
            currentMealPlan: {
              ...s.currentMealPlan,
              meals: s.currentMealPlan.meals.map((m) => (m.id === mealId ? newMeal : m)),
            },
            currentCart: null,
          };
        });
        if (planId) {
          bgSync(`/api/user/meal-plans/${planId}`, {
            method: "PATCH",
            body: JSON.stringify({ mealId, recipeId: newMeal.recipe.id, servings: newMeal.servings }),
          });
        }
      },

      updateServings: (mealId, servings) => {
        const planId = get().currentMealPlan?.id;
        set((s) => {
          if (!s.currentMealPlan) return s;
          const meal = s.currentMealPlan.meals.find((m) => m.id === mealId);
          const originalServings = meal?.servings ?? servings;
          return {
            currentMealPlan: {
              ...s.currentMealPlan,
              meals: s.currentMealPlan.meals.map((m) =>
                m.id === mealId ? { ...m, servings } : m
              ),
            },
            feedbackHistory: {
              ...s.feedbackHistory,
              servingAdjustments: [
                ...s.feedbackHistory.servingAdjustments,
                { recipeId: mealId, originalServings, adjustedServings: servings },
              ],
            },
            currentCart: null,
          };
        });
        if (planId) {
          bgSync(`/api/user/meal-plans/${planId}`, {
            method: "PATCH",
            body: JSON.stringify({ mealId, servings }),
          });
        }
      },

      addFeedback: (feedback) => {
        const planId = get().currentMealPlan?.id;
        const affectedMeal = get().currentMealPlan?.meals.find(
          (m) => m.recipe.id === feedback.recipeId
        );
        set((s) => {
          const existingIdx = s.feedbackHistory.items.findIndex(
            (i) => i.recipeId === feedback.recipeId
          );
          const items =
            existingIdx >= 0
              ? s.feedbackHistory.items.map((item, i) =>
                  i === existingIdx ? feedback : item
                )
              : [...s.feedbackHistory.items, feedback];
          return {
            feedbackHistory: { ...s.feedbackHistory, items },
            currentMealPlan: s.currentMealPlan
              ? {
                  ...s.currentMealPlan,
                  meals: s.currentMealPlan.meals.map((m) =>
                    m.recipe.id === feedback.recipeId
                      ? { ...m, feedback: feedback.feedback }
                      : m
                  ),
                }
              : null,
          };
        });
        const label = feedback.feedback === "thumbs-up" ? "Liked!" : feedback.feedback === "never-show" ? "Won't show again" : null;
        if (label) toast.success(label);
        bgSync("/api/user/feedback", {
          method: "POST",
          body: JSON.stringify(feedback),
        });
        if (planId && affectedMeal) {
          bgSync(`/api/user/meal-plans/${planId}`, {
            method: "PATCH",
            body: JSON.stringify({ mealId: affectedMeal.id, feedback: feedback.feedback }),
          });
        }
      },

      setCart: (cart) => set({ currentCart: cart }),

      switchRetailer: (retailer) =>
        set((s) => {
          if (!s.preferences) return s;
          return {
            preferences: { ...s.preferences, preferredStore: retailer },
            currentCart: s.currentCart
              ? { ...s.currentCart, retailer }
              : null,
          };
        }),

      approveSubstitute: (cartItemId) =>
        set((s) => {
          if (!s.currentCart) return s;
          return {
            currentCart: {
              ...s.currentCart,
              items: s.currentCart.items.map((item) =>
                item.id === cartItemId ? { ...item, substituteApproved: true } : item
              ),
            },
            feedbackHistory: {
              ...s.feedbackHistory,
              substituteDecisions: [
                ...s.feedbackHistory.substituteDecisions,
                { productId: cartItemId, accepted: true, timestamp: Date.now() },
              ],
            },
          };
        }),

      rejectSubstitute: (cartItemId) =>
        set((s) => {
          if (!s.currentCart) return s;
          return {
            currentCart: {
              ...s.currentCart,
              items: s.currentCart.items.map((item) =>
                item.id === cartItemId ? { ...item, substituteApproved: false } : item
              ),
            },
            feedbackHistory: {
              ...s.feedbackHistory,
              substituteDecisions: [
                ...s.feedbackHistory.substituteDecisions,
                { productId: cartItemId, accepted: false, timestamp: Date.now() },
              ],
            },
          };
        }),

      setOrder: (order) => {
        set((s) => ({
          orderHistory: [order, ...s.orderHistory].slice(0, 52),
        }));
        const cart = get().currentCart;
        if (cart) get().setPantryFromOrder(order.id, cart.items);
        bgSync("/api/user/orders", {
          method: "POST",
          body: JSON.stringify({ order }),
        });
      },

      clearOrderHistory: () => set({ orderHistory: [] }),

      toggleItemHave: (cartItemId) =>
        set((s) => {
          if (!s.currentCart) return s;
          return {
            currentCart: {
              ...s.currentCart,
              items: s.currentCart.items.map((item) =>
                item.id === cartItemId ? { ...item, markedAsHave: !item.markedAsHave } : item
              ),
            },
          };
        }),

      setTheme: (theme) => set({ theme }),

      addMealToPlan: (dayIndex, mealType, recipe, servings) =>
        set((s) => {
          if (!s.currentMealPlan) return s;
          const newMeal: PlannedMeal = {
            id: `meal-added-${Date.now()}`,
            dayIndex,
            mealType,
            recipe: { ...recipe, servings },
            servings,
          };
          const meals = s.currentMealPlan.meals.filter(
            (m) => !(m.dayIndex === dayIndex && m.mealType === mealType)
          );
          return {
            currentMealPlan: { ...s.currentMealPlan, meals: [...meals, newMeal] },
            currentCart: null,
          };
        }),

      toggleStaple: (name) => {
        const norm = name.toLowerCase().trim();
        const isActive = get().stapleIngredients.includes(norm);
        set((s) => {
          const has = s.stapleIngredients.includes(norm);
          return {
            stapleIngredients: has
              ? s.stapleIngredients.filter((x) => x !== norm)
              : [...s.stapleIngredients, norm],
            currentCart: null,
          };
        });
        bgSync("/api/user/pantry", {
          method: "POST",
          body: JSON.stringify({ type: "staple", ingredientName: norm, active: !isActive }),
        });
      },

      clearPantryItem: (ingredientName) => {
        const matchingItems = get().pantryItems.filter(
          (p) => p.ingredientName.toLowerCase() === ingredientName.toLowerCase()
        );
        set((s) => ({
          pantryItems: s.pantryItems.filter(
            (p) => p.ingredientName.toLowerCase() !== ingredientName.toLowerCase()
          ),
          currentCart: null,
        }));
        for (const item of matchingItems) {
          bgSync("/api/user/pantry", {
            method: "DELETE",
            body: JSON.stringify({ ingredientName: item.ingredientName, unit: item.unit }),
          });
        }
      },

      adjustPantryItem: (ingredientName, quantity) => {
        const norm = ingredientName.toLowerCase();
        const existing = get().pantryItems.find((p) => p.ingredientName === norm);
        const unit = existing?.unit ?? "";
        if (quantity <= 0) {
          set((s) => ({
            pantryItems: s.pantryItems.filter((p) => p.ingredientName !== norm),
            currentCart: null,
          }));
          bgSync("/api/user/pantry", {
            method: "DELETE",
            body: JSON.stringify({ ingredientName: norm, unit }),
          });
          return;
        }
        set((s) => ({
          pantryItems: s.pantryItems.map((p) =>
            p.ingredientName === norm ? { ...p, quantity } : p
          ),
          currentCart: null,
        }));
        bgSync("/api/user/pantry", {
          method: "POST",
          body: JSON.stringify({ ingredientName: norm, quantity, unit }),
        });
      },

      setPantryFromOrder: (orderId, cartItems) =>
        set((s) => ({
          pantryItems: updatePantryAfterOrder(cartItems, s.pantryItems, orderId),
        })),

      reset: () =>
        set({
          isOnboarded: false,
          preferences: null,
          feedbackHistory: EMPTY_FEEDBACK,
          currentMealPlan: null,
          currentCart: null,
          orderHistory: [],
          pantryItems: [],
          stapleIngredients: DEFAULT_STAPLES,
          theme: "system",
        }),
    }),
    {
      name: "plate-app-storage",
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 1 && state.currentOrder) {
          state.orderHistory = [state.currentOrder];
          delete state.currentOrder;
        }
        return state;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
    }
  )
);

export const selectPreferenceEvolution = (s: Store) =>
  computePreferenceEvolution(s.feedbackHistory);
