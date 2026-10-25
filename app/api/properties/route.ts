import { connection, NextResponse } from "next/server";

import { errorResponse } from "@/lib/booking/http";
import { listBookingProperties } from "@/lib/booking/server";
import type { PropertiesResponse } from "@/lib/booking/types";

/*
 * GET /api/properties — the bookable houses, with what the widget needs to
 * draw a property switcher and price a calendar: ids, capacity, hero image,
 * and the per-channel markups Hospitable has configured.
 *
 *   200 { ok: true, properties: BookingProperty[] }
 *   502 / 503 { ok: false, code, message }
 *
 * Hospitable is asked at most once an hour per server instance.
 */

export async function GET(): Promise<NextResponse<PropertiesResponse>> {
  await connection();
  try {
    const properties = await listBookingProperties();
    return NextResponse.json(
      { ok: true, properties },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    return errorResponse(error, "properties");
  }
}
