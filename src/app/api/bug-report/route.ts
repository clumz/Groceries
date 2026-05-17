import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { url, message } = body as { url?: string; message?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  await prisma.bugReport.create({
    data: {
      userId: session?.user?.id ?? null,
      url: url ?? "",
      userAgent: req.headers.get("user-agent") ?? "",
      message: message.trim(),
    },
  });

  return NextResponse.json({ ok: true });
}
