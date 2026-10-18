import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId, ownedMealPlanId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CartSchema, parseBody } from "@/lib/validation";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const parsed = await parseBody(req, z.object({ cart: CartSchema }));
  if (parsed.error) return parsed.error;
  const { cart } = parsed.data;

  const saved = await prisma.cart.create({
    data: {
      id: cart.id,
      userId,
      mealPlanId: await ownedMealPlanId(userId, cart.mealPlanId),
      retailer: cart.retailer,
      estimatedTotal: cart.estimatedTotal,
      items: cart.items as object,
    },
  });

  return NextResponse.json({ cartId: saved.id });
}
