import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  const body = await req.json().catch(() => ({}));
  const { event, properties } = body as { event?: string; properties?: Record<string, unknown> };

  if (!event?.trim()) return NextResponse.json({ ok: true });

  await prisma.analyticsEvent.create({
    data: {
      userId: userId ?? null,
      event: event.trim(),
      properties: properties ? JSON.parse(JSON.stringify(properties)) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
