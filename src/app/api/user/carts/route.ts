import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import type { Cart } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const { cart }: { cart: Cart } = await req.json();

  const saved = await prisma.cart.create({
    data: {
      id: cart.id,
      userId,
      mealPlanId: cart.mealPlanId ?? null,
      retailer: cart.retailer,
      estimatedTotal: cart.estimatedTotal,
      items: cart.items as object,
    },
  });

  return NextResponse.json({ cartId: saved.id });
}
