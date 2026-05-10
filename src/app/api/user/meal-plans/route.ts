import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { WeeklyMealPlan, PlannedMeal, SnackItem } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const { mealPlan }: { mealPlan: WeeklyMealPlan } = await req.json();

  // Archive any existing active plan
  await prisma.mealPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  // Create the new plan
  const created = await prisma.mealPlan.create({
    data: {
      id: mealPlan.id,
      userId,
      generatedAt: new Date(mealPlan.generatedAt),
      preferenceSnapshot: mealPlan.preferenceSnapshot as object,
      isActive: true,
      plannedMeals: {
        create: mealPlan.meals.map((m) => ({
          id: m.id,
          recipeId: m.recipe.id,
          dayIndex: m.dayIndex,
          mealType: m.mealType,
          servings: m.servings,
          feedback: m.feedback ?? null,
        })),
      },
      snacks: {
        create: mealPlan.snacks.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          quantity: s.quantity,
          unit: s.unit,
          estimatedCost: s.estimatedCost,
        })),
      },
    },
    include: { plannedMeals: { include: { recipe: true } }, snacks: true },
  });

  return NextResponse.json({ mealPlan: dbPlanToClient(created), planId: created.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbPlanToClient(plan: any): WeeklyMealPlan {
  const meals: PlannedMeal[] = plan.plannedMeals.map((m: any) => ({
    id: m.id,
    dayIndex: m.dayIndex,
    mealType: m.mealType,
    servings: m.servings,
    feedback: m.feedback ?? undefined,
    recipe: {
      ...m.recipe,
      ingredients: m.recipe.ingredients,
      cookTimeMinutes: m.recipe.cookTimeMinutes,
      prepTimeMinutes: m.recipe.prepTimeMinutes,
    },
  }));

  const snacks: SnackItem[] = plan.snacks.map((s: any) => ({
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
    preferenceSnapshot: plan.preferenceSnapshot,
  };
}
