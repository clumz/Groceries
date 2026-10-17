import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ClerkProfile {
  clerkId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
}

export async function getPrismaUserId(clerkId: string | null | undefined): Promise<string | null> {
  if (!clerkId) return null;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (user) return user.id;

  // The Clerk webhook hasn't landed yet (or failed) — create the user now so the
  // first requests after sign-up aren't dropped as 401s.
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkId) return null;
  const primary = clerkUser.primaryEmailAddress;
  return syncClerkUser({
    clerkId,
    email: primary?.emailAddress ?? null,
    emailVerified: primary?.verification?.status === "verified",
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
    image: clerkUser.imageUrl ?? null,
  });
}

/** Create or update the DB user for a Clerk account. Returns the DB user id. */
export async function syncClerkUser(profile: ClerkProfile): Promise<string> {
  const { clerkId, name, image } = profile;
  let email = profile.email;

  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, clerkId: true },
    });
    if (byEmail && byEmail.clerkId !== clerkId) {
      if (!byEmail.clerkId && profile.emailVerified) {
        // Pre-Clerk (Auth.js) account with the same verified email — link it
        // rather than colliding on users.email and orphaning their data.
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { clerkId, name, image },
        });
        return byEmail.id;
      }
      // Email belongs to another account; don't store it on this one.
      email = null;
    }
  }

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, email, name, image },
      update: { email, name, image },
      select: { id: true },
    });
    return user.id;
  } catch (e) {
    // Concurrent first requests can race on the unique clerkId — the other one won.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
      if (user) return user.id;
    }
    throw e;
  }
}

/** Returns the meal plan id only if it belongs to this user (client-supplied ids aren't trusted). */
export async function ownedMealPlanId(userId: string, mealPlanId: string | null | undefined): Promise<string | null> {
  if (!mealPlanId) return null;
  const plan = await prisma.mealPlan.findFirst({ where: { id: mealPlanId, userId }, select: { id: true } });
  return plan?.id ?? null;
}
