"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, selectPreferenceEvolution } from "@/store/useAppStore";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { RecipeCard } from "@/components/plan/RecipeCard";
import { SnacksSection } from "@/components/plan/SnacksSection";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { WeeklyMealPlan, PlannedMeal } from "@/types";
import { RefreshCw, ShoppingCart, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PlanPage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const feedbackHistory = useAppStore((s) => s.feedbackHistory);
  const currentMealPlan = useAppStore((s) => s.currentMealPlan);
  const isGeneratingPlan = useAppStore((s) => s.isGeneratingPlan);
  const setMealPlan = useAppStore((s) => s.setMealPlan);
  const setGeneratingPlan = useAppStore((s) => s.setGeneratingPlan);
  const evolution = useAppStore(selectPreferenceEvolution);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preferences) {
      router.replace("/onboarding");
    }
  }, [preferences, router]);

  async function generatePlan() {
    if (!preferences) return;
    setGeneratingPlan(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences, feedbackHistory, preferenceEvolution: evolution }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setMealPlan(data.mealPlan as WeeklyMealPlan);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setGeneratingPlan(false);
    }
  }

  const dinners = currentMealPlan?.meals.filter(
    (m) => m.mealType === "dinner" && m.dayIndex === activeDay
  ) ?? [];
  const lunches = currentMealPlan?.meals.filter(
    (m) => m.mealType === "lunch" && m.dayIndex === activeDay
  ) ?? [];

  if (!preferences) return null;

  return (
    <div className="min-h-screen bg-surface-secondary pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">This Week</h1>
            <p className="text-xs text-ink-tertiary">
              {currentMealPlan
                ? `Generated ${new Date(currentMealPlan.generatedAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`
                : "No plan yet"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentMealPlan && (
              <button
                onClick={() => router.push("/cart")}
                className="flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3 py-2 rounded-xl"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
              </button>
            )}
            <button
              onClick={generatePlan}
              disabled={isGeneratingPlan}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-tertiary text-ink-secondary hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={clsx("w-4 h-4", isGeneratingPlan && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {DAYS.map((day, idx) => {
            const hasMeal = currentMealPlan?.meals.some((m) => m.dayIndex === idx);
            return (
              <button
                key={day}
                onClick={() => setActiveDay(idx)}
                className={clsx(
                  "flex-shrink-0 flex flex-col items-center gap-0.5 w-10 py-2 rounded-xl transition-all duration-150",
                  activeDay === idx
                    ? "bg-brand-600 text-white"
                    : "text-ink-secondary hover:bg-surface-tertiary"
                )}
              >
                <span className="text-[10px] font-medium">{day}</span>
                <div className={clsx("w-1.5 h-1.5 rounded-full", hasMeal ? (activeDay === idx ? "bg-white/60" : "bg-brand-400") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {isGeneratingPlan && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-semibold text-ink">Crafting your week…</p>
              <p className="text-sm text-ink-tertiary mt-1">Claude is personalising your meal plan</p>
            </div>
          </div>
        )}

        {error && !isGeneratingPlan && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!currentMealPlan && !isGeneratingPlan && (
          <div className="flex flex-col items-center justify-center py-20 gap-5 px-4">
            <div className="text-6xl">🍽️</div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-ink">No meal plan yet</h2>
              <p className="text-sm text-ink-secondary mt-1.5">
                Tap Generate to get your personalised 7-day plan
              </p>
            </div>
            <Button onClick={generatePlan} size="lg">
              Generate my week
            </Button>
          </div>
        )}

        {currentMealPlan && !isGeneratingPlan && (
          <>
            <div className="mb-1">
              <h2 className="text-base font-semibold text-ink">{FULL_DAYS[activeDay]}</h2>
            </div>

            {dinners.length > 0 && (
              <div>
                {preferences.includeLunches && (
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Dinner</p>
                )}
                {dinners.map((meal) => (
                  <RecipeCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}

            {preferences.includeLunches && lunches.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Lunch</p>
                {lunches.map((meal) => (
                  <RecipeCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}

            {dinners.length === 0 && lunches.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3 text-ink-tertiary">
                <span className="text-3xl">🗓️</span>
                <p className="text-sm">No meals planned for {FULL_DAYS[activeDay]}</p>
              </div>
            )}

            {activeDay === 6 && currentMealPlan.snacks.length > 0 && preferences.includeSnacks && (
              <SnacksSection snacks={currentMealPlan.snacks} />
            )}

            {activeDay === 0 && (
              <div className="mt-2">
                <button
                  onClick={() => router.push("/cart")}
                  className="w-full flex items-center justify-between bg-brand-600 text-white px-5 py-4 rounded-2xl"
                >
                  <div>
                    <p className="font-semibold">View weekly cart</p>
                    <p className="text-xs text-brand-200 mt-0.5">All {currentMealPlan.meals.length} meals consolidated</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-brand-200" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
