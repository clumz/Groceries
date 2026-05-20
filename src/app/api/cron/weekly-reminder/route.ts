import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleUsers = await prisma.user.findMany({
    where: {
      email: { not: null },
      mealPlans: { none: { generatedAt: { gte: cutoff } } },
    },
    select: { email: true, name: true },
    take: 500,
  });

  const results = await Promise.allSettled(
    staleUsers
      .filter((u) => u.email)
      .map((u) =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@plate.app",
          to: u.email!,
          subject: "Your weekly meal plan is ready to generate 🍽️",
          html: `<p>Hi ${u.name ?? "there"},</p><p>Time to plan your week on Plate! Head over and generate your meal plan for the week.</p>`,
        })
      )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: staleUsers.length });
}
