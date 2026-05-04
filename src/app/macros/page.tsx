"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BottomNav } from "@/components/ui/BottomNav";
import { MacroRing } from "@/components/ui/MacroRing";
import { MacroBar } from "@/components/ui/MacroBar";
import { estimateRecipeNutrition } from "@/lib/nutritionData";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MacrosPage() {
  const preferences = useAppStore((s) => s.preferences);
  const currentMealPlan = useAppStore((s) => s.currentMealPlan);

  const calorieGoal = preferences?.calorieGoal ?? 2000;
  const macroGoal = preferences?.macroGoal;

  // Per-day calorie totals
  const dayTotals = useMemo(() => {
    if (!currentMealPlan) return Array(7).fill({ cal: 0, protein: 0, carbs: 0, fat: 0 });
    return Array.from({ length: 7 }, (_, idx) => {
      const meals = currentMealPlan.meals.filter((m) => m.dayIndex === idx);
      return meals.reduce(
        (acc, m) => {
          const n = estimateRecipeNutrition(m.recipe.ingredients, m.servings);
          return { cal: acc.cal + n.caloriesPerServing, protein: acc.protein + n.proteinG, carbs: acc.carbs + n.carbsG, fat: acc.fat + n.fatG };
        },
        { cal: 0, protein: 0, carbs: 0, fat: 0 }
      );
    });
  }, [currentMealPlan]);

  const weeklyAvg = useMemo(() => {
    const days = dayTotals.filter((d) => d.cal > 0);
    if (days.length === 0) return { cal: 0, protein: 0, carbs: 0, fat: 0 };
    return {
      cal: Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length),
      protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length),
      carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / days.length),
      fat: Math.round(days.reduce((s, d) => s + d.fat, 0) / days.length),
    };
  }, [dayTotals]);

  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0
  const todayTotals = dayTotals[todayIdx] ?? { cal: 0, protein: 0, carbs: 0, fat: 0 };

  const targetProtein = macroGoal ? Math.round((macroGoal.proteinPct / 100) * calorieGoal / 4) : 130;
  const targetCarbs = macroGoal ? Math.round((macroGoal.carbsPct / 100) * calorieGoal / 4) : 220;
  const targetFat = macroGoal ? Math.round((macroGoal.fatPct / 100) * calorieGoal / 9) : 70;

  const maxBar = Math.max(...dayTotals.map((d) => d.cal), calorieGoal);

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8EE", paddingBottom: 110 }}>
      {/* Top bar */}
      <div style={{ padding: "54px 20px 14px 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Your nutrition</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>
          Macros, <em style={{ fontStyle: "italic" }}>tracked.</em>
        </h1>
      </div>

      {/* Today ring card */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          padding: 20, borderRadius: 22, background: "#1A1410",
          border: "1.5px solid #1A1410", boxShadow: "3px 3px 0 #1A1410",
        }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: "rgba(255,248,238,0.5)" }}>Today</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <MacroRing size={120} kcal={todayTotals.cal} target={calorieGoal} color="#C8FF3E" label="kcal today" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,248,238,0.45)" }}>Protein</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "#FF6B4A" }}>{todayTotals.protein}g</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,248,238,0.1)" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "#FF6B4A", width: `${Math.min(todayTotals.protein / targetProtein, 1) * 100}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,248,238,0.45)" }}>Carbs</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "#FFD66B" }}>{todayTotals.carbs}g</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,248,238,0.1)" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "#FFD66B", width: `${Math.min(todayTotals.carbs / targetCarbs, 1) * 100}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,248,238,0.45)" }}>Fat</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "#B8E4F0" }}>{todayTotals.fat}g</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,248,238,0.1)" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "#B8E4F0", width: `${Math.min(todayTotals.fat / targetFat, 1) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div style={{ padding: "0 20px 16px" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>This week</div>
        <div style={{
          padding: 16, borderRadius: 20,
          background: "#FFFFFF",
          border: "1px solid #EDE4D5",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 28px -12px rgba(26,20,16,0.18)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 8 }}>
            {dayTotals.map((d, idx) => {
              const barH = maxBar > 0 ? (d.cal / maxBar) * 64 : 0;
              const isToday = idx === todayIdx;
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: "100%", height: barH || 4, borderRadius: 6,
                    background: isToday ? "#C8FF3E" : "#FF6B4A",
                    opacity: d.cal === 0 ? 0.2 : 1,
                    transition: "height 0.3s ease",
                    border: isToday ? "1.5px solid #1A1410" : "none",
                  }} />
                </div>
              );
            })}
          </div>
          {/* Goal line label */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, borderTop: "1.5px dashed #EDE4D5" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "#9C9087", textTransform: "uppercase" }}>
              {calorieGoal.toLocaleString()} kcal goal
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {DAYS_SHORT.map((d, idx) => (
              <div key={d} style={{ flex: 1, textAlign: "center" }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase",
                  color: idx === todayIdx ? "#1A1410" : "#9C9087",
                  fontWeight: idx === todayIdx ? 600 : 400,
                }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly average */}
      <div style={{ padding: "0 20px 16px" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Weekly average</div>
        <div style={{
          padding: 16, borderRadius: 20,
          background: "#FFFFFF",
          border: "1px solid #EDE4D5",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 28px -12px rgba(26,20,16,0.18)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 999,
              border: "6px solid #FF6B4A",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, lineHeight: 1, color: "#1A1410" }}>
                  {weeklyAvg.cal >= 1000 ? `${(weeklyAvg.cal / 1000).toFixed(1)}k` : weeklyAvg.cal}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9C9087" }}>kcal</div>
              </div>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { val: weeklyAvg.protein, lab: "Protein", color: "#FF6B4A" },
                { val: weeklyAvg.carbs, lab: "Carbs", color: "#FFD66B" },
                { val: weeklyAvg.fat, lab: "Fat", color: "#4A2B5C" },
              ].map(({ val, lab, color }) => (
                <div key={lab} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color }}>
                    {val}<span style={{ fontSize: 10, color: "#9C9087", fontWeight: 400 }}>g</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9C9087" }}>{lab}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MacroBar label="Protein" val={weeklyAvg.protein} target={targetProtein} color="#FF6B4A" />
            <MacroBar label="Carbs" val={weeklyAvg.carbs} target={targetCarbs} color="#FFD66B" />
            <MacroBar label="Fat" val={weeklyAvg.fat} target={targetFat} color="#4A2B5C" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
