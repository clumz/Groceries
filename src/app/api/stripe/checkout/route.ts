import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { getOrCreateStripeCustomer } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST() {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const customerId = await getOrCreateStripeCustomer(userId, user.email);

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=cancelled`,
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
