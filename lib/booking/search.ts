import { isIsoDate, nightsBetween } from "./dates";
import {
  canCheckIn,
  checkOutVerdict,
  DEFAULT_GUESTS,
  type DayMap,
  type Guests,
  MAX_INFANTS,
  MAX_PETS,
  previewTotalDollars,
  type StayLimits,
} from "./rules";
import type { BookingProperty, CalendarDay } from "./types";

/*
 * The cross-house "check dates" search, as pure functions so they are unit
 * tested against plain calendars. Client-safe.
 *
 * The query travels in the URL with the same parameter names Hospitable's
 * embedded widget reads (checkin, checkout, adults, children, infants, pets),
 * so a result can link to a house page with the stay attached and both the
 * native widget and the embed pick it up.
 */

export type SearchQuery = {
  checkIn: string;
  checkOut: string;
  guests: Guests;
};

export type SearchParams = Record<string, string | string[] | undefined>;

export type ParsedSearch =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | { status: "ok"; query: SearchQuery };

/** Occupancy cap for the search form; each house still applies its own. */
export const SEARCH_MAX_GUESTS = 16;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function count(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = first(value);
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Reads a search from URL parameters, judged against today and the stay cap. */
export function parseSearchParams(
  params: SearchParams,
  limits: StayLimits,
): ParsedSearch {
  const checkIn = first(params.checkin);
  const checkOut = first(params.checkout);
  if (!checkIn && !checkOut) return { status: "empty" };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return {
      status: "invalid",
      message: "Choose a check-in and a checkout date.",
    };
  }
  if (checkIn < limits.today) {
    return { status: "invalid", message: "Check-in can't be in the past." };
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    return { status: "invalid", message: "Checkout must be after check-in." };
  }
  if (nights > limits.maxNights) {
    return {
      status: "invalid",
      message: `Stays can be up to ${limits.maxNights} nights.`,
    };
  }
  const adults = count(
    params.adults,
    DEFAULT_GUESTS.adults,
    1,
    SEARCH_MAX_GUESTS,
  );
  const children = count(params.children, 0, 0, SEARCH_MAX_GUESTS - adults);
  return {
    status: "ok",
    query: {
      checkIn,
      checkOut,
      guests: {
        adults,
        children,
        infants: count(params.infants, 0, 0, MAX_INFANTS),
        pets: count(params.pets, 0, 0, MAX_PETS),
      },
    },
  };
}

/** The query string for a search, also used on links to a house page. */
export function searchQueryString(query: SearchQuery): string {
  const params = new URLSearchParams({
    checkin: query.checkIn,
    checkout: query.checkOut,
    adults: String(query.guests.adults),
    children: String(query.guests.children),
    infants: String(query.guests.infants),
    pets: String(query.guests.pets),
  });
  return params.toString();
}

export type UnavailableReason =
  | "booked"
  | "min-stay"
  | "no-arrival"
  | "no-departure"
  | "max-nights"
  | "too-many-guests"
  | "no-pets"
  | "unknown";

export type HouseVerdict =
  | { available: true; nights: number; totalDollars: number | null }
  | { available: false; reason: UnavailableReason; minStay?: number };

/** Whether one house can take this stay, and if not, the first reason why. */
export function evaluateStay(
  property: Pick<BookingProperty, "maxGuests" | "petsAllowed" | "markups">,
  days: DayMap,
  query: SearchQuery,
  limits: StayLimits,
): HouseVerdict {
  const { guests, checkIn, checkOut } = query;
  if (guests.adults + guests.children > property.maxGuests) {
    return { available: false, reason: "too-many-guests" };
  }
  if (guests.pets > 0 && !property.petsAllowed) {
    return { available: false, reason: "no-pets" };
  }
  if (!canCheckIn(checkIn, days, limits)) {
    const day = days.get(checkIn);
    if (!day) return { available: false, reason: "unknown" };
    return {
      available: false,
      reason: day.available ? "no-arrival" : "booked",
    };
  }
  const verdict = checkOutVerdict(checkIn, checkOut, days, limits);
  if (verdict.ok) {
    return {
      available: true,
      nights: verdict.nights,
      totalDollars: previewTotalDollars(
        checkIn,
        checkOut,
        days,
        property.markups.directPct,
      ),
    };
  }
  switch (verdict.reason) {
    case "min-stay":
      return { available: false, reason: "min-stay", minStay: verdict.minStay };
    case "unavailable":
      return { available: false, reason: "booked" };
    case "closed-to-departure":
      return { available: false, reason: "no-departure" };
    case "max-nights":
      return { available: false, reason: "max-nights" };
    default:
      return { available: false, reason: "unknown" };
  }
}

/** One sentence a guest can read for why a house is not offered. */
export function describeUnavailable(
  verdict: Extract<HouseVerdict, { available: false }>,
): string {
  switch (verdict.reason) {
    case "booked":
      return "Already booked for some of those nights.";
    case "min-stay":
      return `Needs a stay of at least ${verdict.minStay ?? 2} nights from that check-in.`;
    case "no-arrival":
      return "Check-in isn't possible on that day.";
    case "no-departure":
      return "Checkout isn't possible on that day.";
    case "max-nights":
      return "That stay is longer than we take bookings for.";
    case "too-many-guests":
      return "Doesn't sleep that many guests.";
    case "no-pets":
      return "Pets aren't allowed at this house.";
    default:
      return "We couldn't confirm those dates. Try the house page.";
  }
}

export type SearchCalendarSource = {
  days: readonly CalendarDay[];
  directPct: number;
};

/**
 * One calendar for the search form's date picker: a night is open when any
 * house has it open, arrival and departure are allowed when any open house
 * allows them, the minimum stay is the shortest of the open houses, and the
 * price is the lowest direct nightly rate among them, in cents with the
 * markup already applied (so the picker shows it with a 0% markup).
 * Whether one house fits the whole stay is decided per house afterwards.
 */
export function mergeCalendars(
  sources: readonly SearchCalendarSource[],
): CalendarDay[] {
  const merged = new Map<string, CalendarDay>();
  for (const { days, directPct } of sources) {
    for (const day of days) {
      const price = Math.round(day.price * (1 + directPct / 100));
      const current = merged.get(day.date);
      if (!current) {
        merged.set(day.date, day.available ? { ...day, price } : { ...day });
        continue;
      }
      if (!day.available) continue;
      if (!current.available) {
        merged.set(day.date, { ...day, price });
        continue;
      }
      merged.set(day.date, {
        date: day.date,
        available: true,
        price: Math.min(current.price, price),
        minStay: Math.min(current.minStay, day.minStay),
        closedToArrival: current.closedToArrival && day.closedToArrival,
        closedToDeparture: current.closedToDeparture && day.closedToDeparture,
      });
    }
  }
  return [...merged.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
