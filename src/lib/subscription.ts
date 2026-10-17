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
