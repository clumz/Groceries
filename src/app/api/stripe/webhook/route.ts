import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENTS = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

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

  if (!SUBSCRIPTION_EVENTS.has(event.type)) return NextResponse.json({ received: true });

  // Events can arrive out of order or be retried, so sync from Stripe's current
  // state rather than trusting the snapshot in the payload.
  const { id } = event.data.object as Stripe.Subscription;
  const sub = await stripe.subscriptions.retrieve(id);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const userId =
    sub.metadata?.userId ??
    (await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId }, select: { userId: true } }))
      ?.userId;
  if (!userId) {
    console.warn(`Stripe webhook: no user for subscription ${sub.id} / customer ${customerId}`);
    return NextResponse.json({ received: true });
  }

  // Since API version 2025-03-31 the billing period lives on subscription items.
  const periodEnds = sub.items.data.map((i) => i.current_period_end).filter(Boolean);
  const currentPeriodEnd = periodEnds.length ? new Date(Math.max(...periodEnds) * 1000) : null;

  const data = {
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? null,
    status: sub.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at != null,
  };

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customerId, ...data },
    update: { stripeCustomerId: customerId, ...data },
  });

  return NextResponse.json({ received: true });
}
