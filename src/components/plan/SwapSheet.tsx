"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { PlannedMeal, Recipe } from "@/types";
import { X, Clock, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const CUISINE_LABELS: Record<string, string> = {
  italian: "Italian",
  indian: "Indian",
  thai: "Thai",
  mexican: "Mexican",
  asian: "Asian",
  greek: "Greek",
  australian: "Australian",
  "middle-eastern": "Middle Eastern",
  japanese: "Japanese",
  mediterranean: "Mediterranean",
};

const CUISINE_IMAGES: Record<string, string> = {
  italian: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&q=70",
  asian: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=300&q=70",
  mediterranean: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=70",
  mexican: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&q=70",
  "middle-eastern": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=300&q=70",
  indian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=70",
  australian: "https://images.unsplash.com/photo-1558030006-450675393462?w=300&q=70",
  japanese: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=70",
  thai: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=300&q=70",
  greek: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=300&q=70",
};

const ALL_CUISINES = Object.keys(CUISINE_LABELS);

interface SwapSheetProps {
  meal: PlannedMeal;
  onClose: () => void;
}

export function SwapSheet({ meal, onClose }: SwapSheetProps) {
  const swapMeal = useAppStore((s) => s.swapMeal);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef<Map<string, Recipe[]>>(new Map());

  async function loadRecipes(cuisine: string | null) {
    const cacheKey = cuisine ?? "all";
    if (cache.current.has(cacheKey)) {
      setRecipes(cache.current.get(cacheKey)!);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40", exclude: meal.recipe.id });
      if (cuisine) params.set("cuisine", cuisine);
      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      cache.current.set(cacheKey, data.recipes);
      setRecipes(data.recipes);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCuisineSelect(cuisine: string | null) {
    setSelectedCuisine(cuisine);
    loadRecipes(cuisine);
  }

  function handleSwap(recipe: Recipe) {
    const newMeal: PlannedMeal = {
      id: meal.id,
      dayIndex: meal.dayIndex,
      mealType: meal.mealType,
      recipe: { ...recipe, servings: meal.servings },
      servings: meal.servings,
    };
    swapMeal(meal.id, newMeal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-[430px] left-1/2 -translate-x-1/2 bg-white rounded-t-3xl flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">Swap meal</h2>
            <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-1">
              Replacing: {meal.recipe.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4 text-ink-secondary" />
          </button>
        </div>

        {/* Cuisine filter */}
        <div className="flex-shrink-0 px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            <CuisineChip label="All" active={selectedCuisine === null} onClick={() => handleCuisineSelect(null)} />
            {ALL_CUISINES.map((c) => (
              <CuisineChip
                key={c}
                label={CUISINE_LABELS[c]}
                active={selectedCuisine === c}
                onClick={() => handleCuisineSelect(c)}
              />
            ))}
          </div>
        </div>

        {/* Recipe list */}
        <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-1">
          {loading && <SkeletonList />}

          {!loading && recipes.length === 0 && (
            <p className="text-center text-ink-tertiary text-sm py-10">
              No {selectedCuisine ? (CUISINE_LABELS[selectedCuisine] ?? selectedCuisine) : ""} recipes available
            </p>
          )}

          {!loading && recipes.map((recipe) => {
            const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;
            const image = CUISINE_IMAGES[recipe.cuisine] ?? CUISINE_IMAGES.australian;
            return (
              <button
                key={recipe.id}
                onClick={() => handleSwap(recipe)}
                className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
              >
                <img
                  src={image}
                  alt={recipe.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink leading-snug">{recipe.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-ink-tertiary capitalize">{CUISINE_LABELS[recipe.cuisine] ?? recipe.cuisine}</span>
                    <span className="text-ink-tertiary/40 text-xs">·</span>
                    <Clock className="w-3 h-3 text-ink-tertiary" />
                    <span className="text-xs text-ink-tertiary">{totalTime}m</span>
                    {recipe.difficulty === "easy" && (
                      <>
                        <span className="text-ink-tertiary/40 text-xs">·</span>
                        <span className="text-xs text-brand-600">Easy</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-1">{recipe.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-tertiary flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-16 h-16 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
          </div>
        </div>
      ))}
    </>
  );
}

function CuisineChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-shrink-0 px-3.5 py-1.5 rounded-2xl text-sm font-medium border transition-all duration-150 whitespace-nowrap",
        active
          ? "bg-brand-600 border-brand-600 text-white"
          : "bg-white border-slate-200 text-ink-secondary hover:border-brand-300"
      )}
    >
      {label}
    </button>
  );
}
