import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripePriceId: true,
    },
  });

  const isPremium =
    sub?.status === "active" &&
    (sub.currentPeriodEnd == null || sub.currentPeriodEnd > new Date());

  return NextResponse.json({ subscription: sub, isPremium });
}
