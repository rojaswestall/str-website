import { connection, NextResponse } from "next/server";

import { getBookingConfig } from "@/lib/booking/config";
import { errorResponse } from "@/lib/booking/http";
import { listBookingProperties } from "@/lib/booking/server";
import type { PropertiesResponse } from "@/lib/booking/types";

/*
 * GET /api/properties — the bookable houses, with what the widget needs to
 * draw a property switcher and price a calendar: ids, capacity, hero image,
 * and the per-channel markups Hospitable has configured, plus the stay cap
 * and whether the Airbnb comparison is on.
 *
 *   200 { ok: true, properties: BookingProperty[], maxNights, comparisonEnabled }
 *   502 / 503 { ok: false, code, message }
 *
 * Hospitable is asked at most once an hour per server instance.
 */

export async function GET(): Promise<NextResponse<PropertiesResponse>> {
  await connection();
  try {
    const properties = await listBookingProperties();
    const { maxNights, comparisonEnabled } = getBookingConfig();
    return NextResponse.json(
      { ok: true, properties, maxNights, comparisonEnabled },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    return errorResponse(error, "properties");
  }
}
