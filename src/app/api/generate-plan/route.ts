import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { generateMealPlan } from "@/lib/mealPlanAlgorithm";
import { generateAiMealPlan } from "@/lib/aiMealPlan";
import type { GeneratePlanRequest, WeeklyMealPlan, FeedbackHistory } from "@/types";
import { computePreferenceEvolution } from "@/lib/feedbackEvolution";
import { getUserIsPremium } from "@/lib/subscription";
import { generatePlanLimiter } from "@/lib/upstash";

// Premium plans call Claude; leave room for one model call plus DB writes.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlanRequest = await req.json();
    const { preferences } = body;
    if (!preferences) {
      return NextResponse.json({ error: "preferences required" }, { status: 400 });
    }

    // If signed in, use server-side feedback (more trustworthy than client payload)
    let feedbackHistory: FeedbackHistory = body.feedbackHistory ?? { items: [], servingAdjustments: [], substituteDecisions: [] };
    let planUserId: string | null = null;

    const { userId: clerkId } = await auth();
    planUserId = await getPrismaUserId(clerkId);
    if (planUserId) {
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

    const isPremium = await getUserIsPremium(planUserId).catch(() => false);

    // Rate limiting (skip if Upstash not configured)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const limiter = isPremium ? generatePlanLimiter.premium : generatePlanLimiter.free;
      const identifier = planUserId ?? (req.headers.get("x-forwarded-for") ?? "anon");
      const { success, limit, remaining, reset } = await limiter.limit(identifier);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": String(remaining),
              "X-RateLimit-Reset": String(reset),
            },
          }
        );
      }
    }

    // Deterministic algorithm for free tier; Claude picks from the library for premium.
    let mealPlan: WeeklyMealPlan | null = null;
    if (isPremium && process.env.ANTHROPIC_API_KEY) {
      try {
        mealPlan = await generateAiMealPlan(preferences, feedbackHistory, preferenceEvolution);
      } catch (e) {
        console.error("AI meal plan failed, using algorithm:", e);
      }
    }
    mealPlan ??= generateMealPlan(preferences, feedbackHistory, preferenceEvolution);

    if (planUserId) await savePlanToDB(planUserId, mealPlan);
    return NextResponse.json({ mealPlan, planId: mealPlan.id });
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
