import posthog from "posthog-js";

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export async function trackServer(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>
) {
  if (!process.env.POSTHOG_KEY) return;
  const { PostHog } = await import("posthog-node");
  const client = new PostHog(process.env.POSTHOG_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
  client.capture({ distinctId, event, properties });
  await client.shutdown();
}
