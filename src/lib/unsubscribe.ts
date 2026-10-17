import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET (or CRON_SECRET) is not set");
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url");
}

export function unsubscribeUrl(userId: string): string {
  const params = new URLSearchParams({ u: userId, t: sign(userId) });
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?${params}`;
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
