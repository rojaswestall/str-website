import "server-only";

import { getBookingConfig } from "./config";
import { todayInBookingZone } from "./dates";
import { toDayMap, type StayLimits } from "./rules";
import {
  evaluateStay,
  type HouseVerdict,
  mergeCalendars,
  type SearchQuery,
} from "./search";
import {
  CALENDAR_WINDOW_MONTHS,
  getCalendarWindow,
  listBookingProperties,
} from "./server";
import type { BookingProperty, CalendarDay } from "./types";

/*
 * Server side of the "check dates" search. Reads the same cached catalog and
 * calendars as the booking routes, so a search costs Hospitable nothing
 * extra within the five-minute calendar cache.
 */

export { CALENDAR_WINDOW_MONTHS };

export function searchLimits(): StayLimits {
  return {
    today: todayInBookingZone(),
    maxNights: getBookingConfig().maxNights,
  };
}

export type HouseResult = {
  property: BookingProperty;
  verdict: HouseVerdict;
};

/**
 * Every bookable house with its verdict for the stay, in content order.
 * A house whose calendar cannot be read is reported as "unknown" rather
 * than failing the whole search; a catalog failure throws.
 */
export async function searchHouses(query: SearchQuery): Promise<HouseResult[]> {
  const properties = await listBookingProperties();
  const limits = searchLimits();
  const windows = await Promise.allSettled(
    properties.map((p) => getCalendarWindow(p.id)),
  );
  return properties.map((property, i) => {
    const window = windows[i]!;
    if (window.status === "rejected") {
      console.warn(
        `[search] calendar unavailable for ${property.slug}: ${String(window.reason)}`,
      );
      return { property, verdict: { available: false, reason: "unknown" } };
    }
    return {
      property,
      verdict: evaluateStay(
        property,
        toDayMap(window.value.days),
        query,
        limits,
      ),
    };
  });
}

export type SearchCalendar = {
  start: string;
  end: string;
  days: CalendarDay[];
  maxNights: number;
};

/** The merged calendar behind the search form's date picker. */
export async function getSearchCalendar(): Promise<SearchCalendar> {
  const properties = await listBookingProperties();
  const windows = await Promise.allSettled(
    properties.map((p) => getCalendarWindow(p.id)),
  );
  const sources = [];
  let start = todayInBookingZone();
  let end = start;
  for (const [i, window] of windows.entries()) {
    if (window.status !== "fulfilled") continue;
    start = window.value.start;
    if (window.value.end > end) end = window.value.end;
    sources.push({
      days: window.value.days,
      directPct: properties[i]!.markups.directPct,
    });
  }
  if (sources.length === 0) {
    const reason = windows.find((w) => w.status === "rejected");
    throw reason?.status === "rejected"
      ? reason.reason
      : new Error("No bookable houses.");
  }
  return {
    start,
    end,
    days: mergeCalendars(sources),
    maxNights: getBookingConfig().maxNights,
  };
}
