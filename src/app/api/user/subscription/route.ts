import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
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
