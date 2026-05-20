import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  const body = await req.json().catch(() => ({}));
  const { url, message } = body as { url?: string; message?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  await prisma.bugReport.create({
    data: {
      userId: userId ?? null,
      url: url ?? "",
      userAgent: req.headers.get("user-agent") ?? "",
      message: message.trim(),
    },
  });

  return NextResponse.json({ ok: true });
}
