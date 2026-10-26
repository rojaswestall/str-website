import type { BookingErrorBody, QuoteRequest, QuoteResponse } from "./types";

/*
 * The widget's side of the booking routes. Client-safe. Network and parse
 * failures become a BookingErrorBody so callers handle one shape.
 */

const NETWORK: BookingErrorBody = {
  ok: false,
  code: "UPSTREAM",
  message: "We couldn't reach the booking service. Please try again.",
};

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

export async function getJson<T extends { ok: boolean }>(
  url: string,
  signal?: AbortSignal,
): Promise<T | BookingErrorBody> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    return await parse<T>(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    return NETWORK;
  }
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
