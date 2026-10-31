/*
 * One more try for a call that failed in a way that is likely transient.
 * Deliberately minimal: a single retry after a short pause is enough to
 * ride out a dropped connection or a momentary 5xx without turning a real
 * outage into a pile-up, and the caller decides what counts as transient.
 */

export type RetryOptions = {
  /** Total attempts, including the first. Default 2. */
  attempts?: number;
  /** Pause before each retry, in milliseconds. Default 300. */
  delayMs?: number;
  /** Whether the error that ended an attempt is worth another go. */
  shouldRetry: (error: unknown) => boolean;
  /** Called before each retry; the client logs here. */
  onRetry?: (error: unknown, attempt: number) => void;
  /** Injected by tests to avoid real waits. */
  sleep?: (ms: number) => Promise<void>;
};

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  run: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const delayMs = options.delayMs ?? 300;
  const sleep = options.sleep ?? realSleep;

  let attempt = 1;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts || !options.shouldRetry(error)) throw error;
      options.onRetry?.(error, attempt);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}
