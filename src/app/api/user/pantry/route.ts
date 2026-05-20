import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STAPLES } from "@/lib/pantryManager";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const [pantryItems, userStaples] = await Promise.all([
    prisma.pantryItem.findMany({ where: { userId }, orderBy: { addedAt: "desc" } }),
    prisma.userStaple.findMany({ where: { userId } }),
  ]);

  // If user has no custom staples saved yet, return the defaults
  const stapleIngredients =
    userStaples.length > 0
      ? userStaples.map((s) => s.ingredientName)
      : DEFAULT_STAPLES;

  return NextResponse.json({
    pantryItems: pantryItems.map((p) => ({
      ingredientName: p.ingredientName,
      quantity: p.quantity,
      unit: p.unit,
      addedAt: p.addedAt.getTime(),
      sourceOrderId: p.sourceOrderId ?? undefined,
    })),
    stapleIngredients,
  });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const body = await req.json();

  if (body.type === "staple") {
    // Toggle a staple ingredient
    const { ingredientName, active } = body;
    if (active) {
      await prisma.userStaple.upsert({
        where: { userId_ingredientName: { userId, ingredientName } },
        create: { userId, ingredientName },
        update: {},
      });
    } else {
      await prisma.userStaple.deleteMany({ where: { userId, ingredientName } });
    }
    return NextResponse.json({ ok: true });
  }

  // Upsert a pantry item
  const { ingredientName, quantity, unit, sourceOrderId } = body;
  if (quantity <= 0) {
    await prisma.pantryItem.deleteMany({ where: { userId, ingredientName, unit } });
  } else {
    await prisma.pantryItem.upsert({
      where: { userId_ingredientName_unit: { userId, ingredientName, unit } },
      update: { quantity, sourceOrderId: sourceOrderId ?? null },
      create: { userId, ingredientName, quantity, unit, sourceOrderId: sourceOrderId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const { ingredientName, unit } = await req.json();
  await prisma.pantryItem.deleteMany({ where: { userId, ingredientName, unit } });

  return NextResponse.json({ ok: true });
}
