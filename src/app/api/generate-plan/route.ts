import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildMealPlanSystemPrompt } from "@/lib/prompts";
import { generateMockMealPlan } from "@/lib/mockMealPlan";
import type { GeneratePlanRequest, WeeklyMealPlan, PlannedMeal, FeedbackHistory } from "@/types";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlanRequest = await req.json();
    const { preferences } = body;

    // If signed in, use server-side feedback (more trustworthy than client payload)
    let feedbackHistory: FeedbackHistory = body.feedbackHistory ?? { items: [], servingAdjustments: [], substituteDecisions: [] };
    let planUserId: string | null = null;

    const session = await auth();
    if (session?.user?.id) {
      planUserId = session.user.id;
      try {
        const { prisma } = await import("@/lib/prisma");
        const [dbFeedback, dbPrefsRow] = await Promise.all([
          prisma.recipeFeedback.findMany({ where: { userId: planUserId } }),
          prisma.userPreferences.findUnique({ where: { userId: planUserId } }),
        ]);
        if (dbFeedback.length > 0) {
          feedbackHistory = {
            items: dbFeedback.map((f) => ({
              recipeId: f.recipeId,
              recipeName: f.recipeName,
              feedback: f.feedback as "thumbs-up" | "thumbs-down" | "never-show" | "swapped",
              timestamp: f.timestamp.getTime(),
              cuisineType: f.cuisineType ?? undefined,
              primaryProtein: f.primaryProtein ?? undefined,
            })),
            servingAdjustments: [],
            substituteDecisions: [],
          };
        }
        // Prefer server preferences if available
        if (dbPrefsRow) {
          Object.assign(preferences, {
            preferredStore: dbPrefsRow.preferredStore as "woolworths" | "coles",
            suburb: dbPrefsRow.suburb,
            postcode: dbPrefsRow.postcode,
            dietaryRequirements: dbPrefsRow.dietaryRequirements,
            cuisinePreferences: dbPrefsRow.cuisinePreferences,
            proteinPreferences: dbPrefsRow.proteinPreferences,
            householdSize: dbPrefsRow.householdSize,
            defaultServings: dbPrefsRow.defaultServings,
            budgetRange: dbPrefsRow.budgetRange as "under-150" | "150-250" | "250-350" | "350-plus",
            cookTimePreference: dbPrefsRow.cookTimePreference as "under-20" | "20-40" | "40-plus",
            includeLunches: dbPrefsRow.includeLunches,
            includeSnacks: dbPrefsRow.includeSnacks,
          });
        }
      } catch {
        // DB unavailable — use client-supplied values
      }
    }

    const preferenceEvolution = computePreferenceEvolution(feedbackHistory);

    // Fall back to mock data if no API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      const mealPlan = generateMockMealPlan(preferences, feedbackHistory, preferenceEvolution);
      if (planUserId) await savePlanToDB(planUserId, mealPlan);
      return NextResponse.json({ mealPlan, planId: mealPlan.id, mock: true });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemPrompt = buildMealPlanSystemPrompt(
      preferences,
      feedbackHistory,
      preferenceEvolution
    );

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Generate my personalised weekly meal plan now. Return only valid JSON.",
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed = JSON.parse(cleaned);

    const planId = `plan-${Date.now()}`;
    const meals: PlannedMeal[] = (parsed.meals ?? []).map((m: PlannedMeal & { recipe: { id: string } }, idx: number) => ({
      id: `meal-${planId}-${idx}`,
      dayIndex: m.dayIndex,
      mealType: m.mealType,
      recipe: {
        ...m.recipe,
        id: m.recipe.id ?? `recipe-${idx}`,
      },
      servings: m.recipe.servings ?? preferences.defaultServings,
    }));

    const mealPlan: WeeklyMealPlan = {
      id: planId,
      generatedAt: Date.now(),
      meals,
      snacks: parsed.snacks ?? [],
      preferenceSnapshot: preferences,
    };

    if (planUserId) await savePlanToDB(planUserId, mealPlan);

    return NextResponse.json({ mealPlan, planId });
  } catch (error) {
    console.error("generate-plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}

async function savePlanToDB(userId: string, mealPlan: WeeklyMealPlan): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.mealPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    await prisma.mealPlan.create({
      data: {
        id: mealPlan.id,
        userId,
        generatedAt: new Date(mealPlan.generatedAt),
        preferenceSnapshot: mealPlan.preferenceSnapshot as object,
        isActive: true,
        plannedMeals: {
          create: mealPlan.meals
            .filter((m) => m.recipe.id)
            .map((m) => ({
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
    });
  } catch (e) {
    console.warn("Could not save plan to DB:", e);
  }
}
