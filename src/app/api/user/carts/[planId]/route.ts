import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const { planId } = await params;

  const cart = await prisma.cart.findFirst({
    where: { mealPlanId: planId, userId },
    orderBy: { createdAt: "desc" },
  });

  if (!cart) return NextResponse.json({ cart: null });

  return NextResponse.json({ cart });
}
