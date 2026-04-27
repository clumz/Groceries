import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildMealPlanSystemPrompt } from "@/lib/prompts";
import type { GeneratePlanRequest, WeeklyMealPlan, PlannedMeal } from "@/types";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlanRequest = await req.json();
    const { preferences, feedbackHistory, preferenceEvolution } = body;

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

    // Strip any accidental markdown fences
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

    return NextResponse.json({ mealPlan });
  } catch (error) {
    console.error("generate-plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
