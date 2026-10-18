import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const maxDuration = 300;

// Resend's batch endpoint accepts up to 100 emails per call.
const BATCH_SIZE = 100;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function reminderEmail(user: { id: string; email: string; name: string | null }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const unsubscribe = unsubscribeUrl(user.id);
  return {
    from: process.env.RESEND_FROM_EMAIL ?? "Plate <noreply@plate.app>",
    to: user.email,
    subject: "Your weekly meal plan is ready to generate 🍽️",
    headers: {
      "List-Unsubscribe": `<${unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html:
      `<p>Hi ${escapeHtml(user.name ?? "there")},</p>` +
      `<p>Time to plan your week on Plate! <a href="${appUrl}/plan">Generate your meal plan</a> for the week.</p>` +
      `<p style="font-size:12px;color:#777">You're getting this because you have a Plate account. ` +
      `<a href="${unsubscribe}">Unsubscribe from weekly reminders</a>.</p>`,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let cursor: string | undefined;
  let sent = 0;
  let failed = 0;

  for (;;) {
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        preferences: { is: { isOnboarded: true, emailReminders: true } },
        mealPlans: { none: { generatedAt: { gte: cutoff } } },
      },
      select: { id: true, email: true, name: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (users.length === 0) break;
    cursor = users[users.length - 1].id;

    const { error } = await resend.batch.send(
      users.map((u) => reminderEmail({ id: u.id, email: u.email!, name: u.name }))
    );
    if (error) {
      console.error("weekly-reminder batch failed:", error);
      failed += users.length;
    } else {
      sent += users.length;
    }
  }

  return NextResponse.json({ sent, failed });
}
