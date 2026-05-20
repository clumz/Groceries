import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateStripeCustomer } from "@/lib/subscription";
import Stripe from "stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email);

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=cancelled`,
    subscription_data: { metadata: { userId: session.user.id } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
