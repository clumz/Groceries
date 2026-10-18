import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PREMIUM_STATUSES = new Set(["active", "trialing"]);

export function isPremiumSubscription(
  sub: { status: string; currentPeriodEnd: Date | null } | null | undefined
): boolean {
  if (!sub || !PREMIUM_STATUSES.has(sub.status)) return false;
  return sub.currentPeriodEnd == null || sub.currentPeriodEnd > new Date();
}

export async function getUserIsPremium(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });
  return isPremiumSubscription(sub);
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const customer = await stripe.customers.create({ email, metadata: { userId } });

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id, status: "inactive" },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/** Cancel the user's live Stripe subscription, if any (before deleting their account). */
export async function cancelActiveSubscription(where: Prisma.UserWhereInput): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { user: where, stripeSubscriptionId: { not: null }, status: { notIn: ["canceled", "incomplete_expired"] } },
    select: { stripeSubscriptionId: true },
  });
  if (!sub?.stripeSubscriptionId) return;
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch((e: unknown) => {
    // Already canceled on Stripe's side is fine; anything else should fail the caller.
    if (!(e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing")) throw e;
  });
}
