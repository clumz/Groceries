import { prisma } from "@/lib/prisma";

export async function getUserIsPremium(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!sub) return false;
  return sub.status === "active" && (sub.currentPeriodEnd == null || sub.currentPeriodEnd > new Date());
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
