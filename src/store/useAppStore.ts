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
} from "@/types";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";

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
  reset: () => void;
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
      currentOrder: null,
      isGeneratingPlan: false,
      isBuildingCart: false,

      // ─── Actions ───────────────────────────────────────────────────────────
      completeOnboarding: (prefs) =>
        set({ isOnboarded: true, preferences: prefs }),

      updatePreferences: (prefs) =>
        set((s) => ({
          preferences: s.preferences ? { ...s.preferences, ...prefs } : null,
        })),

      setMealPlan: (plan) => set({ currentMealPlan: plan, currentCart: null, currentOrder: null }),

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

      setOrder: (order) => set({ currentOrder: order }),

      reset: () =>
        set({
          isOnboarded: false,
          preferences: null,
          feedbackHistory: EMPTY_FEEDBACK,
          currentMealPlan: null,
          currentCart: null,
          currentOrder: null,
        }),
    }),
    {
      name: "plate-app-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const selectPreferenceEvolution = (s: Store) =>
  computePreferenceEvolution(s.feedbackHistory);
