import { z } from "zod";

import { SEARCH_RESULTS_PATH } from "@/lib/hospitable";

import { addDays, isIsoDate, nightsBetween } from "./dates";
import { plural } from "./format";
import {
  canCheckIn,
  checkOutVerdict,
  DEFAULT_GUESTS,
  type Guests,
  MAX_GUESTS,
  MAX_INFANTS,
  MAX_PETS,
  previewNightlyDollars,
  type Selection,
  type StayLimits,
  toDayMap,
} from "./rules";
import type {
  BookingProperty,
  CalendarDay,
  SearchQuery,
  StayEvaluation,
  StayReason,
} from "./types";

/*
 * The site's own property search, as pure functions: given a stay and a
 * house's cached calendar, is the house free, and roughly what would the
 * nights cost. Hospitable has no search endpoint; this is computed from the
 * three calendars the booking routes already cache. Client-safe, no I/O.
 *
 * Availability is the widget's rules (`rules.ts`), imported rather than
 * restated, so a search can never call a house free that the calendar on
 * its page would refuse. The only logic of its own is the guest and pet
 * checks and the price fold.
 */

export type { SearchQuery, StayEvaluation, StayReason };

export type { StayLimits };

/** Nightly direct preview in cents: the whole-dollar figure the calendar shows. */
function previewNightlyCents(base: number, directMarkupPct: number): number {
  return previewNightlyDollars(base, directMarkupPct) * 100;
}

/**
 * One house's verdict for a stay. Permanent limits (capacity, pets) are
 * reported before the calendar, since no other dates would change them.
 */
export function evaluateStay(
  property: Pick<BookingProperty, "maxGuests" | "petsAllowed" | "markups">,
  days: readonly CalendarDay[],
  query: SearchQuery,
  limits: StayLimits,
): StayEvaluation {
  const { checkIn, checkOut } = query;
  const nights = nightsBetween(checkIn, checkOut);
  const refuse = (reason: StayReason, minStay?: number): StayEvaluation =>
    minStay === undefined
      ? { available: false, reason, nights }
      : { available: false, reason, nights, minStay };

  if (nights < 1) return refuse("unavailable");
  if (checkIn < limits.today) return refuse("past");
  if (query.adults + query.children > property.maxGuests) {
    return refuse("max-guests");
  }
  if (query.pets > 0 && !property.petsAllowed) return refuse("pets");

  const map = toDayMap(days);
  if (!canCheckIn(checkIn, map, limits)) {
    const day = map.get(checkIn);
    return refuse(
      day?.available && day.closedToArrival
        ? "closed-to-arrival"
        : "unavailable",
    );
  }
  const verdict = checkOutVerdict(checkIn, checkOut, map, limits);
  if (!verdict.ok) {
    switch (verdict.reason) {
      case "min-stay":
        return refuse("min-stay", verdict.minStay);
      case "max-nights":
        return refuse("max-nights");
      case "closed-to-departure":
        return refuse("closed-to-departure");
      default:
        // "unavailable", a night missing from the window, or a check-out
        // that is not after the check-in: none of them is a free stay.
        return refuse("unavailable");
    }
  }

  let min = Infinity;
  let max = 0;
  let total = 0;
  for (let i = 0; i < nights; i++) {
    // Every night exists: the verdict walked them.
    const night = map.get(addDays(checkIn, i))!;
    const price = previewNightlyCents(night.price, property.markups.directPct);
    min = Math.min(min, price);
    max = Math.max(max, price);
    total += price;
  }
  return {
    available: true,
    nights,
    nightly: { min, max },
    estimatedNightlyTotal: total,
  };
}

/* ------------------------------------------------------------------------ */
/* URL parsing                                                              */
/* ------------------------------------------------------------------------ */

/**
 * The URL contract, with Hospitable's own parameter names so a link works
 * in `hospitable` mode too, where its loader reads them from the page URL:
 *   ?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2&children=0&infants=0&pets=0
 */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>;

type RawParams = Record<string, string | undefined>;

/** First value of each parameter; later repeats are ignored. */
function firstValues(params: SearchParamsInput): RawParams {
  const raw: RawParams = {};
  if (params instanceof URLSearchParams) {
    for (const key of params.keys()) raw[key] = params.get(key) ?? undefined;
    return raw;
  }
  for (const [key, value] of Object.entries(params)) {
    raw[key] = Array.isArray(value) ? value[0] : value;
  }
  return raw;
}

const DATE_MESSAGE = "Use a date like 2027-03-12.";

const isoDate = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .refine(isIsoDate, { error: DATE_MESSAGE });

/** A whole number in [min, max], written as digits; absent means `fallback`. */
const count = (min: number, max: number, fallback: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return fallback;
      if (!/^\d+$/.test(value)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a number.` });
        return z.NEVER;
      }
      const n = Number(value);
      if (n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be between ${min} and ${max}.`,
        });
        return z.NEVER;
      }
      return n;
    });

function querySchema(limits: StayLimits) {
  return z
    .object({
      checkin: isoDate("Choose a check-in date."),
      checkout: isoDate("Choose a check-out date."),
      adults: count(1, MAX_GUESTS, DEFAULT_GUESTS.adults, "Adults"),
      children: count(0, MAX_GUESTS, DEFAULT_GUESTS.children, "Children"),
      infants: count(0, MAX_INFANTS, DEFAULT_GUESTS.infants, "Infants"),
      pets: count(0, MAX_PETS, DEFAULT_GUESTS.pets, "Pets"),
    })
    .check((ctx) => {
      const { checkin, checkout } = ctx.value;
      if (checkin < limits.today) {
        ctx.issues.push({
          code: "custom",
          path: ["checkin"],
          message: "Check-in can't be in the past.",
          input: checkin,
        });
      }
      const nights = nightsBetween(checkin, checkout);
      if (nights < 1) {
        ctx.issues.push({
          code: "custom",
          path: ["checkout"],
          message: "Checkout must be after check-in.",
          input: checkout,
        });
      } else if (nights > limits.maxNights) {
        ctx.issues.push({
          code: "custom",
          path: ["checkout"],
          message: `Stays are limited to ${limits.maxNights} nights. For longer, please contact us.`,
          input: checkout,
        });
      }
    });
}

export type ParsedSearchQuery =
  | { ok: true; query: SearchQuery }
  | { ok: false; errors: Record<string, string> };

/**
 * Strict parse for the availability route: every problem is reported
 * against its URL parameter name (`checkin`, `adults`, …), in the quote
 * route's style. Missing guest counts default to two adults and nothing
 * else; `limits` is today in the booking zone and `MAX_NIGHTS`.
 */
export function parseSearchQuery(
  params: SearchParamsInput,
  limits: StayLimits,
): ParsedSearchQuery {
  const parsed = querySchema(limits).safeParse(firstValues(params));
  if (parsed.success) {
    const { checkin, checkout, ...guests } = parsed.data;
    return {
      ok: true,
      query: { checkIn: checkin, checkOut: checkout, ...guests },
    };
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.map(String).join(".");
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

export type Prefill = { selection: Selection; guests: Guests };

/**
 * Lenient parse for a page: whatever is valid is kept and the rest is
 * ignored, never an error. A check-out is kept only with a check-in it
 * follows within `maxNights`; a guest count that is not a whole number in
 * range falls back to the default for that field. The calendar check
 * (is the check-in free, is the stay allowed) is the widget's, once it has
 * the calendar: `resolveSelection` in `rules.ts`.
 */
export function parsePrefill(
  params: SearchParamsInput,
  limits: StayLimits,
): Prefill {
  const raw = firstValues(params);
  const checkIn =
    isIsoDate(raw.checkin) && raw.checkin >= limits.today ? raw.checkin : null;
  const nights =
    checkIn && isIsoDate(raw.checkout)
      ? nightsBetween(checkIn, raw.checkout)
      : 0;
  const checkOut =
    checkIn && nights >= 1 && nights <= limits.maxNights
      ? (raw.checkout as string)
      : null;

  const pick = (value: string | undefined, min: number, max: number) => {
    if (value === undefined || !/^\d+$/.test(value)) return null;
    const n = Number(value);
    return n >= min && n <= max ? n : null;
  };
  return {
    selection: { checkIn, checkOut },
    guests: {
      adults: pick(raw.adults, 1, MAX_GUESTS) ?? DEFAULT_GUESTS.adults,
      children: pick(raw.children, 0, MAX_GUESTS) ?? DEFAULT_GUESTS.children,
      infants: pick(raw.infants, 0, MAX_INFANTS) ?? DEFAULT_GUESTS.infants,
      pets: pick(raw.pets, 0, MAX_PETS) ?? DEFAULT_GUESTS.pets,
    },
  };
}

/* ------------------------------------------------------------------------ */
/* The search bar                                                           */
/* ------------------------------------------------------------------------ */

/** "2 adults", "2 adults, 1 child, 1 infant, 1 pet": the bar's guests field. */
export function guestSummary(guests: Guests): string {
  const parts = [plural(guests.adults, "adult")];
  if (guests.children > 0) {
    parts.push(
      guests.children === 1 ? "1 child" : `${guests.children} children`,
    );
  }
  if (guests.infants > 0) parts.push(plural(guests.infants, "infant"));
  if (guests.pets > 0) parts.push(plural(guests.pets, "pet"));
  return parts.join(", ");
}

/**
 * The URL contract as a query string, every parameter present and in the
 * bar's field order, so a hydrated submit (`router.push`) and the plain GET
 * the same form makes without JavaScript land on the identical URL.
 */
export function searchQueryString(query: SearchQuery): string {
  return new URLSearchParams({
    checkin: query.checkIn,
    checkout: query.checkOut,
    adults: String(query.adults),
    children: String(query.children),
    infants: String(query.infants),
    pets: String(query.pets),
  }).toString();
}

/** `/search?checkin=…&checkout=…&adults=…&children=…&infants=…&pets=…` */
export function searchHref(query: SearchQuery): string {
  return `${SEARCH_RESULTS_PATH}?${searchQueryString(query)}`;
}

/**
 * The search bar's calendar: every night from `today` through `through`
 * open, with no price. Prices are per house and availability is what the
 * search answers, so the only rules left for the picker are today-forward
 * and the longest stay, which `Calendar` applies from its `limits`.
 */
export function openDays(today: string, through: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let date = today; date <= through; date = addDays(date, 1)) {
    days.push({
      date,
      available: true,
      price: 0,
      minStay: 1,
      closedToArrival: false,
      closedToDeparture: false,
    });
  }
  return days;
}
