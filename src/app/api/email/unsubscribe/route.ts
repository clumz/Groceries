import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 16px;color:#1A1410;background:#FFF8EE">` +
      `<h1 style="font-size:22px">${title}</h1>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function params(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return { u, t, valid: !!u && !!t && verifyUnsubscribeToken(u, t) };
}

// GET only shows a confirm button: mail scanners prefetch links, and that
// mustn't unsubscribe anyone.
export async function GET(req: NextRequest) {
  const { u, t, valid } = params(req);
  if (!valid) return page("Link not valid", "<p>This unsubscribe link is invalid or has expired.</p>", 400);
  const action = `/api/email/unsubscribe?${new URLSearchParams({ u, t })}`;
  return page(
    "Stop weekly reminders?",
    `<p>You'll no longer get the Monday email reminding you to plan your week.</p>` +
      `<form method="post" action="${action}"><button style="padding:10px 18px;border-radius:999px;border:1.5px solid #1A1410;background:#1A1410;color:#FFF8EE;font-weight:700">Unsubscribe</button></form>`
  );
}

// Handles both the confirm button and RFC 8058 one-click (List-Unsubscribe-Post).
export async function POST(req: NextRequest) {
  const { u, valid } = params(req);
  if (!valid) return page("Link not valid", "<p>This unsubscribe link is invalid or has expired.</p>", 400);
  await prisma.userPreferences.updateMany({ where: { userId: u }, data: { emailReminders: false } });
  return page("You're unsubscribed", "<p>You won't get weekly reminder emails from Plate any more.</p>");
}
