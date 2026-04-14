import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.POSTHOG_KEY) return null;
  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export function captureEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  getClient()?.capture({ distinctId: userId, event, properties });
}
