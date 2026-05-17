import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { event, properties } = body as { event?: string; properties?: Record<string, unknown> };

  if (!event?.trim()) return NextResponse.json({ ok: true }); // silent no-op

  await prisma.analyticsEvent.create({
    data: {
      userId: session?.user?.id ?? null,
      event: event.trim(),
      properties: properties ? JSON.parse(JSON.stringify(properties)) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
