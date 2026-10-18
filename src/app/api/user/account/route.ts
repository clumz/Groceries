import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { deleteUserByClerkId } from "@/lib/clerk";
import { cancelActiveSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

// Permanently delete the account: stop billing, delete our data, then the Clerk user.
// The user.deleted webhook that follows finds nothing left and is a no-op.
export async function DELETE() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await cancelActiveSubscription({ clerkId });
  await deleteUserByClerkId(clerkId);
  const clerk = await clerkClient();
  await clerk.users.deleteUser(clerkId);

  return NextResponse.json({ ok: true });
}
