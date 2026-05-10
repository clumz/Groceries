import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
    include: { plannedMeals: { include: { recipe: true } }, snacks: true },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ mealPlan: plan });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update a specific planned meal (swap, servings change, feedback)
  if (body.mealId) {
    await prisma.plannedMeal.updateMany({
      where: { id: body.mealId, mealPlanId: id },
      data: {
        ...(body.recipeId ? { recipeId: body.recipeId } : {}),
        ...(body.servings != null ? { servings: body.servings } : {}),
        ...(body.feedback !== undefined ? { feedback: body.feedback } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  await prisma.mealPlan.updateMany({
    where: { id, userId: session.user.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
