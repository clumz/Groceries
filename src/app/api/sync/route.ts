/**
 * POST /api/sync
 * One-shot migration of localStorage state to the DB.
 * Called once after first sign-in when localStorage data is found.
 * Fully idempotent — safe to call multiple times.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { PreferencesSchema as PrefsSchema, RecipeFeedbackSchema } from "@/lib/validation";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const result = { preferences: false, feedback: 0, pantry: 0, staples: 0, mealPlan: false, orders: 0 };

  // 1. Preferences
  if (body.preferences) {
    const prefs = PrefsSchema.safeParse(body.preferences);
    if (prefs.success) {
      const p = prefs.data;
      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          preferredStore: p.preferredStore,
          suburb: p.suburb,
          postcode: p.postcode,
          dietaryRequirements: p.dietaryRequirements,
          cuisinePreferences: p.cuisinePreferences,
          proteinPreferences: p.proteinPreferences,
          householdSize: p.householdSize,
          defaultServings: p.defaultServings,
          budgetRange: p.budgetRange,
          cookTimePreference: p.cookTimePreference,
          includeLunches: p.includeLunches,
          includeSnacks: p.includeSnacks,
          calorieGoal: p.calorieGoal ?? null,
          macroProteinPct: p.macroGoal?.proteinPct ?? null,
          macroCarbsPct: p.macroGoal?.carbsPct ?? null,
          macroFatPct: p.macroGoal?.fatPct ?? null,
          isOnboarded: true,
        },
        update: {},  // Don't overwrite if server already has prefs
      });
      result.preferences = true;
    }
  }

  // 2. Feedback history
  if (Array.isArray(body.feedbackHistory?.items)) {
    for (const item of body.feedbackHistory.items) {
      const parsed = RecipeFeedbackSchema.safeParse(item);
      if (!parsed.success) continue;
      const f = parsed.data;
      try {
        await prisma.recipeFeedback.upsert({
          where: { userId_recipeId: { userId, recipeId: f.recipeId } },
          update: {},  // Don't overwrite server signals with older local ones
          create: {
            userId,
            recipeId: f.recipeId,
            recipeName: f.recipeName,
            feedback: f.feedback,
            cuisineType: f.cuisineType ?? null,
            primaryProtein: f.primaryProtein ?? null,
            timestamp: new Date(f.timestamp),
          },
        });
        result.feedback++;
      } catch { /* skip duplicates */ }
    }
  }

  // 3. Pantry items
  if (Array.isArray(body.pantryItems)) {
    for (const item of body.pantryItems) {
      if (!item.ingredientName || typeof item.quantity !== "number") continue;
      try {
        await prisma.pantryItem.upsert({
          where: { userId_ingredientName_unit: { userId, ingredientName: item.ingredientName, unit: item.unit ?? "" } },
          update: {},
          create: {
            userId,
            ingredientName: item.ingredientName,
            quantity: item.quantity,
            unit: item.unit ?? "",
            addedAt: new Date(item.addedAt ?? Date.now()),
            sourceOrderId: item.sourceOrderId ?? null,
          },
        });
        result.pantry++;
      } catch { /* skip */ }
    }
  }

  // 4. Staple ingredients (only if non-default)
  if (Array.isArray(body.stapleIngredients) && body.stapleIngredients.length > 0) {
    const existing = await prisma.userStaple.count({ where: { userId } });
    if (existing === 0) {
      for (const name of body.stapleIngredients) {
        if (typeof name !== "string") continue;
        try {
          await prisma.userStaple.create({ data: { userId, ingredientName: name } });
          result.staples++;
        } catch { /* skip */ }
      }
    }
  }

  // 5. Active meal plan (import if server has none)
  if (body.currentMealPlan) {
    const hasActivePlan = await prisma.mealPlan.findFirst({ where: { userId, isActive: true } });
    if (!hasActivePlan) {
      try {
        const plan = body.currentMealPlan;
        await prisma.mealPlan.create({
          data: {
            id: plan.id ?? `migrated-${Date.now()}`,
            userId,
            generatedAt: new Date(plan.generatedAt ?? Date.now()),
            preferenceSnapshot: plan.preferenceSnapshot ?? {},
            isActive: true,
            plannedMeals: {
              create: (plan.meals ?? []).map((m: Record<string, unknown>) => ({
                id: String(m.id ?? `meal-${Math.random()}`),
                recipeId: String((m.recipe as Record<string, unknown>)?.id ?? ""),
                dayIndex: Number(m.dayIndex ?? 0),
                mealType: String(m.mealType ?? "dinner"),
                servings: Number(m.servings ?? 2),
                feedback: m.feedback ? String(m.feedback) : null,
              })).filter((m: { recipeId: string }) => m.recipeId),
            },
            snacks: {
              create: (plan.snacks ?? []).map((s: Record<string, unknown>) => ({
                id: String(s.id ?? `snack-${Math.random()}`),
                name: String(s.name ?? ""),
                description: String(s.description ?? ""),
                quantity: Number(s.quantity ?? 1),
                unit: String(s.unit ?? ""),
                estimatedCost: Number(s.estimatedCost ?? 0),
              })),
            },
          },
        });
        result.mealPlan = true;
      } catch (e) {
        console.warn("Could not migrate meal plan:", e);
      }
    }
  }

  return NextResponse.json({ ok: true, result });
}
