import { connection, type NextRequest, NextResponse } from "next/server";

import { addMonths, isIsoDate } from "@/lib/booking/dates";
import { bookingError, errorResponse } from "@/lib/booking/http";
import {
  CALENDAR_WINDOW_MONTHS,
  getBookingProperty,
  getCalendarWindow,
} from "@/lib/booking/server";
import type { CalendarResponse } from "@/lib/booking/types";

/*
 * GET /api/calendar/:propertyId?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 *   200 { ok: true, propertyId, start, end, days: CalendarDay[] }
 *   400 { ok: false, code: "INVALID", message }     malformed dates
 *   404 { ok: false, code: "NOT_FOUND", message }   not one of our houses
 *   502 / 503 { ok: false, code, message }
 *
 * `start` defaults to today (Austin time) and is never earlier; `end` defaults
 * to, and is capped at, 18 months after today. Both ends are inclusive, as
 * Hospitable's are. The whole 18-month window is fetched once per property
 * and cached for five minutes, so any sub-range is a slice of that.
 */

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/calendar/[propertyId]">,
): Promise<NextResponse<CalendarResponse>> {
  await connection();
  const { propertyId } = await ctx.params;
  const params = request.nextUrl.searchParams;
  const startParam = params.get("start");
  const endParam = params.get("end");

  if (
    (startParam !== null && !isIsoDate(startParam)) ||
    (endParam !== null && !isIsoDate(endParam))
  ) {
    return bookingError(
      "INVALID",
      "Dates must be written like 2027-03-12.",
      400,
    );
  }

  try {
    const property = await getBookingProperty(propertyId);
    if (!property) {
      return bookingError("NOT_FOUND", "We don't have that house.", 404);
    }

    const window = await getCalendarWindow(property.id);
    const cap = addMonths(window.start, CALENDAR_WINDOW_MONTHS);
    const start =
      startParam && startParam > window.start ? startParam : window.start;
    const end = endParam && endParam < cap ? endParam : cap;
    if (end < start) {
      return bookingError("INVALID", "End must not be before start.", 400);
    }

    const days = window.days.filter((d) => d.date >= start && d.date <= end);
    return NextResponse.json(
      { ok: true, propertyId: property.id, start, end, days },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    return errorResponse(error, "calendar");
  }
}
