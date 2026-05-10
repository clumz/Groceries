"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

export function StoreHydration() {
  const hydrated = useRef(false);

  // Rehydrate Zustand from localStorage first
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  // Then pull server state (no-ops if not authenticated)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    async function hydrateFromServer() {
      try {
        const [prefsRes, feedbackRes, planRes, pantryRes, ordersRes] = await Promise.all([
          fetch("/api/user/preferences"),
          fetch("/api/user/feedback"),
          fetch("/api/user/meal-plans?active=true"),
          fetch("/api/user/pantry"),
          fetch("/api/user/orders?limit=10"),
        ]);

        if (prefsRes.ok) {
          const { preferences } = await prefsRes.json();
          if (preferences) {
            useAppStore.setState({ preferences, isOnboarded: true });
          }
        }

        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          if (data.feedbackHistory) {
            useAppStore.setState({ feedbackHistory: data.feedbackHistory });
          }
        }

        if (planRes.ok) {
          const data = await planRes.json();
          if (data.mealPlan) {
            useAppStore.setState({ currentMealPlan: data.mealPlan, currentCart: null });
          }
        }

        if (pantryRes.ok) {
          const data = await pantryRes.json();
          if (data.pantryItems) {
            useAppStore.setState({
              pantryItems: data.pantryItems,
              stapleIngredients: data.stapleIngredients ?? useAppStore.getState().stapleIngredients,
            });
          }
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (data.orders?.length > 0) {
            useAppStore.setState({ orderHistory: data.orders });
          }
        }
      } catch {
        // Network error — Zustand localStorage cache remains active
      }
    }

    hydrateFromServer();
  }, []);

  return null;
}
