/**
 * Lightweight retry helper for transient failures (AsyncStorage hiccups,
 * location timeouts, brief OS resource contention).
 *
 * NOT intended for programmer errors, permission denials, or validation
 * failures — those should propagate immediately.
 */

export type RetryOptions = {
  /** Total attempts (first try + retries). Defaults to 2 (one retry). */
  maxAttempts?: number;
  /** Milliseconds to wait before retrying. Defaults to 250. */
  delayMs?: number;
  /**
   * Return `true` if the error looks transient and the operation should
   * be retried. Defaults to `isTransientError`.
   */
  shouldRetry?: (error: unknown) => boolean;
};

/**
 * Heuristic: an error is transient when it is NOT a known programmer /
 * validation / permission error. This keeps the retry surface narrow.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;

  const msg = error.message.toLowerCase();

  if (msg.includes('already active')) return false;
  if (msg.includes('permission') || msg.includes('denied')) return false;
  if (msg.includes('invalid') || msg.includes('required')) return false;
  if (msg.includes('not granted')) return false;

  return true;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute `fn` up to `maxAttempts` times. Only retries when `shouldRetry`
 * returns true. Returns the successful result or throws the last error.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 2,
    delayMs = 250,
    shouldRetry = isTransientError,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !shouldRetry(err)) {
        throw err;
      }

      await wait(delayMs);
    }
  }

  throw lastError;
}
