"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  Sun, Moon, Monitor, ChevronRight, Leaf, User, MapPin,
  Trash2, RotateCcw, ExternalLink, Users, Clock, DollarSign,
  UtensilsCrossed, ChevronDown, Check, Flame
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", checked ? "bg-plate-lime" : "bg-slate-200")}
    >
      <div className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-plate-surface shadow transition-all duration-150", checked ? "left-[calc(100%-1.375rem)]" : "left-0.5")} />
    </button>
  );
}

function SettingsRow({
  icon, label, value, onPress, danger, rightEl,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress && !rightEl}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
        onPress ? "hover:bg-plate-surface-tertiary/60 active:bg-plate-surface-tertiary" : "cursor-default",
        danger ? "text-red-500" : "text-plate-ink"
      )}
    >
      <span className={clsx("flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center", danger ? "bg-red-50 text-red-500" : "bg-plate-surface-tertiary text-plate-ink-secondary")}>
        {icon}
      </span>
      <span className={clsx("flex-1 text-sm font-medium", danger ? "text-red-500" : "text-plate-ink")}>{label}</span>
      {rightEl ?? (
        value !== undefined ? (
          <span className="text-xs text-plate-ink-tertiary mr-1">{value}</span>
        ) : null
      )}
      {onPress && <ChevronRight className={clsx("w-4 h-4 flex-shrink-0", danger ? "text-red-400" : "text-plate-ink-tertiary")} />}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-plate-ink-tertiary uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="bg-plate-surface rounded-3xl overflow-hidden shadow-card divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
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

  return (
    <div className="min-h-screen bg-plate-bg pb-24">
      {/* Header */}
      <div className="bg-plate-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-plate-line">
        <h1 className="text-2xl font-bold text-plate-ink" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Appearance */}
        <SectionCard title="Appearance">
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-plate-ink-tertiary uppercase tracking-wider mb-3">Theme</p>
            <div className="flex gap-2">
              {([
                { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
                { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
                { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
              ] as const).map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={clsx(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-xs font-medium transition-all",
                    theme === value
                      ? "border-plate-ink bg-plate-lime/20 text-plate-ink"
                      : "border-plate-line text-plate-ink-secondary hover:border-slate-300"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Nutrition */}
        <SectionCard title="Nutrition">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-plate-ink">Track calories &amp; macros</p>
              <p className="text-xs text-plate-ink-tertiary mt-0.5">See daily progress on your plan</p>
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
          </div>

          {preferences.calorieGoal != null && (
            <div className="px-4 pb-5 space-y-5 border-t border-plate-line">
              {/* Calorie slider */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-plate-ink-tertiary uppercase tracking-wider">Daily calories</span>
                  <span className="text-sm font-bold text-plate-coral">{localCalorie.toLocaleString()} kcal</span>
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
                />
                <div className="flex justify-between text-[10px] text-plate-ink-tertiary">
                  <span>1,200 Light</span>
                  <span>2,000 Standard</span>
                  <span>3,500 Active</span>
                </div>
              </div>

              {/* Macro sliders */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-plate-ink-tertiary uppercase tracking-wider">Macro split</span>

                {([
                  { key: "protein" as const, label: "Protein", pct: localProtein, color: "accent-[#C8FF3E]", textColor: "text-plate-coral", min: 10, max: 60, hint: "0.8–2g per kg body weight" },
                  { key: "carbs" as const, label: "Carbohydrates", pct: localCarbs, color: "accent-amber-500", textColor: "text-amber-500", min: 10, max: 70, hint: "Low carb: under 25% · Balanced: 40–50%" },
                  { key: "fat" as const, label: "Fat", pct: localFat, color: "accent-rose-500", textColor: "text-rose-500", min: 10, max: 60, hint: "Essential fats: 20–35%" },
                ]).map(({ key, label, pct, color, textColor, min, max, hint }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-plate-ink">{label}</span>
                      <span className={clsx("text-xs font-bold", textColor)}>{pct}%</span>
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
                      className={clsx("w-full", color)}
                    />
                    <p className="text-[10px] text-plate-ink-tertiary">{hint}</p>
                  </div>
                ))}

                {/* Macro bar */}
                <div className="space-y-1.5">
                  <div className="flex h-3 rounded-full overflow-hidden gap-px">
                    <div className="bg-plate-lime/200 transition-all" style={{ width: `${localProtein}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${localCarbs}%` }} />
                    <div className="bg-rose-400 transition-all" style={{ width: `${localFat}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-plate-coral font-medium">P {localProtein}%</span>
                    <span className="text-amber-500 font-medium">C {localCarbs}%</span>
                    <span className="text-rose-500 font-medium">F {localFat}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Meal Planning */}
        <SectionCard title="Meal Planning">
          {/* Store toggle */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-plate-ink">Preferred store</span>
            <div className="flex rounded-xl overflow-hidden border border-plate-line text-xs font-medium">
              {(["woolworths", "coles"] as const).map((store) => (
                <button
                  key={store}
                  onClick={() => updatePreferences({ preferredStore: store })}
                  className={clsx(
                    "px-3 py-1.5 capitalize transition-colors",
                    preferences.preferredStore === store
                      ? store === "woolworths" ? "bg-green-600 text-white" : "bg-red-500 text-white"
                      : "text-plate-ink-secondary hover:bg-plate-surface-tertiary"
                  )}
                >
                  {store === "woolworths" ? "Woolies" : "Coles"}
                </button>
              ))}
            </div>
          </div>

          {/* Include lunches */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-plate-ink">Include weekday lunches</span>
            <Toggle checked={preferences.includeLunches} onChange={(v) => updatePreferences({ includeLunches: v })} />
          </div>

          {/* Include snacks */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-plate-ink">Include snacks section</span>
            <Toggle checked={preferences.includeSnacks} onChange={(v) => updatePreferences({ includeSnacks: v })} />
          </div>

          {/* Default servings */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-plate-ink">Default servings</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updatePreferences({ defaultServings: Math.max(1, preferences.defaultServings - 1) })}
                className="w-7 h-7 rounded-full bg-plate-bg border border-plate-line text-plate-ink font-bold text-sm flex items-center justify-center"
              >−</button>
              <span className="text-sm font-bold text-plate-ink w-5 text-center">{preferences.defaultServings}</span>
              <button
                onClick={() => updatePreferences({ defaultServings: Math.min(12, preferences.defaultServings + 1) })}
                className="w-7 h-7 rounded-full bg-plate-bg border border-plate-line text-plate-ink font-bold text-sm flex items-center justify-center"
              >+</button>
            </div>
          </div>

          {/* Weekly budget */}
          <SettingsRow
            icon={<DollarSign className="w-4 h-4" />}
            label="Weekly budget"
            value={BUDGET_LABELS[preferences.budgetRange]}
            onPress={() => setBudgetSheetOpen(true)}
          />

          {/* Cook time */}
          <SettingsRow
            icon={<Clock className="w-4 h-4" />}
            label="Cook time preference"
            value={COOK_TIME_LABELS[preferences.cookTimePreference]}
            onPress={() => setCookTimeSheetOpen(true)}
          />
        </SectionCard>

        {/* Kitchen */}
        <SectionCard title="Kitchen">
          <SettingsRow
            icon={<Leaf className="w-4 h-4" />}
            label="Kitchen staples & pantry stock"
            onPress={() => router.push("/settings/pantry")}
          />
        </SectionCard>

        {/* Taste Profile */}
        <SectionCard title="Taste Profile">
          <SettingsRow
            icon={<User className="w-4 h-4" />}
            label="Dietary requirements"
            value={preferences.dietaryRequirements.length > 0 ? `${preferences.dietaryRequirements.length} active` : "None"}
            onPress={() => router.push("/profile")}
          />
          <SettingsRow
            icon={<UtensilsCrossed className="w-4 h-4" />}
            label="Cuisines & proteins"
            value={preferences.cuisinePreferences.slice(0, 2).join(", ")}
            onPress={() => router.push("/profile")}
          />
        </SectionCard>

        {/* Account */}
        <SectionCard title="Account">
          {/* Location */}
          <div>
            <button
              onClick={() => setLocationExpanded((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-plate-surface-tertiary/60 transition-colors"
            >
              <span className="w-8 h-8 rounded-xl bg-plate-surface-tertiary text-plate-ink-secondary flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-plate-ink text-left">Location</span>
              <span className="text-xs text-plate-ink-tertiary mr-1">{preferences.suburb}</span>
              <ChevronDown className={clsx("w-4 h-4 text-plate-ink-tertiary transition-transform", locationExpanded && "rotate-180")} />
            </button>
            {locationExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-plate-line">
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Suburb"
                  className="w-full mt-3 bg-plate-bg rounded-xl px-3 py-2.5 text-sm text-plate-ink placeholder-ink-tertiary outline-none focus:ring-2 focus:ring-plate-lime"
                />
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="Postcode"
                  maxLength={4}
                  className="w-full bg-plate-bg rounded-xl px-3 py-2.5 text-sm text-plate-ink placeholder-ink-tertiary outline-none focus:ring-2 focus:ring-plate-lime"
                />
                <button
                  onClick={saveLocation}
                  className="w-full py-2.5 rounded-xl bg-plate-lime text-white text-sm font-semibold"
                >
                  Save location
                </button>
              </div>
            )}
          </div>

          <SettingsRow
            icon={<Trash2 className="w-4 h-4" />}
            label="Clear order history"
            onPress={() => setClearHistorySheet(true)}
          />
          <SettingsRow
            icon={<RotateCcw className="w-4 h-4" />}
            label="Reset all data"
            danger
            onPress={() => setResetSheet(true)}
          />
        </SectionCard>

        {/* About */}
        <SectionCard title="About">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span className="flex-1 text-sm font-medium text-plate-ink">Version</span>
            <span className="text-xs text-plate-ink-tertiary">1.0.0</span>
          </div>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-plate-surface-tertiary/60 transition-colors"
          >
            <span className="flex-1 text-sm font-medium text-plate-ink">Privacy policy</span>
            <ExternalLink className="w-4 h-4 text-plate-ink-tertiary" />
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-plate-surface-tertiary/60 transition-colors"
          >
            <span className="flex-1 text-sm font-medium text-plate-ink">Help & feedback</span>
            <ExternalLink className="w-4 h-4 text-plate-ink-tertiary" />
          </a>
        </SectionCard>
      </div>

      <BottomNav />

      {/* Budget sheet */}
      {budgetSheetOpen && (
        <Sheet onClose={() => setBudgetSheetOpen(false)} title="Weekly budget">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { updatePreferences({ budgetRange: opt.value }); setBudgetSheetOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b border-plate-line last:border-0 hover:bg-plate-surface-tertiary/60 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-plate-ink">{opt.label}</p>
                <p className="text-xs text-plate-ink-tertiary">{opt.sublabel}</p>
              </div>
              {preferences.budgetRange === opt.value && <Check className="w-4 h-4 text-plate-coral" />}
            </button>
          ))}
        </Sheet>
      )}

      {/* Cook time sheet */}
      {cookTimeSheetOpen && (
        <Sheet onClose={() => setCookTimeSheetOpen(false)} title="Cook time preference">
          {COOK_TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { updatePreferences({ cookTimePreference: opt.value }); setCookTimeSheetOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b border-plate-line last:border-0 hover:bg-plate-surface-tertiary/60 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-plate-ink">{opt.label}</p>
                <p className="text-xs text-plate-ink-tertiary">{opt.sublabel}</p>
              </div>
              {preferences.cookTimePreference === opt.value && <Check className="w-4 h-4 text-plate-coral" />}
            </button>
          ))}
        </Sheet>
      )}

      {/* Clear history confirmation */}
      {clearHistorySheet && (
        <Sheet onClose={() => setClearHistorySheet(false)} title="Clear order history?">
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-plate-ink-secondary">This will permanently delete all your past orders. Your meal plan and cart won't be affected.</p>
            <button
              onClick={() => { clearOrderHistory(); setClearHistorySheet(false); }}
              className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold text-sm"
            >
              Clear history
            </button>
            <button onClick={() => setClearHistorySheet(false)} className="w-full py-3 text-sm text-plate-ink-secondary">
              Cancel
            </button>
          </div>
        </Sheet>
      )}

      {/* Reset all data confirmation */}
      {resetSheet && (
        <Sheet onClose={() => setResetSheet(false)} title="Reset all data?">
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-plate-ink-secondary">
              This will delete your profile, meal plan, cart, order history, and pantry. You'll restart the onboarding flow. This cannot be undone.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold text-sm"
            >
              Reset everything
            </button>
            <button onClick={() => setResetSheet(false)} className="w-full py-3 text-sm text-plate-ink-secondary">
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[430px] left-1/2 -translate-x-1/2 bg-plate-surface rounded-t-3xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-plate-line flex items-center justify-between">
          <div className="w-10 h-1 rounded-full bg-slate-200 absolute left-1/2 -translate-x-1/2 top-3" />
          <h3 className="font-bold text-plate-ink text-base mt-2">{title}</h3>
          <button onClick={onClose} className="text-plate-ink-tertiary hover:text-plate-ink transition-colors mt-2">
            <ChevronDown className="w-5 h-5 rotate-180" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
