"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  ChevronRight, Leaf, User, MapPin,
  Trash2, RotateCcw, ExternalLink, Users, Clock, DollarSign,
  UtensilsCrossed, ChevronDown, Check, Flame, X
} from "lucide-react";
import { clsx } from "clsx";
import type { BudgetRange, CookTimePreference } from "@/types";

function adjustMacros(
  changed: "protein" | "carbs" | "fat",
  newVal: number,
  current: { proteinPct: number; carbsPct: number; fatPct: number }
): { proteinPct: number; carbsPct: number; fatPct: number } {
  const remaining = 100 - newVal;
  const others = (["protein", "carbs", "fat"] as const).filter((k) => k !== changed);
  const [a, b] = others;
  const aOld = current[`${a}Pct` as keyof typeof current];
  const bOld = current[`${b}Pct` as keyof typeof current];
  const total = (aOld + bOld) || 1;
  let aNew = Math.round((aOld / total) * remaining / 5) * 5;
  aNew = Math.max(10, Math.min(remaining - 10, aNew));
  const bNew = Math.max(10, remaining - aNew);
  return { ...current, [`${changed}Pct`]: newVal, [`${a}Pct`]: aNew, [`${b}Pct`]: bNew } as { proteinPct: number; carbsPct: number; fatPct: number };
}

const BUDGET_OPTIONS: { value: BudgetRange; label: string; sublabel: string }[] = [
  { value: "under-150", label: "Under A$150", sublabel: "Budget-friendly" },
  { value: "150-250", label: "A$150 – 250", sublabel: "Most popular" },
  { value: "250-350", label: "A$250 – 350", sublabel: "Comfortable" },
  { value: "350-plus", label: "A$350+", sublabel: "No limits" },
];

const COOK_TIME_OPTIONS: { value: CookTimePreference; label: string; sublabel: string }[] = [
  { value: "under-20", label: "Under 20 min", sublabel: "Quick & easy" },
  { value: "20-40", label: "20 – 40 min", sublabel: "Balanced" },
  { value: "40-plus", label: "40+ min", sublabel: "Worth the effort" },
];

const BUDGET_LABELS: Record<BudgetRange, string> = {
  "under-150": "Under A$150",
  "150-250": "A$150 – 250",
  "250-350": "A$250 – 350",
  "350-plus": "A$350+",
};

const COOK_TIME_LABELS: Record<CookTimePreference, string> = {
  "under-20": "Under 20 min",
  "20-40": "20 – 40 min",
  "40-plus": "40+ min",
};

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  "dairy-free": "Dairy-Free",
  "nut-free": "Nut-Free",
  halal: "Halal",
  kosher: "Kosher",
  paleo: "Paleo",
  keto: "Keto",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: "1.5px solid #1A1410",
        background: checked ? "#C8FF3E" : "#F1EDE6",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#1A1410",
          transition: "left 0.15s",
          left: checked ? "calc(100% - 21px)" : 3,
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const clearOrderHistory = useAppStore((s) => s.clearOrderHistory);
  const reset = useAppStore((s) => s.reset);

  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [cookTimeSheetOpen, setCookTimeSheetOpen] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [localCalorie, setLocalCalorie] = useState(preferences?.calorieGoal ?? 2000);
  const [localProtein, setLocalProtein] = useState(preferences?.macroGoal?.proteinPct ?? 30);
  const [localCarbs, setLocalCarbs] = useState(preferences?.macroGoal?.carbsPct ?? 40);
  const [localFat, setLocalFat] = useState(preferences?.macroGoal?.fatPct ?? 30);
  const [clearHistorySheet, setClearHistorySheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);
  const [suburb, setSuburb] = useState(preferences?.suburb ?? "");
  const [postcode, setPostcode] = useState(preferences?.postcode ?? "");

  function saveLocation() {
    if (!suburb.trim() || !postcode.trim()) return;
    updatePreferences({ suburb: suburb.trim(), postcode: postcode.trim() });
    setLocationExpanded(false);
  }

  function handleReset() {
    reset();
    router.replace("/onboarding");
  }

  if (!preferences) return null;

  const initials = preferences.suburb
    ? preferences.suburb.slice(0, 2).toUpperCase()
    : "ME";

  return (
    <div style={{ minHeight: "100svh", background: "#FFF8EE", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ padding: "56px 20px 20px" }}>
        <p className="eyebrow" style={{ color: "#FF6B4A", marginBottom: 4 }}>PREFERENCES</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: "#1A1410", lineHeight: 1.1 }}>
          Settings
        </h1>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Profile card — lime sticker */}
        <div style={{
          background: "#C8FF3E",
          border: "1.5px solid #1A1410",
          borderRadius: 22,
          boxShadow: "3px 3px 0 #1A1410",
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#1A1410",
            border: "1.5px solid #1A1410",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#C8FF3E" }}>
              {initials}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#1A1410" }}>
              {preferences.suburb || "Your location"}
            </p>
            <p style={{ fontSize: 13, color: "#1A1410", opacity: 0.7, marginTop: 2 }}>
              {preferences.defaultServings} {preferences.defaultServings === 1 ? "person" : "people"} · {COOK_TIME_LABELS[preferences.cookTimePreference]}
            </p>
          </div>
          <button
            onClick={() => router.push("/profile")}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#1A1410",
              border: "1.5px solid #1A1410",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={16} color="#C8FF3E" />
          </button>
        </div>

        {/* Dietary chips */}
        {(preferences.dietaryRequirements.length > 0 || preferences.cuisinePreferences.length > 0) && (
          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid #1A1410",
            borderRadius: 22,
            boxShadow: "3px 3px 0 #1A1410",
            padding: "14px 16px",
          }}>
            <p className="eyebrow" style={{ color: "#1A1410", opacity: 0.5, marginBottom: 10 }}>TASTE PROFILE</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {preferences.dietaryRequirements.map((d) => (
                <span key={d} style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#1A1410",
                  background: "#FFD66B",
                  border: "1.5px solid #1A1410",
                  borderRadius: 999,
                  padding: "3px 10px",
                  boxShadow: "2px 2px 0 #1A1410",
                }}>
                  {DIETARY_LABELS[d] ?? d}
                </span>
              ))}
              {preferences.cuisinePreferences.map((c) => (
                <span key={c} style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#1A1410",
                  background: "#FFFFFF",
                  border: "1.5px solid #1A1410",
                  borderRadius: 999,
                  padding: "3px 10px",
                  boxShadow: "2px 2px 0 #1A1410",
                  textTransform: "capitalize",
                }}>
                  {c}
                </span>
              ))}
            </div>
            <button
              onClick={() => router.push("/profile")}
              style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 600,
                color: "#FF6B4A",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >
              Edit taste profile →
            </button>
          </div>
        )}

        {/* Nutrition card */}
        <StickerCard label="NUTRITION">
          <RowItem>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Flame size={16} color="#FF6B4A" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Track calories &amp; macros</p>
              <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginTop: 2 }}>Daily progress on your plan</p>
            </div>
            <Toggle
              checked={!!preferences.calorieGoal}
              onChange={(v) => {
                if (v) {
                  updatePreferences({ calorieGoal: localCalorie, macroGoal: { proteinPct: localProtein, carbsPct: localCarbs, fatPct: localFat } });
                } else {
                  updatePreferences({ calorieGoal: null, macroGoal: null });
                }
              }}
            />
          </RowItem>

          {preferences.calorieGoal != null && (
            <div style={{ borderTop: "1px solid #E8E0D5", padding: "16px 0 4px" }}>
              {/* Calorie target */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p className="eyebrow" style={{ color: "#1A1410", opacity: 0.5 }}>DAILY CALORIES</p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#FF6B4A" }}>
                    {localCalorie.toLocaleString()} kcal
                  </span>
                </div>
                <input
                  type="range"
                  min={1200}
                  max={3500}
                  step={50}
                  value={localCalorie}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setLocalCalorie(v);
                    updatePreferences({ calorieGoal: v });
                  }}
                  className="w-full accent-[#C8FF3E]"
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  {["1,200 Light", "2,000 Std", "3,500 Active"].map((t) => (
                    <span key={t} style={{ fontSize: 10, color: "#1A1410", opacity: 0.45 }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Macro split */}
              <div style={{ marginBottom: 8 }}>
                <p className="eyebrow" style={{ color: "#1A1410", opacity: 0.5, marginBottom: 14 }}>MACRO SPLIT</p>

                {([
                  { key: "protein" as const, label: "Protein", pct: localProtein, accent: "#C8FF3E", textColor: "#FF6B4A", min: 10, max: 60 },
                  { key: "carbs" as const, label: "Carbs", pct: localCarbs, accent: "#FFD66B", textColor: "#B8860B", min: 10, max: 70 },
                  { key: "fat" as const, label: "Fat", pct: localFat, accent: "#FF6B4A", textColor: "#CC3A1A", min: 10, max: 60 },
                ]).map(({ key, label, pct, textColor, min, max }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1410" }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: textColor }}>{pct}%</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={5}
                      value={pct}
                      onChange={(e) => {
                        const next = adjustMacros(key, Number(e.target.value), { proteinPct: localProtein, carbsPct: localCarbs, fatPct: localFat });
                        setLocalProtein(next.proteinPct); setLocalCarbs(next.carbsPct); setLocalFat(next.fatPct);
                        updatePreferences({ macroGoal: next });
                      }}
                      className="w-full accent-[#C8FF3E]"
                      style={{ width: "100%" }}
                    />
                  </div>
                ))}

                {/* visual macro bar */}
                <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", border: "1.5px solid #1A1410", marginTop: 8 }}>
                  <div style={{ background: "#C8FF3E", width: `${localProtein}%`, transition: "width 0.2s" }} />
                  <div style={{ background: "#FFD66B", width: `${localCarbs}%`, transition: "width 0.2s" }} />
                  <div style={{ background: "#FF6B4A", width: `${localFat}%`, transition: "width 0.2s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1A1410" }}>P {localProtein}%</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#B8860B" }}>C {localCarbs}%</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#CC3A1A" }}>F {localFat}%</span>
                </div>
              </div>
            </div>
          )}
        </StickerCard>

        {/* Meal Planning card */}
        <StickerCard label="MEAL PLANNING">
          {/* Store toggle */}
          <RowItem>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UtensilsCrossed size={16} color="#1A1410" />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Preferred store</span>
            <div style={{
              display: "flex",
              background: "#FFF8EE",
              border: "1.5px solid #1A1410",
              borderRadius: 999,
              padding: 3,
              gap: 2,
              boxShadow: "2px 2px 0 #1A1410",
            }}>
              {(["woolworths", "coles"] as const).map((store) => (
                <button
                  key={store}
                  onClick={() => updatePreferences({ preferredStore: store })}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    background: preferences.preferredStore === store ? "#1A1410" : "transparent",
                    color: preferences.preferredStore === store ? "#C8FF3E" : "#1A1410",
                  }}
                >
                  {store === "woolworths" ? "Woolies" : "Coles"}
                </button>
              ))}
            </div>
          </RowItem>

          <Divider />

          {/* Include lunches */}
          <RowItem>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Clock size={16} color="#1A1410" />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Weekday lunches</span>
            <Toggle checked={preferences.includeLunches} onChange={(v) => updatePreferences({ includeLunches: v })} />
          </RowItem>

          <Divider />

          {/* Include snacks */}
          <RowItem>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Leaf size={16} color="#1A1410" />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Include snacks</span>
            <Toggle checked={preferences.includeSnacks} onChange={(v) => updatePreferences({ includeSnacks: v })} />
          </RowItem>

          <Divider />

          {/* Servings */}
          <RowItem>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={16} color="#1A1410" />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Default servings</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => updatePreferences({ defaultServings: Math.max(1, preferences.defaultServings - 1) })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#FFF8EE",
                  border: "1.5px solid #1A1410",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#1A1410",
                }}
              >−</button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#1A1410", width: 20, textAlign: "center" }}>
                {preferences.defaultServings}
              </span>
              <button
                onClick={() => updatePreferences({ defaultServings: Math.min(12, preferences.defaultServings + 1) })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#FFF8EE",
                  border: "1.5px solid #1A1410",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#1A1410",
                }}
              >+</button>
            </div>
          </RowItem>

          <Divider />

          {/* Budget */}
          <button
            onClick={() => setBudgetSheetOpen(true)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <RowItem>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DollarSign size={16} color="#1A1410" />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410", textAlign: "left" }}>Weekly budget</span>
              <span style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginRight: 4 }}>{BUDGET_LABELS[preferences.budgetRange]}</span>
              <ChevronRight size={16} color="#1A1410" style={{ opacity: 0.4 }} />
            </RowItem>
          </button>

          <Divider />

          {/* Cook time */}
          <button
            onClick={() => setCookTimeSheetOpen(true)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <RowItem>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={16} color="#1A1410" />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410", textAlign: "left" }}>Cook time</span>
              <span style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginRight: 4 }}>{COOK_TIME_LABELS[preferences.cookTimePreference]}</span>
              <ChevronRight size={16} color="#1A1410" style={{ opacity: 0.4 }} />
            </RowItem>
          </button>
        </StickerCard>

        {/* Kitchen / Pantry */}
        <button
          onClick={() => router.push("/settings/pantry")}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid #1A1410",
            borderRadius: 22,
            boxShadow: "3px 3px 0 #1A1410",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Leaf size={16} color="#1A1410" />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Kitchen staples &amp; pantry</p>
              <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginTop: 2 }}>Manage what you already have</p>
            </div>
            <ChevronRight size={16} color="#1A1410" style={{ opacity: 0.4 }} />
          </div>
        </button>

        {/* Location */}
        <div style={{
          background: "#FFFFFF",
          border: "1.5px solid #1A1410",
          borderRadius: 22,
          boxShadow: "3px 3px 0 #1A1410",
          overflow: "hidden",
        }}>
          <button
            onClick={() => setLocationExpanded((v) => !v)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={16} color="#1A1410" />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410", textAlign: "left" }}>Location</span>
            <span style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginRight: 4 }}>{preferences.suburb}</span>
            <ChevronDown size={16} color="#1A1410" style={{ opacity: 0.4, transform: locationExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
          </button>
          {locationExpanded && (
            <div style={{ borderTop: "1px solid #E8E0D5", padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="Suburb"
                style={{
                  background: "#FFF8EE",
                  border: "1.5px solid #1A1410",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#1A1410",
                  outline: "none",
                  fontFamily: "inherit",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Postcode"
                maxLength={4}
                style={{
                  background: "#FFF8EE",
                  border: "1.5px solid #1A1410",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#1A1410",
                  outline: "none",
                  fontFamily: "inherit",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={saveLocation}
                style={{
                  background: "#C8FF3E",
                  border: "1.5px solid #1A1410",
                  borderRadius: 999,
                  padding: "10px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  color: "#1A1410",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 #1A1410",
                }}
              >
                Save location
              </button>
            </div>
          )}
        </div>

        {/* About */}
        <div style={{
          background: "#FFFFFF",
          border: "1.5px solid #1A1410",
          borderRadius: 22,
          boxShadow: "3px 3px 0 #1A1410",
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Version</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1A1410", opacity: 0.5 }}>1.0.0</span>
          </div>
          <div style={{ height: 1, background: "#E8E0D5", margin: "0 18px" }} />
          <a href="#" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Privacy policy</span>
            <ExternalLink size={14} color="#1A1410" style={{ opacity: 0.4 }} />
          </a>
          <div style={{ height: 1, background: "#E8E0D5", margin: "0 18px" }} />
          <a href="#" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Help &amp; feedback</span>
            <ExternalLink size={14} color="#1A1410" style={{ opacity: 0.4 }} />
          </a>
        </div>

        {/* Danger zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          <button
            onClick={() => setClearHistorySheet(true)}
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #1A1410",
              borderRadius: 16,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              width: "100%",
            }}
          >
            <Trash2 size={16} color="#1A1410" style={{ opacity: 0.6 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1A1410", textAlign: "left" }}>Clear order history</span>
          </button>
          <button
            onClick={() => setResetSheet(true)}
            style={{
              background: "#1A1410",
              border: "1.5px solid #1A1410",
              borderRadius: 16,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              width: "100%",
            }}
          >
            <RotateCcw size={16} color="#FF6B4A" />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#FF6B4A", textAlign: "left", fontFamily: "var(--font-display)" }}>Reset all data</span>
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Budget sheet */}
      {budgetSheetOpen && (
        <Sheet onClose={() => setBudgetSheetOpen(false)} title="Weekly budget">
          {BUDGET_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => { updatePreferences({ budgetRange: opt.value }); setBudgetSheetOpen(false); }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderTop: i > 0 ? "1px solid #E8E0D5" : "none",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginTop: 2 }}>{opt.sublabel}</p>
              </div>
              {preferences.budgetRange === opt.value && <Check size={16} color="#C8FF3E" />}
            </button>
          ))}
        </Sheet>
      )}

      {/* Cook time sheet */}
      {cookTimeSheetOpen && (
        <Sheet onClose={() => setCookTimeSheetOpen(false)} title="Cook time">
          {COOK_TIME_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => { updatePreferences({ cookTimePreference: opt.value }); setCookTimeSheetOpen(false); }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderTop: i > 0 ? "1px solid #E8E0D5" : "none",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginTop: 2 }}>{opt.sublabel}</p>
              </div>
              {preferences.cookTimePreference === opt.value && <Check size={16} color="#C8FF3E" />}
            </button>
          ))}
        </Sheet>
      )}

      {/* Clear history confirmation */}
      {clearHistorySheet && (
        <ConfirmSheet
          title="Clear order history?"
          body="This will permanently delete all your past orders. Your meal plan and cart won't be affected."
          confirmLabel="Clear history"
          onConfirm={() => { clearOrderHistory(); setClearHistorySheet(false); }}
          onClose={() => setClearHistorySheet(false)}
          danger
        />
      )}

      {/* Reset all data confirmation */}
      {resetSheet && (
        <ConfirmSheet
          title="Reset all data?"
          body="This will delete your profile, meal plan, cart, order history, and pantry. You'll restart onboarding. This cannot be undone."
          confirmLabel="Reset everything"
          onConfirm={handleReset}
          onClose={() => setResetSheet(false)}
          danger
        />
      )}
    </div>
  );
}

function StickerCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1.5px solid #1A1410",
      borderRadius: 22,
      boxShadow: "3px 3px 0 #1A1410",
      overflow: "hidden",
      padding: "14px 16px",
    }}>
      <p className="eyebrow" style={{ color: "#1A1410", opacity: 0.5, marginBottom: 14 }}>{label}</p>
      {children}
    </div>
  );
}

function RowItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#E8E0D5", margin: "12px 0" }} />;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 430,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        border: "1.5px solid #1A1410",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "#E8E0D5" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 12px", borderBottom: "1px solid #E8E0D5" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#1A1410" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color="#1A1410" style={{ opacity: 0.5 }} />
          </button>
        </div>
        {children}
        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
}

function ConfirmSheet({ title, body, confirmLabel, onConfirm, onClose, danger }: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div style={{ padding: "16px 20px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.7, lineHeight: 1.5 }}>{body}</p>
        <button
          onClick={onConfirm}
          style={{
            background: danger ? "#1A1410" : "#C8FF3E",
            border: "1.5px solid #1A1410",
            borderRadius: 999,
            padding: "14px 0",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: danger ? "#FF6B4A" : "#1A1410",
            cursor: "pointer",
            boxShadow: "2px 2px 0 #1A1410",
            width: "100%",
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", padding: "10px 0", fontSize: 14, color: "#1A1410", opacity: 0.5, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
