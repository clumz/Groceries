"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { UserPreferences, StorePreference, DietaryRequirement, CuisinePreference, ProteinPreference, BudgetRange, CookTimePreference } from "@/types";
import { Check, ChevronRight, ShoppingBag, Clock } from "lucide-react";
import { track } from "@/lib/analytics";

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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              border: "1.5px solid #1A1410",
              cursor: "pointer",
              transition: "all 0.12s",
              background: active ? "#C8FF3E" : "#FFFFFF",
              color: "#1A1410",
              boxShadow: active ? "2px 2px 0 #1A1410" : "none",
              transform: active ? "translate(-1px, -1px)" : "none",
              userSelect: "none",
            }}
          >
            {opt.emoji && <span style={{ fontSize: 16 }}>{opt.emoji}</span>}
            {opt.label}
            {active && <Check style={{ width: 13, height: 13 }} />}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1.5px solid #1A1410",
              cursor: "pointer",
              textAlign: "left",
              background: active ? "#C8FF3E" : "#FFFFFF",
              boxShadow: active ? "3px 3px 0 #1A1410" : "none",
              transform: active ? "translate(-1.5px, -1.5px)" : "none",
              transition: "all 0.12s",
            }}
          >
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid #1A1410",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: active ? "#1A1410" : "transparent",
            }}>
              {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8FF3E" }} />}
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1A1410" }}>{opt.label}</p>
              {opt.description && (
                <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.6, marginTop: 2 }}>{opt.description}</p>
              )}
            </div>
          </button>
        );
      })}
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
    <div key="step0" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Your supermarket
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>Pick your preferred store for grocery delivery</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(["woolworths", "coles"] as StorePreference[]).map((s) => {
          const active = store === s;
          return (
            <button
              key={s}
              onClick={() => setStore(s)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 16,
                borderRadius: 22,
                border: "1.5px solid #1A1410",
                height: 112,
                background: active ? "#C8FF3E" : "#FFFFFF",
                boxShadow: active ? "3px 3px 0 #1A1410" : "none",
                transform: active ? "translate(-1.5px, -1.5px)" : "none",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              <ShoppingBag size={28} color="#1A1410" />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1A1410", textTransform: "capitalize" }}>{s}</span>
              {active && <Check size={14} color="#1A1410" />}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>Suburb</label>
          <input
            type="text"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="e.g. Surry Hills"
            style={{
              width: "100%",
              background: "#FFFFFF",
              border: "1.5px solid #1A1410",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: 15,
              color: "#1A1410",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>Postcode</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              placeholder="e.g. 2010"
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: `1.5px solid ${postcodeError ? "#FF6B4A" : "#1A1410"}`,
                borderRadius: 14,
                padding: "12px 40px 12px 16px",
                fontSize: 15,
                color: "#1A1410",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            {postcodeLoading && (
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: "50%", border: "2px solid #C8FF3E", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
            )}
            {!postcodeLoading && postcode.length === 4 && isValidAustralianPostcode(postcode) && (
              <Check size={16} color="#1A1410" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
            )}
          </div>
          {postcodeError && <p style={{ fontSize: 12, color: "#FF6B4A", marginTop: 4 }}>{postcodeError}</p>}
        </div>
      </div>
    </div>,

    // Step 1: Dietary
    <div key="step1" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Dietary needs
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>Select all that apply — we'll never suggest something you can't eat</p>
      </div>
      <MultiSelectPill options={DIETARY_OPTIONS} selected={dietary} onToggle={toggleDietary} />
      {dietary.length === 0 && (
        <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.45, textAlign: "center" }}>No restrictions? Just tap Next →</p>
      )}
    </div>,

    // Step 2: Cuisines
    <div key="step2" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Favourite cuisines
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>Pick your favourites — we'll rotate through them each week</p>
      </div>
      <MultiSelectPill options={CUISINE_OPTIONS} selected={cuisines} onToggle={toggleCuisine} />
    </div>,

    // Step 3: Proteins
    <div key="step3" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Preferred proteins
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>What proteins do you enjoy?</p>
      </div>
      <MultiSelectPill options={PROTEIN_OPTIONS} selected={proteins} onToggle={toggleProtein} />
    </div>,

    // Step 4: Taste selection
    <div key="step4" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Pick dishes you'd love
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>Select at least 3 — personalises your first meal plan</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1A1410", opacity: 0.5 }}>{likedRecipes.length} selected</span>
        <span style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 12,
          color: likedRecipes.length >= 3 ? "#1A1410" : "#FF6B4A",
          background: likedRecipes.length >= 3 ? "#C8FF3E" : "#FFD66B",
          border: "1.5px solid #1A1410",
          borderRadius: 999,
          padding: "3px 10px",
        }}>
          {likedRecipes.length < 3 ? `${3 - likedRecipes.length} more to go` : "Looking good!"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {TASTE_RECIPES.map((recipe) => {
          const selected = likedRecipes.includes(recipe.id);
          return (
            <button
              key={recipe.id}
              onClick={() => toggleRecipe(recipe.id)}
              style={{
                position: "relative",
                borderRadius: 18,
                overflow: "hidden",
                textAlign: "left",
                border: selected ? "2px solid #C8FF3E" : "1.5px solid #1A1410",
                boxShadow: selected ? "3px 3px 0 #1A1410" : "none",
                transform: selected ? "translate(-1.5px, -1.5px)" : "none",
                transition: "all 0.12s",
                cursor: "pointer",
                background: "none",
                padding: 0,
              }}
            >
              <div style={{ position: "relative", height: 112 }}>
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />

                {selected && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "#C8FF3E", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} color="#1A1410" />
                  </div>
                )}

                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px" }}>
                  <p style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700, lineHeight: 1.3, fontFamily: "var(--font-display)" }}>{recipe.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>{recipe.cuisine}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>·</span>
                    <Clock size={9} color="rgba(255,255,255,0.7)" />
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>{recipe.cookTime}m</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>,

    // Step 5: Household
    <div key="step5" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Your household
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>We'll scale recipes and quantities to match</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Household size */}
        <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 18, boxShadow: "3px 3px 0 #1A1410", padding: "16px 18px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 12 }}>HOUSEHOLD SIZE</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, cursor: "pointer", color: "#1A1410" }}>−</button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: "#1A1410", width: 40, textAlign: "center" }}>{householdSize}</span>
            <button onClick={() => setHouseholdSize(Math.min(10, householdSize + 1))} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, cursor: "pointer", color: "#1A1410" }}>+</button>
            <span style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>{householdSize === 1 ? "person" : "people"}</span>
          </div>
        </div>

        {/* Servings */}
        <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 18, boxShadow: "3px 3px 0 #1A1410", padding: "16px 18px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 12 }}>DEFAULT SERVINGS PER MEAL</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setServings(Math.max(1, servings - 1))} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, cursor: "pointer", color: "#1A1410" }}>−</button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: "#1A1410", width: 40, textAlign: "center" }}>{servings}</span>
            <button onClick={() => setServings(Math.min(12, servings + 1))} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF8EE", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, cursor: "pointer", color: "#1A1410" }}>+</button>
            <span style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>servings</span>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Include weekday lunches", value: includeLunches, set: setIncludeLunches },
            { label: "Include a snacks section", value: includeSnacks, set: setIncludeSnacks },
          ].map(({ label, value, set }) => (
            <div key={label} style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>{label}</span>
              <button
                onClick={() => set(!value)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 999,
                  border: "1.5px solid #1A1410",
                  background: value ? "#C8FF3E" : "#F1EDE6",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
              >
                <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#1A1410", transition: "left 0.15s", left: value ? "calc(100% - 21px)" : 3 }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,

    // Step 6: Budget + Cook Time
    <div key="step6" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Budget &amp; time
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>We'll keep recommendations practical</p>
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>WEEKLY GROCERY BUDGET</p>
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
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>COOKING TIME PER MEAL</p>
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
    <div key="step7" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStyle: "italic", fontSize: 28, color: "#1A1410", lineHeight: 1.15, marginBottom: 6 }}>
          Nutrition goals
        </h2>
        <p style={{ fontSize: 14, color: "#1A1410", opacity: 0.6 }}>Optional — skip this if you just want great meals</p>
      </div>

      <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1410" }}>Track calories &amp; macros</p>
          <p style={{ fontSize: 12, color: "#1A1410", opacity: 0.55, marginTop: 2 }}>See daily progress on your plan</p>
        </div>
        <button
          onClick={() => setTrackNutrition(!trackNutrition)}
          style={{
            width: 48, height: 28, borderRadius: 999, border: "1.5px solid #1A1410",
            background: trackNutrition ? "#C8FF3E" : "#F1EDE6",
            position: "relative", flexShrink: 0, transition: "background 0.15s", cursor: "pointer",
          }}
        >
          <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#1A1410", transition: "left 0.15s", left: trackNutrition ? "calc(100% - 21px)" : 3 }} />
        </button>
      </div>

      {trackNutrition && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Calorie slider */}
          <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 18, boxShadow: "3px 3px 0 #1A1410", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>DAILY CALORIES</p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#FF6B4A" }}>{calorieGoal.toLocaleString()} kcal</span>
            </div>
            <input
              type="range" min={1200} max={3500} step={50} value={calorieGoal}
              onChange={(e) => setCalorieGoal(Number(e.target.value))}
              className="w-full accent-[#C8FF3E]" style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {["1,200 Light", "2,000 Std", "3,500 Active"].map((t) => (
                <span key={t} style={{ fontSize: 10, color: "#1A1410", opacity: 0.45 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Macro sliders */}
          <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 18, boxShadow: "3px 3px 0 #1A1410", padding: "16px 18px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1410", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 16 }}>MACRO SPLIT</p>

            {([
              { key: "protein" as const, label: "Protein", pct: proteinPct, textColor: "#FF6B4A", min: 10, max: 60 },
              { key: "carbs" as const, label: "Carbs", pct: carbsPct, textColor: "#B8860B", min: 10, max: 70 },
              { key: "fat" as const, label: "Fat", pct: fatPct, textColor: "#CC3A1A", min: 10, max: 60 },
            ]).map(({ key, label, pct, textColor, min, max }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1410" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: textColor }}>{pct}%</span>
                </div>
                <input
                  type="range" min={min} max={max} step={5} value={pct}
                  onChange={(e) => {
                    const next = adjustMacros(key, Number(e.target.value), { proteinPct, carbsPct, fatPct });
                    setProteinPct(next.proteinPct); setCarbsPct(next.carbsPct); setFatPct(next.fatPct);
                  }}
                  className="w-full accent-[#C8FF3E]" style={{ width: "100%" }}
                />
              </div>
            ))}

            <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", border: "1.5px solid #1A1410", marginTop: 4 }}>
              <div style={{ background: "#C8FF3E", width: `${proteinPct}%`, transition: "width 0.2s" }} />
              <div style={{ background: "#FFD66B", width: `${carbsPct}%`, transition: "width 0.2s" }} />
              <div style={{ background: "#FF6B4A", width: `${fatPct}%`, transition: "width 0.2s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1A1410" }}>P {proteinPct}%</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#B8860B" }}>C {carbsPct}%</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#CC3A1A" }}>F {fatPct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>,
  ];

  const STEP_LABELS = [
    "YOUR STORE",
    "DIETARY NEEDS",
    "CUISINES",
    "PROTEINS",
    "TASTE PROFILE",
    "HOUSEHOLD",
    "BUDGET & TIME",
    "NUTRITION",
  ];

  return (
    <div style={{ minHeight: "100svh", background: "#FFF8EE", display: "flex", flexDirection: "column" }}>
      {/* Progress bar + step label */}
      <div style={{ padding: "56px 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p className="eyebrow" style={{ color: "#FF6B4A" }}>{STEP_LABELS[step]}</p>
          <p className="eyebrow" style={{ color: "#1A1410", opacity: 0.4 }}>{step + 1} / {TOTAL_STEPS}</p>
        </div>
        {/* Thick lime progress bar */}
        <div style={{ height: 8, background: "#E8E0D5", borderRadius: 999, overflow: "hidden", border: "1.5px solid #1A1410" }}>
          <div
            style={{
              height: "100%",
              background: "#C8FF3E",
              borderRadius: 999,
              width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 20px 120px", overflowY: "auto" }}>
        {stepContent[step]}
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        padding: "12px 20px 32px",
        background: "rgba(255,248,238,0.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #E8E0D5",
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                border: "1.5px solid #1A1410",
                background: "#FFFFFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 20,
                color: "#1A1410",
              }}
            >
              ←
            </button>
          )}
          <button
            onClick={() => {
              if (step === TOTAL_STEPS - 1) {
                track("onboarding_step", { step: step + 1, name: STEP_LABELS[step], completed: true });
                handleFinish();
              } else {
                track("onboarding_step", { step: step + 1, name: STEP_LABELS[step] });
                setStep(step + 1);
              }
            }}
            disabled={!canAdvance}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 999,
              border: "1.5px solid #1A1410",
              background: canAdvance ? "#C8FF3E" : "#E8E0D5",
              color: "#1A1410",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              cursor: canAdvance ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: canAdvance ? "3px 3px 0 #1A1410" : "none",
              transform: canAdvance ? "translate(-1.5px, -1.5px)" : "none",
              transition: "all 0.12s",
            }}
          >
            {step === TOTAL_STEPS - 1 ? "Build my plan" : "Next"}
            {step < TOTAL_STEPS - 1 && <ChevronRight style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      </div>
    </div>
  );
}
