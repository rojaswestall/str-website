import { timingSafeEqual } from "node:crypto";

import { connection, type NextRequest, NextResponse } from "next/server";

import { airbnbNightlyCents } from "@/lib/booking/comparison";
import { getBookingConfig } from "@/lib/booking/config";
import { isIsoDate } from "@/lib/booking/dates";
import { formatCents } from "@/lib/booking/format";
import { bookingError, errorResponse } from "@/lib/booking/http";
import { directNightly } from "@/lib/booking/normalize";
import { getBookingProperty, getCalendarWindow } from "@/lib/booking/server";

/*
 * GET /api/admin/comparison-check?propertyId=<uuid>&date=YYYY-MM-DD
 * Authorization: Bearer <BOOKING_ADMIN_TOKEN>
 *
 * For spot-checking the Airbnb comparison against the real Airbnb host
 * calendar: the base rate Hospitable holds for that night, what the widget
 * would estimate Airbnb shows, and the direct preview. Nothing is scraped;
 * the admin compares by eye.
 *
 *   200 { propertyId, date, currency, airbnbMarkupPct, directMarkupPct,
 *         base, airbnbEstimate, directPreview, formatted: {...} }
 *   400 INVALID    401 unauthorized    404 NOT_FOUND (house, or date not loaded)
 *   404 when BOOKING_ADMIN_TOKEN is unset: the route does not exist then.
 */

function authorized(request: NextRequest, token: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  await connection();
  const { adminToken } = getBookingConfig();
  if (!adminToken) return new NextResponse(null, { status: 404 });
  if (!authorized(request, adminToken)) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Bad or missing token." },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const propertyId = params.get("propertyId") ?? "";
  const date = params.get("date") ?? "";
  if (!propertyId || !isIsoDate(date)) {
    return bookingError(
      "INVALID",
      "Pass propertyId=<uuid> and date=YYYY-MM-DD.",
      400,
    );
  }

  try {
    const property = await getBookingProperty(propertyId);
    if (!property) {
      return bookingError("NOT_FOUND", "We don't have that house.", 404);
    }
    const day = (await getCalendarWindow(property.id)).days.find(
      (d) => d.date === date,
    );
    if (!day) {
      return bookingError(
        "NOT_FOUND",
        "That date is outside the loaded calendar window.",
        404,
      );
    }

    const base = day.price;
    const airbnbEstimate = airbnbNightlyCents(base, property.markups.airbnbPct);
    const directPreview = directNightly(base, property.markups.directPct);
    const { currency } = property;
    return NextResponse.json(
      {
        ok: true,
        propertyId: property.id,
        name: property.name,
        date,
        available: day.available,
        currency,
        airbnbMarkupPct: property.markups.airbnbPct,
        directMarkupPct: property.markups.directPct,
        base,
        airbnbEstimate,
        directPreview,
        formatted: {
          base: formatCents(base, currency),
          airbnbEstimate: formatCents(airbnbEstimate, currency),
          directPreview: formatCents(directPreview, currency),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "calendar");
  }
}
