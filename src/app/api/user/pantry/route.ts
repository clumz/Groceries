import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { PantryDeleteSchema, PantryPostSchema, PantryPutSchema, parseBody } from "@/lib/validation";
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

  const parsed = await parseBody(req, PantryPostSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

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
  const { ingredientName, quantity, unit, sourceOrderId } = body as Extract<typeof body, { quantity: number }>;
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

  const parsedDelete = await parseBody(req, PantryDeleteSchema);
  if (parsedDelete.error) return parsedDelete.error;
  const { ingredientName, unit } = parsedDelete.data;
  await prisma.pantryItem.deleteMany({ where: { userId, ingredientName, unit } });

  return NextResponse.json({ ok: true });
}

// Replace the whole pantry — used after an order, where many items change at once.
export async function PUT(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const parsed = await parseBody(req, PantryPutSchema);
  if (parsed.error) return parsed.error;

  await prisma.$transaction([
    prisma.pantryItem.deleteMany({ where: { userId } }),
    prisma.pantryItem.createMany({
      data: parsed.data.pantryItems.map((p) => ({
        userId,
        ingredientName: p.ingredientName,
        quantity: p.quantity,
        unit: p.unit,
        addedAt: new Date(p.addedAt ?? Date.now()),
        sourceOrderId: p.sourceOrderId ?? null,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
