import { prisma } from "@/lib/prisma";

export async function getPrismaUserId(clerkId: string | null | undefined): Promise<string | null> {
  if (!clerkId) return null;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  return user?.id ?? null;
}
