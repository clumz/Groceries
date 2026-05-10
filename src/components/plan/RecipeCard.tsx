"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { PlannedMeal, FeedbackType } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Clock, Users, ThumbsUp, ThumbsDown, X, Shuffle } from "lucide-react";
import { clsx } from "clsx";
import { haptic } from "@/lib/haptics";

const CUISINE_COLORS: Record<string, "green" | "blue" | "orange" | "purple" | "gray"> = {
  italian: "orange",
  asian: "blue",
  mediterranean: "green",
  mexican: "orange",
  "middle-eastern": "purple",
  indian: "orange",
  australian: "green",
  japanese: "blue",
  thai: "green",
  greek: "blue",
};

const FOOD_IMAGES: Record<string, string> = {
  italian: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&q=80",
  asian: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80",
  mediterranean: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  mexican: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80",
  "middle-eastern": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&q=80",
  indian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",
  australian: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80",
  japanese: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80",
  thai: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=80",
  greek: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80",
};

interface RecipeCardProps {
  meal: PlannedMeal;
  onSwapRequest?: () => void;
}

export function RecipeCard({ meal, onSwapRequest }: RecipeCardProps) {
  const router = useRouter();
  const addFeedback = useAppStore((s) => s.addFeedback);
  const { recipe } = meal;

  const imageUrl = FOOD_IMAGES[recipe.cuisine] ?? FOOD_IMAGES.australian;
  const badgeColor = CUISINE_COLORS[recipe.cuisine] ?? "gray";
  const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;

  function handleFeedback(e: React.MouseEvent, type: FeedbackType) {
    e.stopPropagation();
    haptic(type === "thumbs-up" ? "medium" : "light");
    addFeedback({
      recipeId: recipe.id,
      recipeName: recipe.name,
      feedback: type,
      timestamp: Date.now(),
      cuisineType: recipe.cuisine,
      primaryProtein: recipe.primaryProtein,
    });
  }

  return (
    <div
      className="bg-plate-surface rounded-3xl overflow-hidden shadow-card mb-3 cursor-pointer hover:shadow-card-hover transition-shadow duration-200"
      onClick={() => router.push(`/recipe/${recipe.id}?mealId=${meal.id}`)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imageUrl}
          alt={recipe.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Feedback buttons */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <FeedbackButton
            icon={<ThumbsUp className="w-3.5 h-3.5" />}
            active={meal.feedback === "thumbs-up"}
            activeClass="bg-plate-ink text-white"
            onClick={(e) => handleFeedback(e, "thumbs-up")}
          />
          <FeedbackButton
            icon={<ThumbsDown className="w-3.5 h-3.5" />}
            active={meal.feedback === "thumbs-down"}
            activeClass="bg-slate-700 text-white"
            onClick={(e) => handleFeedback(e, "thumbs-down")}
          />
          <FeedbackButton
            icon={<X className="w-3.5 h-3.5" />}
            active={meal.feedback === "never-show"}
            activeClass="bg-red-500 text-white"
            onClick={(e) => handleFeedback(e, "never-show")}
          />
        </div>

        {/* Cuisine tag */}
        <div className="absolute bottom-3 left-3">
          <Badge variant={badgeColor} className="capitalize shadow-sm">
            {recipe.cuisine}
          </Badge>
        </div>

        {/* Swap button */}
        {onSwapRequest && (
          <button
            onClick={(e) => { e.stopPropagation(); onSwapRequest(); }}
            className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 hover:bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-full transition-colors"
          >
            <Shuffle className="w-3 h-3" />
            Swap
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3.5">
        <h3 className="font-bold text-ink text-base leading-tight">{recipe.name}</h3>
        <p className="text-xs text-plate-ink-2 mt-1 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="flex items-center gap-1 text-xs text-ink-tertiary">
            <Clock className="w-3 h-3" />
            {totalTime} min
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-tertiary">
            <Users className="w-3 h-3" />
            {meal.servings} servings
          </span>
          <span className={clsx("text-xs capitalize ml-auto", recipe.difficulty === "easy" ? "text-plate-coral" : recipe.difficulty === "medium" ? "text-orange-500" : "text-red-500")}>
            {recipe.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeedbackButton({ icon, active, activeClass, onClick }: {
  icon: React.ReactNode;
  active: boolean;
  activeClass: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150",
        active ? activeClass : "bg-black/30 text-white hover:bg-black/50"
      )}
    >
      {icon}
    </button>
  );
}
