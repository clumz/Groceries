import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { WeeklyMealPlan, PlannedMeal, SnackItem, Recipe, UserPreferences } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const activeOnly = req.nextUrl.searchParams.get("active") === "true";

  if (activeOnly) {
    const plan = await prisma.mealPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { generatedAt: "desc" },
      include: { plannedMeals: { include: { recipe: true } }, snacks: true },
    });
    if (!plan) return NextResponse.json({ mealPlan: null });
    return NextResponse.json({ mealPlan: dbPlanToClient(plan) });
  }

  // List of plans (summary only)
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { generatedAt: "desc" },
    select: { id: true, generatedAt: true, isActive: true, createdAt: true },
    take: 52,
  });

  return NextResponse.json({ plans });
}

type DbPlan = Prisma.MealPlanGetPayload<{ include: { plannedMeals: { include: { recipe: true } }; snacks: true } }>;

function dbPlanToClient(plan: DbPlan): WeeklyMealPlan {
  // String/JSON columns hold values the app wrote, so narrow them back to the client types.
  const meals: PlannedMeal[] = plan.plannedMeals.map((m) => ({
    id: m.id,
    dayIndex: m.dayIndex,
    mealType: m.mealType as PlannedMeal["mealType"],
    servings: m.servings,
    feedback: (m.feedback ?? undefined) as PlannedMeal["feedback"],
    recipe: m.recipe as unknown as Recipe,
  }));

  const snacks: SnackItem[] = plan.snacks.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    quantity: s.quantity,
    unit: s.unit,
    estimatedCost: s.estimatedCost,
  }));

  return {
    id: plan.id,
    generatedAt: plan.generatedAt.getTime(),
    meals,
    snacks,
    preferenceSnapshot: plan.preferenceSnapshot as unknown as UserPreferences,
  };
}
