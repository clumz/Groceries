import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { deleteUserByClerkId, syncClerkUser } from "@/lib/clerk";
import { cancelActiveSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string; verification?: { status: string } | null }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, headers) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;
  try {
    if (type === "user.created" || type === "user.updated") {
      const primary = data.email_addresses?.find((e) => e.id === data.primary_email_address_id);
      await syncClerkUser({
        clerkId: data.id,
        email: primary?.email_address ?? null,
        emailVerified: primary?.verification?.status === "verified",
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        image: data.image_url,
      });
    } else if (type === "user.deleted") {
      // Stop billing before the rows (and our link to Stripe) go away.
      await cancelActiveSubscription({ clerkId: data.id });
      await deleteUserByClerkId(data.id);
    }
  } catch (e) {
    console.error("Clerk webhook DB error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
