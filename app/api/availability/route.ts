import { connection, type NextRequest, NextResponse } from "next/server";

import { getBookingConfig } from "@/lib/booking/config";
import { todayInBookingZone } from "@/lib/booking/dates";
import { bookingError, errorResponse } from "@/lib/booking/http";
import { parseSearchQuery } from "@/lib/booking/search";
import { searchAvailability } from "@/lib/booking/server";
import type { SearchResponse } from "@/lib/booking/types";
import { clientKey, consume } from "@/lib/rateLimit";

/*
 * GET /api/availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
 *                      &adults=2&children=0&infants=0&pets=0
 *
 *   200 { ok: true, checkIn, checkOut, nights, results: SearchResult[] }
 *   400 { ok: false, code: "INVALID", message, errors }   field → message
 *   429 { ok: false, code: "RATE_LIMITED", message }      Retry-After in seconds
 *   502 / 503 { ok: false, code: "UPSTREAM" | "NOT_CONFIGURED", message }
 *
 * Which of our houses are free for a stay, with an estimate of the nights
 * from the calendar. Hospitable has no search endpoint and none is called:
 * the answer is computed from the same cached property list and calendars
 * the other booking routes serve, with the widget's own rules, so a house
 * this route calls free is one its calendar would let the guest pick. The
 * estimate is nights only, before fees and taxes; the quote on the house
 * page is the price. Missing guest counts default to two adults. Other
 * methods get Next's automatic 405.
 *
 * 502 UPSTREAM only when every house's calendar failed; a single failure
 * is reported on that house as `reason: "unknown"`, never as free.
 */

const AVAILABILITY_RATE_LIMIT = { max: 60, windowMs: 60 * 1000 } as const;
const UPSTREAM =
  "We couldn't reach our booking system just now. Please try again in a moment.";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SearchResponse>> {
  await connection();

  const parsed = parseSearchQuery(request.nextUrl.searchParams, {
    today: todayInBookingZone(),
    maxNights: getBookingConfig().maxNights,
  });
  if (!parsed.ok) {
    return bookingError("INVALID", "Please check your dates and guests.", 400, {
      errors: parsed.errors,
    });
  }

  const limit = consume(
    `availability:${clientKey(request.headers)}`,
    Date.now(),
    AVAILABILITY_RATE_LIMIT,
  );
  if (!limit.allowed) {
    return bookingError(
      "RATE_LIMITED",
      "Too many searches in a short time. Please wait a moment and try again.",
      429,
      { headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const search = await searchAvailability(parsed.query);
    const allFailed =
      search.results.length > 0 &&
      search.results.every(
        (r) => !r.stay.available && r.stay.reason === "unknown",
      );
    if (allFailed) {
      console.error("[booking:availability] every calendar failed to load");
      return bookingError("UPSTREAM", UPSTREAM, 502);
    }
    return NextResponse.json(
      { ok: true, ...search },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "availability");
  }
}
