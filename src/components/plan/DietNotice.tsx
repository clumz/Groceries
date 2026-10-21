"use client";

import type { UserPreferences, WeeklyMealPlan } from "@/types";
import { isDietSupported } from "@/lib/dietCompliance";

const LABELS: Record<string, string> = { "low-fodmap": "Low-FODMAP", "diabetic-friendly": "diabetic-friendly" };

/** Explains when diets shrink the week, or can't be checked at all. */
export function DietNotice({ plan, preferences }: { plan: WeeklyMealPlan; preferences: UserPreferences }) {
  const expected = 7 + (preferences.includeLunches ? 5 : 0);
  const planned = plan.meals.length;
  const unsupported = preferences.dietaryRequirements.filter((d) => !isDietSupported(d));
  const shortfall = planned < expected && preferences.dietaryRequirements.length > 0;
  if (!shortfall && unsupported.length === 0) return null;

  return (
    <div style={{ margin: "0 20px 16px", padding: "12px 14px", borderRadius: 16, border: "1.5px solid #1A1410", background: "#FFF8EE", fontSize: 13, lineHeight: 1.45, color: "#1A1410" }}>
      {shortfall && (
        <p style={{ margin: 0 }}>
          Only <strong>{planned} of {expected}</strong> meals this week suit your dietary requirements. We&apos;d rather
          plan fewer meals than suggest something you can&apos;t eat.
        </p>
      )}
      {unsupported.length > 0 && (
        <p style={{ margin: shortfall ? "8px 0 0" : 0 }}>
          We can&apos;t check recipes for {unsupported.map((d) => LABELS[d] ?? d).join(" or ")} yet, so please check
          ingredients yourself.
        </p>
      )}
    </div>
  );
}
