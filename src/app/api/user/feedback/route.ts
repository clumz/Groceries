import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RecipeFeedback, FeedbackHistory } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const [items, servingAdjustments, substituteDecisions] = await Promise.all([
    prisma.recipeFeedback.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
    }),
    prisma.servingAdjustment.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
    prisma.substituteDecision.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
  ]);

  const history: FeedbackHistory = {
    items: items.map((i) => ({
      recipeId: i.recipeId,
      recipeName: i.recipeName,
      feedback: i.feedback as RecipeFeedback["feedback"],
      timestamp: i.timestamp.getTime(),
      cuisineType: i.cuisineType ?? undefined,
      primaryProtein: i.primaryProtein ?? undefined,
    })),
    servingAdjustments: servingAdjustments.map((s) => ({
      recipeId: s.recipeId,
      originalServings: s.originalServings,
      adjustedServings: s.adjustedServings,
    })),
    substituteDecisions: substituteDecisions.map((d) => ({
      productId: d.productId,
      accepted: d.accepted,
      timestamp: d.timestamp.getTime(),
    })),
  };

  return NextResponse.json({ feedbackHistory: history });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const body: RecipeFeedback = await req.json();

  await prisma.recipeFeedback.upsert({
    where: { userId_recipeId: { userId, recipeId: body.recipeId } },
    update: {
      feedback: body.feedback,
      cuisineType: body.cuisineType ?? null,
      primaryProtein: body.primaryProtein ?? null,
      timestamp: new Date(body.timestamp),
    },
    create: {
      userId,
      recipeId: body.recipeId,
      recipeName: body.recipeName,
      feedback: body.feedback,
      cuisineType: body.cuisineType ?? null,
      primaryProtein: body.primaryProtein ?? null,
      timestamp: new Date(body.timestamp),
    },
  });

  return NextResponse.json({ ok: true });
}

// Bulk upsert — used for localStorage migration
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const { items }: { items: RecipeFeedback[] } = await req.json();

  let count = 0;
  for (const item of items) {
    try {
      await prisma.recipeFeedback.upsert({
        where: { userId_recipeId: { userId, recipeId: item.recipeId } },
        update: {
          feedback: item.feedback,
          cuisineType: item.cuisineType ?? null,
          primaryProtein: item.primaryProtein ?? null,
          timestamp: new Date(item.timestamp),
        },
        create: {
          userId,
          recipeId: item.recipeId,
          recipeName: item.recipeName,
          feedback: item.feedback,
          cuisineType: item.cuisineType ?? null,
          primaryProtein: item.primaryProtein ?? null,
          timestamp: new Date(item.timestamp),
        },
      });
      count++;
    } catch {
      // Skip invalid items
    }
  }

  return NextResponse.json({ imported: count });
}
