"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAppStore, claimLocalDataFor } from "@/store/useAppStore";

export function StoreHydration() {
  const { isLoaded, userId } = useAuth();
  const hydratedFor = useRef<string | null>(null);

  // Rehydrate Zustand from localStorage first
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  // Then, once we know who's signed in, drop another account's local data and
  // pull this user's server state.
  useEffect(() => {
    if (!isLoaded) return;
    // Signed out: forget who we hydrated for, so in-flight responses are dropped
    // and the next sign-in (even the same account) hydrates again.
    if (!userId) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    claimLocalDataFor(userId);

    // Ignore responses that land after a different account has signed in.
    const fetchedFor = userId;
    const stillCurrent = () => hydratedFor.current === fetchedFor;

    async function hydrateFromServer() {
      try {
        const [prefsRes, feedbackRes, planRes, pantryRes, ordersRes] = await Promise.all([
          fetch("/api/user/preferences"),
          fetch("/api/user/feedback"),
          fetch("/api/user/meal-plans?active=true"),
          fetch("/api/user/pantry"),
          fetch("/api/user/orders?limit=10"),
        ]);
        if (!stillCurrent()) return;

        if (prefsRes.ok) {
          const { preferences } = await prefsRes.json();
          if (!stillCurrent()) return;
          if (preferences) {
            useAppStore.setState({ preferences, isOnboarded: true });
          }
        }

        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          if (!stillCurrent()) return;
          if (data.feedbackHistory) {
            useAppStore.setState({ feedbackHistory: data.feedbackHistory });
          }
        }

        if (planRes.ok) {
          const data = await planRes.json();
          if (!stillCurrent()) return;
          if (data.mealPlan) {
            useAppStore.setState({ currentMealPlan: data.mealPlan, currentCart: null });
          }
        }

        if (pantryRes.ok) {
          const data = await pantryRes.json();
          if (!stillCurrent()) return;
          if (data.pantryItems) {
            useAppStore.setState({
              pantryItems: data.pantryItems,
              stapleIngredients: data.stapleIngredients ?? useAppStore.getState().stapleIngredients,
            });
          }
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (!stillCurrent()) return;
          if (data.orders?.length > 0) {
            useAppStore.setState({ orderHistory: data.orders });
          }
        }
      } catch {
        // Network error — Zustand localStorage cache remains active
      }
    }

    hydrateFromServer();
  }, [isLoaded, userId]);

  return null;
}
