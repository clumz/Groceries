"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";
import { estimateRecipeNutrition } from "@/lib/nutritionData";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { MacroRing } from "@/components/ui/MacroRing";
import { MacroBar } from "@/components/ui/MacroBar";
import { RecipeCard } from "@/components/plan/RecipeCard";
import { SwapSheet } from "@/components/plan/SwapSheet";
import { SnacksSection } from "@/components/plan/SnacksSection";
import { PlanSkeleton } from "@/components/ui/Skeleton";
import { MigrationBanner } from "@/components/ui/MigrationBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "@/lib/toast";
import type { WeeklyMealPlan, PlannedMeal as PlannedMealType } from "@/types";
import { RefreshCw, ShoppingCart } from "lucide-react";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAYS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function DayPill({ day, date, active, hasMeal, onClick }: {
  day: string; date: number; active: boolean; hasMeal: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, width: 50, height: 60, borderRadius: 18,
      border: "1.5px solid #1A1410",
      background: active ? "#1A1410" : "#FFFFFF",
      color: active ? "#FFF8EE" : "#1A1410",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 3, cursor: "pointer",
      fontFamily: "var(--font-display)",
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: active ? 0.6 : 0.5, letterSpacing: "0.02em" }}>{day}</span>
      <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{date}</span>
      <div style={{
        width: 5, height: 5, borderRadius: 999,
        background: hasMeal ? (active ? "#C8FF3E" : "#FF6B4A") : "transparent",
      }} />
    </button>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const feedbackHistory = useAppStore((s) => s.feedbackHistory);
  const currentMealPlan = useAppStore((s) => s.currentMealPlan);
  const isGeneratingPlan = useAppStore((s) => s.isGeneratingPlan);
  const setMealPlan = useAppStore((s) => s.setMealPlan);
  const setGeneratingPlan = useAppStore((s) => s.setGeneratingPlan);
  const evolution = useMemo(() => computePreferenceEvolution(feedbackHistory), [feedbackHistory]);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [swappingMeal, setSwappingMeal] = useState<PlannedMealType | null>(null);

  // Generate dates for Mon–Sun of current week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return d.getDate();
  });

  useEffect(() => {
    if (!preferences) router.replace("/onboarding");
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
      toast.success("New plan ready!");
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Couldn't generate plan — please try again.");
    } finally {
      setGeneratingPlan(false);
    }
  }

  const { pullY, progress, refreshing } = usePullToRefresh(generatePlan);

  const isSnacksTab = activeDay === 7;
  const dayMeals = currentMealPlan?.meals.filter((m) => m.dayIndex === activeDay) ?? [];
  const dinners = dayMeals.filter((m) => m.mealType === "dinner");
  const lunches = dayMeals.filter((m) => m.mealType === "lunch");

  // Compute daily nutrition totals
  const dayTotals = useMemo(() => {
    if (!currentMealPlan) return null;
    return dayMeals.reduce(
      (acc, m) => {
        const n = estimateRecipeNutrition(m.recipe.ingredients, m.servings);
        return { cal: acc.cal + n.caloriesPerServing, protein: acc.protein + n.proteinG, carbs: acc.carbs + n.carbsG, fat: acc.fat + n.fatG };
      },
      { cal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [currentMealPlan, dayMeals]);

  const calorieGoal = preferences?.calorieGoal ?? null;
  const macroGoal = preferences?.macroGoal ?? null;
  const targetProtein = macroGoal && calorieGoal ? Math.round((macroGoal.proteinPct / 100) * calorieGoal / 4) : null;
  const targetCarbs = macroGoal && calorieGoal ? Math.round((macroGoal.carbsPct / 100) * calorieGoal / 4) : null;
  const targetFat = macroGoal && calorieGoal ? Math.round((macroGoal.fatPct / 100) * calorieGoal / 9) : null;

  if (!preferences) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8EE", paddingBottom: 110 }}>
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "8px 16px", borderRadius: "0 0 16px 16px",
          background: "#1A1410", color: "#FFF8EE",
          fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
          gap: 6, transition: "opacity 0.15s",
        }}>
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none", transform: `rotate(${progress * 180}deg)` }} />
          {refreshing ? "Generating…" : "Pull to refresh"}
        </div>
      )}
      {/* Top bar */}
      <div style={{ padding: "54px 20px 14px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            {today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>
            This <em style={{ fontStyle: "italic", color: "#C8FF3E", WebkitTextStroke: "1px #1A1410" }}>week</em>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {currentMealPlan && (
            <button
              onClick={() => router.push("/cart")}
              style={{
                width: 44, height: 44, borderRadius: 999,
                border: "1.5px solid #1A1410",
                background: "#C8FF3E",
                color: "#1A1410",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "2px 2px 0 #1A1410", cursor: "pointer",
              }}
            >
              <ShoppingCart size={18} />
            </button>
          )}
          <button
            onClick={generatePlan}
            disabled={isGeneratingPlan}
            style={{
              width: 44, height: 44, borderRadius: 999,
              border: "1.5px solid #1A1410",
              background: "#FFFFFF",
              color: "#1A1410",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0 #1A1410", cursor: "pointer",
              opacity: isGeneratingPlan ? 0.5 : 1,
            }}
          >
            <RefreshCw size={16} style={{ animation: isGeneratingPlan ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      <MigrationBanner />

      {/* Hero macro card */}
      {currentMealPlan && calorieGoal && dayTotals && !isGeneratingPlan && (
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            padding: 16, borderRadius: 22,
            border: "1.5px solid #1A1410",
            background: "#FFFFFF",
            boxShadow: "3px 3px 0 #1A1410",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <MacroRing size={120} kcal={dayTotals.cal} target={calorieGoal} color="#C8FF3E" label="kcal today" />
              {targetProtein && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <MacroBar label="Protein" val={dayTotals.protein} target={targetProtein} color="#FF6B4A" />
                  <MacroBar label="Carbs" val={dayTotals.carbs} target={targetCarbs ?? 220} color="#FFD66B" />
                  <MacroBar label="Fat" val={dayTotals.fat} target={targetFat ?? 70} color="#4A2B5C" />
                </div>
              )}
              {!targetProtein && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#1A1410" }}>
                    {dayTotals.protein}g protein
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9C9087", marginTop: 4 }}>
                    {FULL_DAYS[activeDay]}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Day pill scroller */}
      <div style={{ padding: "0 20px 16px" }}>
        <div className="scrollbar-hide" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {DAYS_FULL.map((dayFull, idx) => (
            <DayPill
              key={dayFull}
              day={DAYS[idx]}
              date={weekDates[idx]}
              active={activeDay === idx && !isSnacksTab}
              hasMeal={currentMealPlan?.meals.some((m) => m.dayIndex === idx) ?? false}
              onClick={() => setActiveDay(idx)}
            />
          ))}
          {currentMealPlan && currentMealPlan.snacks.length > 0 && preferences.includeSnacks && (
            <button onClick={() => setActiveDay(7)} style={{
              flexShrink: 0, height: 60, padding: "0 14px", borderRadius: 18,
              border: "1.5px solid #1A1410",
              background: isSnacksTab ? "#1A1410" : "#FFFFFF",
              color: isSnacksTab ? "#FFF8EE" : "#1A1410",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12,
              cursor: "pointer",
            }}>
              Snacks
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px" }}>
        {isGeneratingPlan && <PlanSkeleton />}

        {error && !isGeneratingPlan && (
          <div style={{ background: "#FFE5E0", border: "1.5px solid #FF6B4A", borderRadius: 16, padding: 14, fontSize: 14, color: "#E5482A", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {!currentMealPlan && !isGeneratingPlan && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0 0", gap: 20, textAlign: "center" }}>
            <div style={{ fontSize: 64 }}>🍽️</div>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#1A1410", margin: 0 }}>No meal plan yet</h2>
              <p style={{ fontSize: 14, color: "#5C5249", marginTop: 8 }}>Tap Generate to get your personalised 7-day plan</p>
            </div>
            <Button variant="lime" onClick={generatePlan} size="lg">
              Generate my week ✨
            </Button>
          </div>
        )}

        {currentMealPlan && !isGeneratingPlan && (
          <>
            {isSnacksTab ? (
              <SnacksSection snacks={currentMealPlan.snacks} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#1A1410" }}>
                  {FULL_DAYS[activeDay]}
                </div>

                {dinners.length > 0 && (
                  <div>
                    {preferences.includeLunches && (
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Dinner</div>
                    )}
                    {dinners.map((meal) => (
                      <RecipeCard key={meal.id} meal={meal} onSwapRequest={() => setSwappingMeal(meal)} />
                    ))}
                  </div>
                )}

                {preferences.includeLunches && lunches.length > 0 && (
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Lunch</div>
                    {lunches.map((meal) => (
                      <RecipeCard key={meal.id} meal={meal} onSwapRequest={() => setSwappingMeal(meal)} />
                    ))}
                  </div>
                )}

                {dinners.length === 0 && lunches.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 12, color: "#9C9087" }}>
                    <span style={{ fontSize: 32 }}>🗓️</span>
                    <p style={{ fontSize: 14 }}>No meals planned for {FULL_DAYS[activeDay]}</p>
                  </div>
                )}

                {activeDay === 0 && currentMealPlan && (
                  <button
                    onClick={() => router.push("/cart")}
                    style={{
                      width: "100%", padding: "16px 20px", borderRadius: 20,
                      border: "1.5px solid #1A1410",
                      background: "#C8FF3E",
                      boxShadow: "3px 3px 0 #1A1410",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", marginTop: 4,
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#1A1410", margin: 0 }}>View weekly cart</p>
                      <p style={{ fontSize: 12, color: "#5C5249", marginTop: 2 }}>All {currentMealPlan.meals.length} meals consolidated</p>
                    </div>
                    <ShoppingCart size={20} color="#1A1410" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />

      {swappingMeal && (
        <SwapSheet meal={swappingMeal} onClose={() => setSwappingMeal(null)} />
      )}
    </div>
  );
}
