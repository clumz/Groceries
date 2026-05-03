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

const EMPTY_FEEDBACK: FeedbackHistory = {
  items: [],
  servingAdjustments: [],
  substituteDecisions: [],
};

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

      // ─── Actions ───────────────────────────────────────────────────────────
      completeOnboarding: (prefs) =>
        set({ isOnboarded: true, preferences: prefs }),

      updatePreferences: (prefs) =>
        set((s) => ({
          preferences: s.preferences ? { ...s.preferences, ...prefs } : null,
        })),

      setMealPlan: (plan) => set({ currentMealPlan: plan, currentCart: null }),

      setGeneratingPlan: (val) => set({ isGeneratingPlan: val }),

      setBuildingCart: (val) => set({ isBuildingCart: val }),

      swapMeal: (mealId, newMeal) =>
        set((s) => {
          if (!s.currentMealPlan) return s;
          return {
            currentMealPlan: {
              ...s.currentMealPlan,
              meals: s.currentMealPlan.meals.map((m) => (m.id === mealId ? newMeal : m)),
            },
            currentCart: null,
          };
        }),

      updateServings: (mealId, servings) =>
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
        }),

      addFeedback: (feedback) =>
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
        }),

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
      },

      clearOrderHistory: () => set({ orderHistory: [] }),

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

      toggleStaple: (name) =>
        set((s) => {
          const norm = name.toLowerCase().trim();
          const has = s.stapleIngredients.includes(norm);
          return {
            stapleIngredients: has
              ? s.stapleIngredients.filter((x) => x !== norm)
              : [...s.stapleIngredients, norm],
            currentCart: null,
          };
        }),

      clearPantryItem: (ingredientName) =>
        set((s) => ({
          pantryItems: s.pantryItems.filter(
            (p) => p.ingredientName.toLowerCase() !== ingredientName.toLowerCase()
          ),
          currentCart: null,
        })),

      adjustPantryItem: (ingredientName, quantity) =>
        set((s) => {
          const norm = ingredientName.toLowerCase();
          if (quantity <= 0) {
            return { pantryItems: s.pantryItems.filter((p) => p.ingredientName !== norm), currentCart: null };
          }
          return {
            pantryItems: s.pantryItems.map((p) =>
              p.ingredientName === norm ? { ...p, quantity } : p
            ),
            currentCart: null,
          };
        }),

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
