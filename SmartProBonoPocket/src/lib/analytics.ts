/**
 * Lightweight observability layer.
 *
 * In development: structured console logs.
 * In production: swap the `send` implementation to forward to
 * Supabase, PostHog, Sentry breadcrumbs, or another provider.
 */

type JsonPrimitive = string | number | boolean | null | undefined;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type EventPayload = Record<string, JsonValue>;

interface AnalyticsProvider {
  sendEvent(name: string, payload?: EventPayload): void;
  sendError(name: string, error: unknown, payload?: EventPayload): void;
}

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

const consoleProvider: AnalyticsProvider = {
  sendEvent(name, payload) {
    if (__DEV__) {
      console.log(`[analytics] ${name}`, payload ?? '');
    }
  },
  sendError(name, error, payload) {
    if (__DEV__) {
      console.warn(`[analytics:error] ${name}`, serializeError(error), payload ?? '');
    }
  },
};

let provider: AnalyticsProvider = consoleProvider;

/** Replace the default console provider (e.g. with Sentry, PostHog). */
export function setAnalyticsProvider(p: AnalyticsProvider): void {
  provider = p;
}

/** Record a named event with optional structured payload. */
export function trackEvent(name: string, payload?: EventPayload): void {
  try {
    provider.sendEvent(name, payload);
  } catch {
    // Never let analytics crash the app
  }
}

/** Record a named error with optional context. */
export function trackError(name: string, error: unknown, payload?: EventPayload): void {
  try {
    provider.sendError(name, error, payload);
  } catch {
    // Never let analytics crash the app
  }
}
