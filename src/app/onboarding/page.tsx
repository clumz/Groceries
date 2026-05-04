"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { UserPreferences, StorePreference, DietaryRequirement, CuisinePreference, ProteinPreference, BudgetRange, CookTimePreference } from "@/types";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import { Check, ChevronRight, ShoppingBag, Clock } from "lucide-react";

const TOTAL_STEPS = 8;

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

const DIETARY_OPTIONS: { value: DietaryRequirement; label: string }[] = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "nut-free", label: "Nut-Free" },
  { value: "low-fodmap", label: "Low-FODMAP" },
  { value: "diabetic-friendly", label: "Diabetic-Friendly" },
];

const CUISINE_OPTIONS: { value: CuisinePreference; label: string; emoji: string }[] = [
  { value: "italian", label: "Italian", emoji: "🍝" },
  { value: "asian", label: "Asian", emoji: "🍜" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { value: "mexican", label: "Mexican", emoji: "🌮" },
  { value: "middle-eastern", label: "Middle Eastern", emoji: "🧆" },
  { value: "indian", label: "Indian", emoji: "🍛" },
  { value: "australian", label: "Australian", emoji: "🥩" },
  { value: "japanese", label: "Japanese", emoji: "🍱" },
  { value: "thai", label: "Thai", emoji: "🍲" },
  { value: "greek", label: "Greek", emoji: "🥗" },
];

const PROTEIN_OPTIONS: { value: ProteinPreference; label: string; emoji: string }[] = [
  { value: "chicken", label: "Chicken", emoji: "🐔" },
  { value: "beef", label: "Beef", emoji: "🥩" },
  { value: "lamb", label: "Lamb", emoji: "🐑" },
  { value: "pork", label: "Pork", emoji: "🐷" },
  { value: "seafood", label: "Seafood", emoji: "🐟" },
  { value: "tofu", label: "Tofu / Plant-Based", emoji: "🌱" },
  { value: "eggs", label: "Eggs", emoji: "🥚" },
  { value: "no-preference", label: "No Preference", emoji: "✨" },
];

const TASTE_RECIPES: {
  id: string;
  name: string;
  cuisine: string;
  protein: string;
  cookTime: number;
  image: string;
}[] = [
  { id: "chicken-tikka-masala", name: "Chicken Tikka Masala", cuisine: "Indian", protein: "chicken", cookTime: 40, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80" },
  { id: "spaghetti-bolognese", name: "Spaghetti Bolognese", cuisine: "Italian", protein: "beef", cookTime: 45, image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&q=80" },
  { id: "thai-green-curry", name: "Thai Green Curry", cuisine: "Thai", protein: "chicken", cookTime: 25, image: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=80" },
  { id: "beef-tacos", name: "Smoky Beef Tacos", cuisine: "Mexican", protein: "beef", cookTime: 20, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80" },
  { id: "salmon-traybake", name: "Lemon Herb Salmon", cuisine: "Australian", protein: "seafood", cookTime: 30, image: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80" },
  { id: "greek-lamb-salad", name: "Greek Lamb Salad", cuisine: "Greek", protein: "lamb", cookTime: 20, image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80" },
  { id: "pork-stir-fry", name: "Pork Stir-Fry Noodles", cuisine: "Asian", protein: "pork", cookTime: 20, image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80" },
  { id: "lamb-kofta", name: "Lamb Kofta & Hummus", cuisine: "Middle Eastern", protein: "lamb", cookTime: 30, image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&q=80" },
  { id: "mushroom-risotto", name: "Mushroom Risotto", cuisine: "Italian", protein: "vegetarian", cookTime: 35, image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80" },
  { id: "chicken-schnitzel", name: "Chicken Schnitzel", cuisine: "Australian", protein: "chicken", cookTime: 25, image: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&q=80" },
  { id: "teriyaki-salmon", name: "Teriyaki Salmon Bowl", cuisine: "Japanese", protein: "seafood", cookTime: 20, image: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80" },
  { id: "butter-chicken", name: "Butter Chicken", cuisine: "Indian", protein: "chicken", cookTime: 35, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80" },
];

function MultiSelectPill<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string; emoji?: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium border transition-all duration-150 select-none",
              active
                ? "bg-plate-ink border-plate-ink text-white"
                : "bg-plate-surface border-plate-line text-plate-ink-2 hover:border-plate-lime"
            )}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            {opt.label}
            {active && <Check className="w-3 h-3 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

function RadioCard<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-150",
            value === opt.value
              ? "bg-plate-lime/10 border-plate-lime text-plate-ink"
              : "bg-plate-surface border-plate-line text-plate-ink-2 hover:border-plate-line"
          )}
        >
          <div
            className={clsx(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              value === opt.value ? "border-plate-ink" : "border-plate-line"
            )}
          >
            {value === opt.value && (
              <div className="w-2.5 h-2.5 rounded-full bg-plate-ink" />
            )}
          </div>
          <div>
            <div className="font-medium text-sm">{opt.label}</div>
            {opt.description && (
              <div className="text-xs text-plate-ink-3 mt-0.5">{opt.description}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const addFeedback = useAppStore((s) => s.addFeedback);
  const [step, setStep] = useState(0);

  const [store, setStore] = useState<StorePreference>("woolworths");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [postcodeError, setPostcodeError] = useState("");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [dietary, setDietary] = useState<DietaryRequirement[]>([]);
  const [cuisines, setCuisines] = useState<CuisinePreference[]>([]);
  const [proteins, setProteins] = useState<ProteinPreference[]>([]);
  const [likedRecipes, setLikedRecipes] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [servings, setServings] = useState(2);
  const [budget, setBudget] = useState<BudgetRange>("150-250");
  const [cookTime, setCookTime] = useState<CookTimePreference>("20-40");
  const [includeLunches, setIncludeLunches] = useState(false);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [trackNutrition, setTrackNutrition] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);

  function isValidAustralianPostcode(pc: string): boolean {
    if (pc.length !== 4) return false;
    const n = parseInt(pc, 10);
    return (
      (n >= 1000 && n <= 2999) ||
      (n >= 3000 && n <= 3999) ||
      (n >= 4000 && n <= 4999) ||
      (n >= 5000 && n <= 5999) ||
      (n >= 6000 && n <= 6999) ||
      (n >= 7000 && n <= 7999) ||
      (n >= 800  && n <= 999)
    );
  }

  async function handlePostcodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPostcode(digits);
    setPostcodeError("");
    if (digits.length === 4) {
      if (!isValidAustralianPostcode(digits)) {
        setPostcodeError("Please enter a valid Australian postcode");
        return;
      }
      setPostcodeLoading(true);
      try {
        const res = await fetch(`https://v0.postcodeapi.com.au/suburbs/${digits}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0 && !suburb) setSuburb(data[0].name);
        }
      } catch { /* silent fail */ } finally {
        setPostcodeLoading(false);
      }
    }
  }

  function toggleDietary(v: DietaryRequirement) {
    setDietary((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]);
  }
  function toggleCuisine(v: CuisinePreference) {
    setCuisines((prev) => prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]);
  }
  function toggleProtein(v: ProteinPreference) {
    setProteins((prev) => prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]);
  }
  function toggleRecipe(id: string) {
    setLikedRecipes((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  function handleFinish() {
    const prefs: UserPreferences = {
      preferredStore: store,
      suburb,
      postcode,
      dietaryRequirements: dietary,
      cuisinePreferences: cuisines,
      proteinPreferences: proteins,
      householdSize,
      defaultServings: servings,
      budgetRange: budget,
      cookTimePreference: cookTime,
      includeLunches,
      includeSnacks,
      calorieGoal: trackNutrition ? calorieGoal : null,
      macroGoal: trackNutrition ? { proteinPct, carbsPct, fatPct } : null,
    };
    completeOnboarding(prefs);

    // Seed feedback history from taste selections
    likedRecipes.forEach((recipeId) => {
      const recipe = TASTE_RECIPES.find((r) => r.id === recipeId);
      if (recipe) {
        addFeedback({
          recipeId,
          recipeName: recipe.name,
          feedback: "thumbs-up",
          timestamp: Date.now(),
          cuisineType: recipe.cuisine.toLowerCase(),
          primaryProtein: recipe.protein,
        });
      }
    });

    router.replace("/plan");
  }

  const canAdvance = [
    postcode.length === 4 && isValidAustralianPostcode(postcode) && !postcodeLoading,
    true, // dietary optional
    cuisines.length > 0,
    proteins.length > 0,
    likedRecipes.length >= 3, // must pick at least 3
    true, // household
    true, // budget + cook time
    true, // nutrition goals optional
  ][step];

  const stepContent = [
    // Step 0: Store + Location
    <div key="step0" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Your supermarket</h2>
        <p className="text-sm text-plate-ink-2">Pick your preferred store for grocery delivery</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["woolworths", "coles"] as StorePreference[]).map((s) => (
          <button
            key={s}
            onClick={() => setStore(s)}
            className={clsx(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 h-28 font-semibold text-sm transition-all duration-150",
              store === s
                ? s === "woolworths"
                  ? "bg-green-50 border-green-500 text-green-800"
                  : "bg-red-50 border-red-400 text-red-800"
                : "bg-plate-surface border-plate-line text-plate-ink-2 hover:border-plate-line"
            )}
          >
            <ShoppingBag className={clsx("w-8 h-8", s === "woolworths" ? "text-green-600" : "text-red-500")} />
            <span className="capitalize">{s}</span>
            {store === s && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
      <p className="text-xs text-plate-ink-3 text-center">Price comparison across both stores coming soon</p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-plate-ink mb-1.5">Suburb</label>
          <input
            type="text"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="e.g. Surry Hills"
            className="w-full px-4 py-3 rounded-2xl border border-plate-line text-sm bg-plate-surface focus:outline-none focus:border-plate-lime focus:ring-1 focus:ring-plate-lime"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-plate-ink mb-1.5">Postcode</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              placeholder="e.g. 2010"
              className={clsx(
                "w-full px-4 py-3 rounded-2xl border text-sm bg-plate-surface focus:outline-none focus:ring-1",
                postcodeError
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                  : postcode.length === 4 && isValidAustralianPostcode(postcode)
                  ? "border-plate-lime focus:border-plate-lime focus:ring-plate-lime"
                  : "border-plate-line focus:border-plate-lime focus:ring-plate-lime"
              )}
            />
            {postcodeLoading && (
              <div className="absolute right-3 top-3.5 w-4 h-4 rounded-full border-2 border-plate-lime border-t-transparent animate-spin" />
            )}
            {!postcodeLoading && postcode.length === 4 && isValidAustralianPostcode(postcode) && (
              <Check className="absolute right-3 top-3.5 w-4 h-4 text-plate-coral" />
            )}
          </div>
          {postcodeError && <p className="text-xs text-red-500 mt-1.5">{postcodeError}</p>}
        </div>
      </div>
    </div>,

    // Step 1: Dietary
    <div key="step1" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Dietary requirements</h2>
        <p className="text-sm text-plate-ink-2">Select all that apply — we'll never suggest something you can't eat</p>
      </div>
      <MultiSelectPill options={DIETARY_OPTIONS} selected={dietary} onToggle={toggleDietary} />
      {dietary.length === 0 && (
        <p className="text-xs text-plate-ink-3 text-center">No restrictions? Just tap Next →</p>
      )}
    </div>,

    // Step 2: Cuisines
    <div key="step2" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Cuisine preferences</h2>
        <p className="text-sm text-plate-ink-2">Pick your favourites — we'll rotate through them each week</p>
      </div>
      <MultiSelectPill options={CUISINE_OPTIONS} selected={cuisines} onToggle={toggleCuisine} />
    </div>,

    // Step 3: Proteins
    <div key="step3" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Protein preferences</h2>
        <p className="text-sm text-plate-ink-2">What proteins do you enjoy?</p>
      </div>
      <MultiSelectPill options={PROTEIN_OPTIONS} selected={proteins} onToggle={toggleProtein} />
    </div>,

    // Step 4: Taste selection (NEW)
    <div key="step4" className="animate-slide-up space-y-5">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Pick dishes you'd love</h2>
        <p className="text-sm text-plate-ink-2">
          Select at least 3 — we use this to personalise your first meal plan
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-plate-ink-3">{likedRecipes.length} selected</span>
        <span className="text-xs font-medium text-plate-coral">
          {likedRecipes.length < 3 ? `${3 - likedRecipes.length} more to go` : "Looking good!"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TASTE_RECIPES.map((recipe) => {
          const selected = likedRecipes.includes(recipe.id);
          return (
            <button
              key={recipe.id}
              onClick={() => toggleRecipe(recipe.id)}
              className={clsx(
                "relative rounded-2xl overflow-hidden text-left transition-all duration-150",
                selected ? "ring-2 ring-plate-lime ring-offset-1" : "ring-0"
              )}
            >
              <div className="relative h-28">
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Selected overlay */}
                {selected && (
                  <div className="absolute inset-0 bg-plate-ink/20 flex items-start justify-end p-2">
                    <div className="w-6 h-6 rounded-full bg-plate-coral flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-xs font-semibold leading-tight">{recipe.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-white/70 text-[10px]">{recipe.cuisine}</span>
                    <span className="text-white/40 text-[10px]">·</span>
                    <Clock className="w-2.5 h-2.5 text-white/70" />
                    <span className="text-white/70 text-[10px]">{recipe.cookTime}m</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>,

    // Step 5: Household
    <div key="step5" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Your household</h2>
        <p className="text-sm text-plate-ink-2">We'll scale recipes and quantities to match</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-plate-ink mb-3">Household size</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))} className="w-10 h-10 rounded-full bg-plate-surface-tertiary text-plate-ink font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors">−</button>
            <span className="text-2xl font-bold text-plate-ink w-8 text-center">{householdSize}</span>
            <button onClick={() => setHouseholdSize(Math.min(10, householdSize + 1))} className="w-10 h-10 rounded-full bg-plate-surface-tertiary text-plate-ink font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors">+</button>
            <span className="text-sm text-plate-ink-2">{householdSize === 1 ? "person" : "people"}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-plate-ink mb-3">Default servings per meal</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 rounded-full bg-plate-surface-tertiary text-plate-ink font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors">−</button>
            <span className="text-2xl font-bold text-plate-ink w-8 text-center">{servings}</span>
            <button onClick={() => setServings(Math.min(12, servings + 1))} className="w-10 h-10 rounded-full bg-plate-surface-tertiary text-plate-ink font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors">+</button>
            <span className="text-sm text-plate-ink-2">servings</span>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[
            { label: "Include weekday lunches", value: includeLunches, set: setIncludeLunches },
            { label: "Include a snacks section", value: includeSnacks, set: setIncludeSnacks },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-sm text-plate-ink">{label}</span>
              <button
                onClick={() => set(!value)}
                className={clsx("w-12 h-6 rounded-full transition-colors relative", value ? "bg-plate-ink" : "bg-slate-200")}
              >
                <span className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-plate-surface shadow transition-transform", value ? "translate-x-6" : "translate-x-0.5")} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,

    // Step 6: Budget + Cook Time
    <div key="step6" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Budget & time</h2>
        <p className="text-sm text-plate-ink-2">We'll keep recommendations practical</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-plate-ink mb-3">Weekly grocery budget</label>
        <RadioCard
          value={budget}
          onChange={setBudget}
          options={[
            { value: "under-150", label: "Under A$150 / week", description: "Budget-conscious, simple meals" },
            { value: "150-250", label: "A$150–250 / week", description: "Great variety, quality ingredients" },
            { value: "250-350", label: "A$250–350 / week", description: "Premium ingredients, minimal compromise" },
            { value: "350-plus", label: "A$350+ / week", description: "Full flexibility, premium cuts" },
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-plate-ink mb-3">Cooking time per meal</label>
        <RadioCard
          value={cookTime}
          onChange={setCookTime}
          options={[
            { value: "under-20", label: "Under 20 minutes", description: "Quick weeknight dinners" },
            { value: "20-40", label: "20–40 minutes", description: "The sweet spot" },
            { value: "40-plus", label: "40+ minutes is fine", description: "I enjoy cooking" },
          ]}
        />
      </div>
    </div>,

    // Step 7: Nutrition goals
    <div key="step7" className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-plate-ink mb-1">Nutrition goals</h2>
        <p className="text-sm text-plate-ink-2">Optional — skip this if you just want great meals</p>
      </div>

      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-plate-ink">Track calories &amp; macros</p>
          <p className="text-xs text-plate-ink-3 mt-0.5">See daily progress on your plan</p>
        </div>
        <button
          onClick={() => setTrackNutrition(!trackNutrition)}
          className={clsx("w-12 h-6 rounded-full transition-colors relative flex-shrink-0", trackNutrition ? "bg-plate-ink" : "bg-slate-200")}
        >
          <span className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-plate-surface shadow transition-transform", trackNutrition ? "translate-x-6" : "translate-x-0.5")} />
        </button>
      </div>

      {trackNutrition && (
        <div className="space-y-6 animate-fade-in">
          {/* Calorie slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-plate-ink">Daily calorie target</label>
              <span className="text-sm font-bold text-plate-coral">{calorieGoal.toLocaleString()} kcal</span>
            </div>
            <input
              type="range"
              min={1200}
              max={3500}
              step={50}
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(Number(e.target.value))}
              className="w-full accent-[#C8FF3E]"
            />
            <div className="flex justify-between text-[10px] text-plate-ink-3">
              <span>1,200 · Light</span>
              <span>2,000 · Standard</span>
              <span>3,500 · Very active</span>
            </div>
            <p className="text-xs text-plate-ink-3">Typical adult: 1,600–2,200 kcal/day. Raise for heavy exercise or a larger household.</p>
          </div>

          {/* Macro sliders */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-plate-ink">Macro split</p>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-plate-ink">Protein</span>
                <span className="text-xs font-bold text-plate-coral">{proteinPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={proteinPct}
                onChange={(e) => {
                  const next = adjustMacros("protein", Number(e.target.value), { proteinPct, carbsPct, fatPct });
                  setProteinPct(next.proteinPct); setCarbsPct(next.carbsPct); setFatPct(next.fatPct);
                }}
                className="w-full accent-[#C8FF3E]"
              />
              <p className="text-[10px] text-plate-ink-3">0.8–2g per kg body weight · Higher for muscle building</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-plate-ink">Carbohydrates</span>
                <span className="text-xs font-bold text-amber-500">{carbsPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                step={5}
                value={carbsPct}
                onChange={(e) => {
                  const next = adjustMacros("carbs", Number(e.target.value), { proteinPct, carbsPct, fatPct });
                  setProteinPct(next.proteinPct); setCarbsPct(next.carbsPct); setFatPct(next.fatPct);
                }}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-plate-ink-3">Low carb: under 25% · Balanced: 40–50% · High carb: 55%+</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-plate-ink">Fat</span>
                <span className="text-xs font-bold text-rose-500">{fatPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={fatPct}
                onChange={(e) => {
                  const next = adjustMacros("fat", Number(e.target.value), { proteinPct, carbsPct, fatPct });
                  setProteinPct(next.proteinPct); setCarbsPct(next.carbsPct); setFatPct(next.fatPct);
                }}
                className="w-full accent-rose-500"
              />
              <p className="text-[10px] text-plate-ink-3">Essential fats: 20–35% · Includes healthy oils, avocado, nuts</p>
            </div>

            {/* Macro bar */}
            <div className="space-y-1.5">
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                <div className="bg-plate-coral transition-all" style={{ width: `${proteinPct}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${carbsPct}%` }} />
                <div className="bg-rose-400 transition-all" style={{ width: `${fatPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-plate-ink-3">
                <span className="text-plate-coral font-medium">P {proteinPct}%</span>
                <span className="text-amber-500 font-medium">C {carbsPct}%</span>
                <span className="text-rose-500 font-medium">F {fatPct}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
  ];

  return (
    <div className="min-h-screen bg-plate-surface flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-medium text-plate-ink-3 uppercase tracking-wider">
            Step {step + 1} of {TOTAL_STEPS}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-1.5 rounded-full transition-all duration-300",
                  i <= step ? "bg-plate-ink w-6" : "bg-slate-200 w-3"
                )}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-plate-ink">Welcome to <span className="text-plate-coral">Plate</span></h1>
            <p className="text-plate-ink-2 mt-1.5">Your weekly meals, planned and personalised.</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-32">
        {stepContent[step]}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4 bg-plate-surface/90 backdrop-blur-sm border-t border-plate-line">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} className="w-14 flex-shrink-0">
              ←
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canAdvance}
            onClick={() => step === TOTAL_STEPS - 1 ? handleFinish() : setStep(step + 1)}
          >
            {step === TOTAL_STEPS - 1 ? "Build my plan" : "Next"}
            {step < TOTAL_STEPS - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
