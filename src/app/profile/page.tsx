"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { DietaryRequirement, CuisinePreference, ProteinPreference, BudgetRange, CookTimePreference, StorePreference } from "@/types";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, ThumbsUp, ThumbsDown, XCircle, ChevronRight, RefreshCw, LogOut } from "lucide-react";
import { clsx } from "clsx";

const DIETARY_LABELS: Record<DietaryRequirement, string> = {
  "vegan": "Vegan", "vegetarian": "Vegetarian", "pescatarian": "Pescatarian",
  "gluten-free": "Gluten-Free", "dairy-free": "Dairy-Free", "halal": "Halal",
  "kosher": "Kosher", "nut-free": "Nut-Free", "low-fodmap": "Low-FODMAP",
  "diabetic-friendly": "Diabetic-Friendly",
};
const ALL_DIETARY: DietaryRequirement[] = Object.keys(DIETARY_LABELS) as DietaryRequirement[];

const CUISINE_LABELS: Record<CuisinePreference, string> = {
  "italian": "Italian", "asian": "Asian", "mediterranean": "Mediterranean",
  "mexican": "Mexican", "middle-eastern": "Middle Eastern", "indian": "Indian",
  "australian": "Australian", "japanese": "Japanese", "thai": "Thai", "greek": "Greek",
};
const ALL_CUISINES: CuisinePreference[] = Object.keys(CUISINE_LABELS) as CuisinePreference[];

const PROTEIN_LABELS: Record<ProteinPreference, string> = {
  "chicken": "Chicken", "beef": "Beef", "lamb": "Lamb", "pork": "Pork",
  "seafood": "Seafood", "tofu": "Tofu / Plant-Based", "eggs": "Eggs", "no-preference": "No Preference",
};
const ALL_PROTEINS: ProteinPreference[] = Object.keys(PROTEIN_LABELS) as ProteinPreference[];

export default function ProfilePage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const feedbackHistory = useAppStore((s) => s.feedbackHistory);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const reset = useAppStore((s) => s.reset);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(preferences);

  if (!preferences || !draft) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-plate-ink-2">Please complete onboarding first</p>
        <Button onClick={() => router.push("/onboarding")}>Start onboarding</Button>
      </div>
    );
  }

  function toggleDietary(v: DietaryRequirement) {
    setDraft((d) => d ? {
      ...d,
      dietaryRequirements: d.dietaryRequirements.includes(v)
        ? d.dietaryRequirements.filter((x) => x !== v)
        : [...d.dietaryRequirements, v],
    } : d);
  }
  function toggleCuisine(v: CuisinePreference) {
    setDraft((d) => d ? {
      ...d,
      cuisinePreferences: d.cuisinePreferences.includes(v)
        ? d.cuisinePreferences.filter((x) => x !== v)
        : [...d.cuisinePreferences, v],
    } : d);
  }
  function toggleProtein(v: ProteinPreference) {
    setDraft((d) => d ? {
      ...d,
      proteinPreferences: d.proteinPreferences.includes(v)
        ? d.proteinPreferences.filter((x) => x !== v)
        : [...d.proteinPreferences, v],
    } : d);
  }

  function saveEdits() {
    if (draft) updatePreferences(draft);
    setEditing(false);
  }

  const liked = feedbackHistory.items.filter((i) => i.feedback === "thumbs-up").slice(-5);
  const disliked = feedbackHistory.items.filter((i) => i.feedback === "thumbs-down").slice(-5);
  const neverShow = feedbackHistory.items.filter((i) => i.feedback === "never-show");

  return (
    <div className="min-h-screen bg-plate-bg pb-24">
      {/* Header */}
      <div className="bg-plate-surface px-5 pt-14 pb-4 border-b border-plate-line">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-plate-ink">Profile</h1>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-plate-coral"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => { setDraft(preferences); setEditing(false); }} className="text-sm text-plate-ink-2">Cancel</button>
              <button onClick={saveEdits} className="text-sm font-semibold text-plate-coral">Save</button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Store preference */}
        <Section title="Preferred Store">
          <div className="flex gap-2">
            {(["woolworths", "coles"] as StorePreference[]).map((store) => (
              <button
                key={store}
                disabled={!editing}
                onClick={() => setDraft((d) => d ? { ...d, preferredStore: store } : d)}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize",
                  draft.preferredStore === store
                    ? store === "woolworths" ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"
                    : "bg-plate-surface border-plate-line text-plate-ink-2",
                  !editing && "pointer-events-none"
                )}
              >
                {store}
                {draft.preferredStore === store && <Check className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
          <div className="text-xs text-plate-ink-3 mt-2">{preferences.suburb}, {preferences.postcode}</div>
        </Section>

        {/* Household */}
        <Section title="Household">
          <div className="flex items-center justify-between text-sm">
            <span className="text-plate-ink-2">Household size</span>
            <span className="font-semibold text-plate-ink">{draft.householdSize} {draft.householdSize === 1 ? "person" : "people"}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-plate-ink-2">Default servings</span>
            <span className="font-semibold text-plate-ink">{draft.defaultServings}</span>
          </div>
        </Section>

        {/* Dietary */}
        <Section title="Dietary Requirements">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {ALL_DIETARY.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDietary(d)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    draft.dietaryRequirements.includes(d)
                      ? "bg-plate-ink border-plate-ink text-white"
                      : "bg-plate-surface border-plate-line text-plate-ink-2"
                  )}
                >
                  {DIETARY_LABELS[d]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {draft.dietaryRequirements.length === 0 ? (
                <span className="text-sm text-plate-ink-3">None</span>
              ) : (
                draft.dietaryRequirements.map((d) => (
                  <Badge key={d} variant="green">{DIETARY_LABELS[d]}</Badge>
                ))
              )}
            </div>
          )}
        </Section>

        {/* Cuisines */}
        <Section title="Cuisine Preferences">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {ALL_CUISINES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCuisine(c)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize",
                    draft.cuisinePreferences.includes(c)
                      ? "bg-plate-ink border-plate-ink text-white"
                      : "bg-plate-surface border-plate-line text-plate-ink-2"
                  )}
                >
                  {CUISINE_LABELS[c]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {draft.cuisinePreferences.map((c) => (
                <Badge key={c} variant="blue" className="capitalize">{CUISINE_LABELS[c]}</Badge>
              ))}
            </div>
          )}
        </Section>

        {/* Proteins */}
        <Section title="Protein Preferences">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {ALL_PROTEINS.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleProtein(p)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    draft.proteinPreferences.includes(p)
                      ? "bg-plate-ink border-plate-ink text-white"
                      : "bg-plate-surface border-plate-line text-plate-ink-2"
                  )}
                >
                  {PROTEIN_LABELS[p]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {draft.proteinPreferences.map((p) => (
                <Badge key={p} variant="gray" className="capitalize">{PROTEIN_LABELS[p]}</Badge>
              ))}
            </div>
          )}
        </Section>

        {/* Feedback history */}
        {(liked.length > 0 || disliked.length > 0 || neverShow.length > 0) && (
          <Section title="Your Taste Profile">
            {liked.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ThumbsUp className="w-3.5 h-3.5 text-plate-coral" />
                  <span className="text-xs font-semibold text-plate-ink-2">Loved recently</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {liked.map((i) => <Badge key={i.recipeId} variant="green">{i.recipeName}</Badge>)}
                </div>
              </div>
            )}
            {disliked.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ThumbsDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-plate-ink-2">Not your thing</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {disliked.map((i) => <Badge key={i.recipeId} variant="gray">{i.recipeName}</Badge>)}
                </div>
              </div>
            )}
            {neverShow.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-plate-ink-2">Never show again ({neverShow.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {neverShow.slice(0, 5).map((i) => <Badge key={i.recipeId} variant="red">{i.recipeName}</Badge>)}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Danger zone */}
        <Section title="Account">
          <button
            onClick={() => { reset(); router.replace("/onboarding"); }}
            className="w-full flex items-center justify-between text-sm text-red-500 py-1"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset all data and start over
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-plate-surface rounded-3xl p-4 shadow-card">
      <h3 className="text-sm font-semibold text-plate-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}
