import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use raw object for fields that vary by Stripe SDK version
  const rawSub = event.data.object as unknown as Record<string, unknown>;
  const sub = rawSub as { id: string; customer: string; status: string; metadata: Record<string, string>; items: { data: { price: { id: string } }[] }; current_period_end: number; cancel_at_period_end: boolean };

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await prisma.subscription.update({
        where: { userId },
        data: { status: "canceled", stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
