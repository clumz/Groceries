import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { planId } = await params;

  const cart = await prisma.cart.findFirst({
    where: { mealPlanId: planId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!cart) return NextResponse.json({ cart: null });

  return NextResponse.json({ cart });
}
