import PostHog from "posthog-react-native";

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const HOST = "https://us.i.posthog.com";

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (!KEY) return null;
  if (!_client) {
    _client = new PostHog(KEY, {
      host: HOST,
      flushAt: 20,
      flushInterval: 30_000,
    });
  }
  return _client;
}

export function capture(event: string, properties?: Record<string, any>): void {
  client()?.capture(event, properties);
}

export function identify(userId: string, traits?: Record<string, any>): void {
  client()?.identify(userId, traits);
}

export function analyticsReset(): void {
  client()?.reset();
}
