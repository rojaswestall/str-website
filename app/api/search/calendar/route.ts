import { connection, NextResponse } from "next/server";

import { errorResponse } from "@/lib/booking/http";
import { getSearchCalendar } from "@/lib/booking/search-server";
import type { SearchCalendarResponse } from "@/lib/booking/types";

/*
 * GET /api/search/calendar — every house's calendar merged into one, for the
 * "check dates" date picker on the home hero and /search.
 *
 *   200 { ok: true, start, end, days: CalendarDay[], maxNights }
 *   502 / 503 { ok: false, code, message }
 *
 * A night is open when any house has it open; its price is the lowest
 * direct nightly rate in cents with the markup applied. Built from the same
 * five-minute calendar cache as /api/calendar/:propertyId.
 */

export async function GET(): Promise<NextResponse<SearchCalendarResponse>> {
  await connection();
  try {
    const calendar = await getSearchCalendar();
    return NextResponse.json(
      { ok: true, ...calendar },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    return errorResponse(error, "search");
  }
}
