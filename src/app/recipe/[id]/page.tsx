"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { PlannedMeal, FeedbackType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, Clock, Users, ThumbsUp, ThumbsDown, X, ChefHat } from "lucide-react";
import { clsx } from "clsx";

const FOOD_IMAGES: Record<string, string> = {
  italian: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800&q=80",
  asian: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80",
  mediterranean: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  mexican: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
  "middle-eastern": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800&q=80",
  indian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
  australian: "https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80",
  japanese: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80",
  thai: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80",
  greek: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&q=80",
};

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealId = searchParams.get("mealId");

  const currentMealPlan = useAppStore((s) => s.currentMealPlan);
  const addFeedback = useAppStore((s) => s.addFeedback);
  const updateServings = useAppStore((s) => s.updateServings);

  const meal: PlannedMeal | undefined = currentMealPlan?.meals.find(
    (m) => m.id === mealId || m.recipe.id === params.id
  );

  const [localServings, setLocalServings] = useState(meal?.servings ?? 2);

  useEffect(() => {
    if (meal) setLocalServings(meal.servings);
  }, [meal]);

  if (!meal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-ink-secondary">Recipe not found</p>
        <Button onClick={() => router.back()} variant="secondary">Go back</Button>
      </div>
    );
  }

  const { recipe } = meal;
  const imageUrl = FOOD_IMAGES[recipe.cuisine] ?? FOOD_IMAGES.australian;
  const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;
  const scale = localServings / recipe.servings;

  function handleFeedback(type: FeedbackType) {
    addFeedback({
      recipeId: recipe.id,
      recipeName: recipe.name,
      feedback: type,
      timestamp: Date.now(),
      cuisineType: recipe.cuisine,
      primaryProtein: recipe.primaryProtein,
    });
  }

  function handleServingsChange(n: number) {
    const newServings = Math.max(1, Math.min(12, n));
    setLocalServings(newServings);
    if (meal) updateServings(meal.id, newServings);
  }

  return (
    <div className="min-h-screen bg-surface pb-8">
      {/* Hero Image */}
      <div className="relative h-72">
        <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-4">
          <Badge variant={recipe.difficulty === "easy" ? "green" : recipe.difficulty === "medium" ? "orange" : "red"} className="mb-2 capitalize">
            {recipe.difficulty}
          </Badge>
          <h1 className="text-2xl font-bold text-white leading-tight">{recipe.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-5">
        {/* Meta row */}
        <div className="flex items-center gap-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <Clock className="w-4 h-4" /> {totalTime} min
          </div>
          <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <ChefHat className="w-4 h-4" /> Prep {recipe.prepTimeMinutes} min
          </div>
          <div className="flex-1" />
          {recipe.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="gray" className="capitalize">{tag}</Badge>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-ink-secondary mt-4 leading-relaxed">{recipe.description}</p>

        {/* Serving adjuster */}
        <div className="flex items-center justify-between mt-5 py-3 px-4 bg-surface-tertiary rounded-2xl">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Users className="w-4 h-4 text-ink-tertiary" />
            Servings
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleServingsChange(localServings - 1)}
              className="w-8 h-8 rounded-full bg-white shadow-sm text-ink font-bold flex items-center justify-center"
            >
              −
            </button>
            <span className="text-lg font-bold text-ink w-5 text-center">{localServings}</span>
            <button
              onClick={() => handleServingsChange(localServings + 1)}
              className="w-8 h-8 rounded-full bg-white shadow-sm text-ink font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Feedback buttons */}
        <div className="flex gap-2 mt-4">
          <FeedbackBtn
            icon={<ThumbsUp className="w-4 h-4" />}
            label="Love it"
            active={meal.feedback === "thumbs-up"}
            activeClass="bg-brand-600 text-white border-brand-600"
            onClick={() => handleFeedback("thumbs-up")}
          />
          <FeedbackBtn
            icon={<ThumbsDown className="w-4 h-4" />}
            label="Not for me"
            active={meal.feedback === "thumbs-down"}
            activeClass="bg-slate-700 text-white border-slate-700"
            onClick={() => handleFeedback("thumbs-down")}
          />
          <FeedbackBtn
            icon={<X className="w-4 h-4" />}
            label="Never again"
            active={meal.feedback === "never-show"}
            activeClass="bg-red-500 text-white border-red-500"
            onClick={() => handleFeedback("never-show")}
          />
        </div>

        {/* Ingredients */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink mb-3">Ingredients</h2>
          <div className="space-y-2.5">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-ink">{ing.name}</span>
                <span className="text-sm text-ink-secondary ml-4 text-right flex-shrink-0">
                  {scale !== 1
                    ? `${(ing.quantity * scale % 1 === 0 ? ing.quantity * scale : (ing.quantity * scale).toFixed(1))}`
                    : ing.quantity}{" "}
                  {ing.unit}
                  {ing.notes && <span className="block text-xs text-ink-tertiary">{ing.notes}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Method */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink mb-3">Method</h2>
          <div className="space-y-4">
            {recipe.method.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-ink leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackBtn({ icon, label, active, activeClass, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all duration-150",
        active ? activeClass : "bg-white border-slate-200 text-ink-secondary hover:border-slate-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
