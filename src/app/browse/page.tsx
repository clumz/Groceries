"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe } from "@/types";
import { BottomNav } from "@/components/ui/BottomNav";
import { Badge } from "@/components/ui/Badge";
import { Clock, Search, X } from "lucide-react";
import { clsx } from "clsx";

const CUISINE_LABELS: Record<string, string> = {
  all: "All", italian: "Italian", indian: "Indian", thai: "Thai",
  mexican: "Mexican", asian: "Asian", greek: "Greek",
  australian: "Australian", "middle-eastern": "Middle Eastern",
  japanese: "Japanese", mediterranean: "Mediterranean",
};

const PROTEIN_LABELS: Record<string, string> = {
  all: "All proteins", chicken: "Chicken", beef: "Beef", lamb: "Lamb",
  pork: "Pork", seafood: "Seafood", tofu: "Plant-based", eggs: "Eggs",
};

const FOOD_IMAGES: Record<string, string> = {
  italian: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&q=70",
  asian: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=70",
  mediterranean: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=70",
  mexican: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=70",
  "middle-eastern": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&q=70",
  indian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=70",
  australian: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=70",
  japanese: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=70",
  thai: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=70",
  greek: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=70",
};

export default function BrowsePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [protein, setProtein] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const LIMIT = 30;

  function buildUrl(q: string, c: string, p: string, d: string, offset = 0) {
    const params = new URLSearchParams({ limit: String(LIMIT), seed: "42" });
    if (q) params.set("q", q);
    if (c !== "all") params.set("cuisine", c);
    if (p !== "all") params.set("protein", p);
    if (d !== "all") params.set("difficulty", d);
    if (offset > 0) params.set("offset", String(offset));
    return `/api/recipes?${params}`;
  }

  async function fetchRecipes(q: string, c: string, p: string, d: string) {
    setLoading(true);
    offsetRef.current = 0;
    try {
      const res = await fetch(buildUrl(q, c, p, d));
      const data = await res.json();
      setRecipes(data.recipes ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    const newOffset = offsetRef.current + LIMIT;
    offsetRef.current = newOffset;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(query, cuisine, protein, difficulty, newOffset));
      const data = await res.json();
      setRecipes((prev) => [...prev, ...(data.recipes ?? [])]);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchRecipes(query, cuisine, protein, difficulty);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuisine, protein, difficulty]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRecipes(val, cuisine, protein, difficulty), 300);
  }

  return (
    <div className="min-h-screen bg-plate-bg pb-24">
      {/* Header */}
      <div className="bg-plate-surface px-4 pt-14 pb-3 sticky top-0 z-10 border-b border-plate-line space-y-3">
        <h1 className="text-2xl font-bold text-plate-ink">Browse Recipes</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plate-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search recipes…"
            className="w-full bg-plate-bg rounded-xl pl-9 pr-9 py-2.5 text-sm text-plate-ink placeholder-ink-tertiary outline-none focus:ring-2 focus:ring-plate-lime"
          />
          {query && (
            <button onClick={() => handleQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-plate-ink-3" />
            </button>
          )}
        </div>

        {/* Cuisine filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
          {Object.entries(CUISINE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCuisine(key)}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                cuisine === key ? "bg-plate-ink border-plate-ink text-white" : "bg-plate-surface border-plate-line text-plate-ink-2"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Protein + difficulty filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
          {Object.entries(PROTEIN_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setProtein(key)}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                protein === key ? "bg-slate-800 border-slate-800 text-white" : "bg-plate-surface border-plate-line text-plate-ink-2"
              )}
            >
              {label}
            </button>
          ))}
          {["easy", "medium", "hard"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? "all" : d)}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all whitespace-nowrap",
                difficulty === d ? "bg-orange-500 border-orange-500 text-white" : "bg-plate-surface border-plate-line text-plate-ink-2"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Results count */}
        {!loading && (
          <p className="text-xs text-plate-ink-3 mb-3">{total} recipe{total !== 1 ? "s" : ""}</p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-plate-surface rounded-2xl overflow-hidden shadow-card">
                <div className="h-32 bg-slate-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recipe grid */}
        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {recipes.map((recipe) => (
                <RecipeBrowseCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => router.push(`/recipe/${recipe.id}`)}
                />
              ))}
            </div>

            {recipes.length === 0 && !loading && (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <span className="text-4xl">🍽️</span>
                <p className="font-semibold text-plate-ink">No recipes found</p>
                <p className="text-sm text-plate-ink-2">Try a different search term or clear your filters</p>
                {(cuisine !== "all" || protein !== "all" || difficulty !== "all" || query) && (
                  <button
                    onClick={() => { setQuery(""); setCuisine("all"); setProtein("all"); setDifficulty("all"); }}
                    className="mt-2 px-4 py-2 rounded-full bg-plate-ink text-plate-bg text-xs font-semibold"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {recipes.length < total && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full mt-4 py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load more (${total - recipes.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function RecipeBrowseCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const image = FOOD_IMAGES[recipe.cuisine] ?? FOOD_IMAGES.australian;
  const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;
  return (
    <button onClick={onClick} className="bg-plate-surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow text-left">
      <div className="relative h-32 overflow-hidden">
        <img src={image} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-2">
          <Badge variant={recipe.difficulty === "easy" ? "green" : recipe.difficulty === "medium" ? "orange" : "red"} className="text-[10px] capitalize">
            {recipe.difficulty}
          </Badge>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-plate-ink leading-snug line-clamp-2">{recipe.name}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-3 h-3 text-plate-ink-3" />
          <span className="text-[10px] text-plate-ink-3">{totalTime}m</span>
          <span className="text-plate-ink-3/40 mx-1">·</span>
          <span className="text-[10px] text-plate-ink-3 capitalize">{recipe.cuisine}</span>
        </div>
      </div>
    </button>
  );
}
