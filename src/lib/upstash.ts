import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const generatePlanLimiter = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "rl:generate-plan:free",
  }),
  premium: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    prefix: "rl:generate-plan:premium",
  }),
};

export const mapIngredientsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:map-ingredients",
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  return redis.setex(key, ttlSeconds, JSON.stringify(value));
}

/** Per-user key when signed in; otherwise the client IP as set by the platform proxy. */
export function rateLimitKey(headers: Headers, userId: string | null | undefined): string {
  if (userId) return `user:${userId}`;
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${ip || "unknown"}`;
}
