/*
 * Tiny in-memory TTL cache with in-flight de-duplication, for the property
 * list and calendars. Per server instance (on Vercel, per function instance),
 * like the rate limiter: it bounds upstream calls rather than guaranteeing a
 * single global copy, which is all a 5-minute calendar cache needs.
 */

type Entry<T> = { value: T; expiresAt: number };

const entries = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  now: number = Date.now(),
): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** Drops every entry; tests use it between cases. */
export function clearCache(): void {
  entries.clear();
  inFlight.clear();
}
