import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

// "Reset all data": wipes everything the user has created but keeps the
// account and any subscription, so they restart onboarding signed in.
export async function DELETE() {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = { userId };
  await prisma.$transaction([
    // Orders reference carts, and carts reference meal plans — delete in that order.
    prisma.order.deleteMany({ where }),
    prisma.cart.deleteMany({ where }),
    prisma.mealPlan.deleteMany({ where }),
    prisma.recipeFeedback.deleteMany({ where }),
    prisma.servingAdjustment.deleteMany({ where }),
    prisma.substituteDecision.deleteMany({ where }),
    prisma.pantryItem.deleteMany({ where }),
    prisma.userStaple.deleteMany({ where }),
    prisma.userPreferences.deleteMany({ where }),
  ]);

  return NextResponse.json({ ok: true });
}
