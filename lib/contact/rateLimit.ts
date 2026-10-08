/*
 * In-memory sliding-window limiter for the contact route.
 *
 * Scope: this map lives in the module, so the window is per server instance.
 * On Vercel that means per function instance; a cold start or a second
 * instance starts from zero, so it bounds abuse rather than enforcing an exact
 * global quota. That is enough for a contact form. If a shared limit is ever
 * needed, replace `consume` with an Upstash Ratelimit call (`@upstash/ratelimit`
 * with `Ratelimit.slidingWindow(5, "10 m")`) keyed the same way.
 */

export const CONTACT_RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } as const;

type Result =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

const hits = new Map<string, number[]>();

/** Records one hit for `key` and says whether it stays within the window. */
export function consume(
  key: string,
  now = Date.now(),
  limit: { max: number; windowMs: number } = CONTACT_RATE_LIMIT,
): Result {
  const windowStart = now - limit.windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= limit.max) {
    const oldest = recent[0] ?? now;
    hits.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + limit.windowMs - now) / 1000),
      ),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) sweep(windowStart);
  return { allowed: true, remaining: limit.max - recent.length };
}

/** Client address: first entry of x-forwarded-for (what Vercel sets), else a shared bucket. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

function sweep(windowStart: number): void {
  for (const [key, times] of hits) {
    const recent = times.filter((t) => t > windowStart);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}
