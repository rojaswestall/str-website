import type { BookingErrorBody, QuoteRequest, QuoteResponse } from "./types";

/*
 * The widget's side of the booking routes. Client-safe. Network and parse
 * failures become a BookingErrorBody so callers handle one shape.
 *
 * A GET that fails before any response arrives (a flaky connection, a
 * backgrounded tab resuming) is tried once more after a short pause; an HTTP
 * error is returned as-is, since the route has already said what is wrong.
 * The quote POST is never retried here: a quote is created upstream on each
 * call, and the widget shows "Try again" instead.
 */

const NETWORK: BookingErrorBody = {
  ok: false,
  code: "UPSTREAM",
  message: "We couldn't reach the booking service. Please try again.",
};

const GET_RETRY_DELAY_MS = 500;

async function parse<T extends { ok: boolean }>(
  response: Response,
): Promise<T | BookingErrorBody> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    return NETWORK;
  }
  if (body && typeof body === "object" && "ok" in body) return body as T;
  return NETWORK;
}

async function fetchOnce<T extends { ok: boolean }>(
  url: string,
  signal: AbortSignal | undefined,
): Promise<T | BookingErrorBody | null> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    return await parse<T>(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function getJson<T extends { ok: boolean }>(
  url: string,
  signal?: AbortSignal,
): Promise<T | BookingErrorBody> {
  const first = await fetchOnce<T>(url, signal);
  if (first !== null) return first;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, GET_RETRY_DELAY_MS);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const second = await fetchOnce<T>(url, signal);
  return second ?? NETWORK;
}

export async function postQuote(
  request: QuoteRequest,
  signal?: AbortSignal,
): Promise<QuoteResponse> {
  try {
    const response = await fetch("/api/quote", {
      method: "POST",
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    return await parse<QuoteResponse>(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    return NETWORK;
  }
}
