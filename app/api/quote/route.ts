import { connection, NextResponse } from "next/server";

import { getBookingConfig } from "@/lib/booking/config";
import { nightsBetween, todayInBookingZone } from "@/lib/booking/dates";
import { bookingError, errorResponse } from "@/lib/booking/http";
import { fieldErrors, QuoteRequestSchema } from "@/lib/booking/schema";
import { createQuote, getBookingProperty } from "@/lib/booking/server";
import type { QuoteResponse } from "@/lib/booking/types";
import { clientKey, consume } from "@/lib/rateLimit";

/*
 * POST /api/quote — prices a stay with Hospitable and returns the hosted
 * checkout URL. Body: QuoteRequest (lib/booking/types.ts).
 *
 *   200 { ok: true, quote: Quote }
 *   400 { ok: false, code: "INVALID", message, errors }
 *   404 { ok: false, code: "NOT_FOUND", message }
 *   409 { ok: false, code: "UNAVAILABLE", message }
 *   422 { ok: false, code: "MIN_STAY" | "MAX_NIGHTS" | "MAX_GUESTS", message }
 *   429 { ok: false, code: "RATE_LIMITED", message }    Retry-After in seconds
 *   502 / 503 { ok: false, code: "UPSTREAM" | "NOT_CONFIGURED", message }
 *
 * Every call creates a quote in Hospitable, so it is rate limited per client
 * address and only accepts houses listed in content. Guest details are
 * forwarded to Hospitable in the request and never logged, stored, or echoed.
 * Quotes are never cached.
 */

const QUOTE_RATE_LIMIT = { max: 20, windowMs: 60 * 1000 } as const;

export async function POST(
  request: Request,
): Promise<NextResponse<QuoteResponse>> {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bookingError("INVALID", "Send the quote request as JSON.", 400, {
      errors: {},
    });
  }

  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return bookingError(
      "INVALID",
      "Please check the highlighted fields.",
      400,
      {
        errors: fieldErrors(parsed.error),
      },
    );
  }
  const input = parsed.data;

  const limit = consume(
    `quote:${clientKey(request.headers)}`,
    Date.now(),
    QUOTE_RATE_LIMIT,
  );
  if (!limit.allowed) {
    return bookingError(
      "RATE_LIMITED",
      "Too many price checks in a short time. Please wait a moment and try again.",
      429,
      { headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const property = await getBookingProperty(input.propertyId);
    if (!property) {
      return bookingError("NOT_FOUND", "We don't have that house.", 404);
    }

    if (input.checkIn < todayInBookingZone()) {
      return bookingError("INVALID", "Check-in can't be in the past.", 400, {
        errors: { checkIn: "Check-in can't be in the past." },
      });
    }
    const { maxNights } = getBookingConfig();
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights > maxNights) {
      return bookingError(
        "MAX_NIGHTS",
        `Stays are limited to ${maxNights} nights. For longer, please contact us.`,
        422,
      );
    }
    if (input.adults + input.children > property.maxGuests) {
      return bookingError(
        "MAX_GUESTS",
        `${property.name} sleeps up to ${property.maxGuests} guests.`,
        422,
      );
    }

    const quote = await createQuote(input, property);
    return NextResponse.json(
      { ok: true, quote },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "quote");
  }
}
