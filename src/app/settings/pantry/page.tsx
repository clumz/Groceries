"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { STAPLE_GROUPS, DEFAULT_STAPLES } from "@/lib/pantryManager";
import { BottomNav } from "@/components/ui/BottomNav";
import { ChevronLeft, Plus, Trash2, RotateCcw } from "lucide-react";
import { clsx } from "clsx";

export default function PantrySettingsPage() {
  const router = useRouter();
  const stapleIngredients = useAppStore((s) => s.stapleIngredients);
  const pantryItems = useAppStore((s) => s.pantryItems);
  const toggleStaple = useAppStore((s) => s.toggleStaple);
  const clearPantryItem = useAppStore((s) => s.clearPantryItem);
  const adjustPantryItem = useAppStore((s) => s.adjustPantryItem);
  const set = useAppStore.setState;

  const [customInput, setCustomInput] = useState("");
  const [activeTab, setActiveTab] = useState<"staples" | "pantry">("staples");

  function addCustomStaple() {
    const val = customInput.trim().toLowerCase();
    if (!val) return;
    if (!stapleIngredients.includes(val)) toggleStaple(val);
    setCustomInput("");
  }

  function resetToDefaults() {
    set({ stapleIngredients: DEFAULT_STAPLES, currentCart: null });
  }

  return (
    <div className="min-h-screen bg-plate-bg pb-24">
      <div className="bg-plate-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-plate-line">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-plate-surface-tertiary text-plate-ink-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-plate-ink">Kitchen & Pantry</h1>
        </div>

        <div className="flex gap-1 mt-4 bg-plate-surface-tertiary rounded-xl p-1">
          {(["staples", "pantry"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab ? "bg-plate-surface text-plate-ink shadow-sm" : "text-plate-ink-2"
              )}
            >
              {tab === "staples" ? "Kitchen Staples" : `Pantry Stock${pantryItems.length > 0 ? ` (${pantryItems.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {activeTab === "staples" && (
          <>
            <p className="text-sm text-plate-ink-2 px-1">
              Toggle ingredients you always have at home. These are excluded from your cart and estimated cost.
            </p>

            {STAPLE_GROUPS.map((group) => (
              <div key={group.label} className="bg-plate-surface rounded-3xl overflow-hidden shadow-card">
                <div className="px-4 py-3 border-b border-plate-line">
                  <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider">{group.label}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.items.map((item) => {
                    const active = stapleIngredients.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleStaple(item)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-plate-surface-tertiary transition-colors text-left"
                      >
                        <span className={clsx("text-sm capitalize", active ? "text-plate-ink font-medium" : "text-plate-ink-2")}>{item}</span>
                        <div className={clsx("w-11 h-6 rounded-full transition-colors relative flex-shrink-0", active ? "bg-plate-ink" : "bg-slate-200")}>
                          <div className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-plate-surface shadow transition-all duration-150", active ? "left-[calc(100%-1.375rem)]" : "left-0.5")} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="bg-plate-surface rounded-3xl shadow-card px-4 py-4">
              <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider mb-3">Add Custom Staple</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomStaple()}
                  placeholder="e.g. curry leaves"
                  className="flex-1 bg-plate-bg rounded-xl px-3 py-2.5 text-sm text-plate-ink placeholder-ink-tertiary outline-none focus:ring-2 focus:ring-plate-lime"
                />
                <button
                  onClick={addCustomStaple}
                  className="w-10 h-10 rounded-xl bg-plate-ink text-white flex items-center justify-center flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {stapleIngredients.filter((s) => !STAPLE_GROUPS.flatMap((g) => g.items).includes(s)).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stapleIngredients
                    .filter((s) => !STAPLE_GROUPS.flatMap((g) => g.items).includes(s))
                    .map((s) => (
                      <span key={s} className="flex items-center gap-1.5 bg-plate-lime/10 text-plate-ink text-xs font-medium px-3 py-1.5 rounded-full">
                        {s}
                        <button onClick={() => toggleStaple(s)}><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={resetToDefaults}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-plate-line text-sm text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </button>
          </>
        )}

        {activeTab === "pantry" && (
          <>
            <p className="text-sm text-plate-ink-2 px-1">
              Carry-forward stock from previous orders. We'll deduct these from your next cart.
            </p>

            {pantryItems.length === 0 ? (
              <div className="bg-plate-surface rounded-3xl shadow-card px-5 py-12 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">🧺</span>
                <p className="font-semibold text-plate-ink">No pantry stock yet</p>
                <p className="text-sm text-plate-ink-2">
                  After your first order is placed, leftover stock from purchased items will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-plate-surface rounded-3xl overflow-hidden shadow-card divide-y divide-slate-100">
                {pantryItems.map((p) => (
                  <div key={p.ingredientName} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-plate-ink capitalize">{p.ingredientName}</p>
                      <p className="text-xs text-plate-ink-3 mt-0.5">
                        Added {new Date(p.addedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={p.quantity.toFixed(1)}
                        onChange={(e) => adjustPantryItem(p.ingredientName, parseFloat(e.target.value) || 0)}
                        className="w-16 text-right bg-plate-bg rounded-lg px-2 py-1.5 text-sm text-plate-ink outline-none focus:ring-2 focus:ring-plate-lime"
                      />
                      <span className="text-xs text-plate-ink-3 w-6">{p.unit}</span>
                      <button
                        onClick={() => clearPantryItem(p.ingredientName)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-plate-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
