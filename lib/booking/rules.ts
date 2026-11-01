import { addDays, addMonths, nightsBetween } from "./dates";
import type { CalendarDay, Cents } from "./types";

/*
 * Date-picker rules, derived from the normalized calendar. A day's entry
 * describes the *night* that starts on it, so:
 *   - check-in on D needs night D free and D open for arrival;
 *   - check-out on D needs every night from check-in to D-1 free, D open for
 *     departure (D itself may be someone else's arrival), the stay to meet
 *     the check-in day's minimum, and the stay to fit MAX_NIGHTS.
 * Pure functions, so the discovery calendars serve as test fixtures. The
 * quote is the final check; these only keep guests off dates that would fail.
 */

export type DayMap = ReadonlyMap<string, CalendarDay>;

export function toDayMap(days: readonly CalendarDay[]): DayMap {
  return new Map(days.map((day) => [day.date, day]));
}

export type StayLimits = {
  /** Today in the booking time zone; nothing earlier is selectable. */
  today: string;
  maxNights: number;
};

export type Selection = { checkIn: string | null; checkOut: string | null };

export const EMPTY_SELECTION: Selection = { checkIn: null, checkOut: null };

export function canCheckIn(
  date: string,
  map: DayMap,
  limits: StayLimits,
): boolean {
  if (date < limits.today) return false;
  const day = map.get(date);
  return day !== undefined && day.available && !day.closedToArrival;
}

export type CheckOutReason =
  | "before-check-in"
  | "max-nights"
  | "min-stay"
  | "unavailable"
  | "closed-to-departure"
  | "unknown";

export type CheckOutVerdict =
  | { ok: true; nights: number }
  | { ok: false; reason: CheckOutReason; nights: number; minStay?: number };

export function checkOutVerdict(
  checkIn: string,
  date: string,
  map: DayMap,
  limits: StayLimits,
): CheckOutVerdict {
  const nights = nightsBetween(checkIn, date);
  if (nights < 1) return { ok: false, reason: "before-check-in", nights };
  if (nights > limits.maxNights) {
    return { ok: false, reason: "max-nights", nights };
  }
  const minStay = map.get(checkIn)?.minStay ?? 1;
  if (nights < minStay)
    return { ok: false, reason: "min-stay", nights, minStay };
  for (let i = 0; i < nights; i++) {
    const night = map.get(addDays(checkIn, i));
    if (!night) return { ok: false, reason: "unknown", nights };
    if (!night.available) return { ok: false, reason: "unavailable", nights };
  }
  const out = map.get(date);
  if (!out) return { ok: false, reason: "unknown", nights };
  if (out.closedToDeparture) {
    return { ok: false, reason: "closed-to-departure", nights };
  }
  return { ok: true, nights };
}

/**
 * The last date a guest arriving on `checkIn` could check out: the morning
 * after the last free night in a row, or MAX_NIGHTS on, whichever is sooner.
 * Null when not even one night is free.
 */
export function latestCheckOut(
  checkIn: string,
  map: DayMap,
  limits: StayLimits,
): string | null {
  let nights = 0;
  while (nights < limits.maxNights) {
    const night = map.get(addDays(checkIn, nights));
    if (!night || !night.available) break;
    nights++;
  }
  return nights === 0 ? null : addDays(checkIn, nights);
}

/** What a click or Enter on `date` does to the current selection. */
export function selectDate(
  selection: Selection,
  date: string,
  map: DayMap,
  limits: StayLimits,
): Selection {
  const { checkIn, checkOut } = selection;
  if (checkIn && !checkOut && date > checkIn) {
    if (checkOutVerdict(checkIn, date, map, limits).ok) {
      return { checkIn, checkOut: date };
    }
  }
  if (canCheckIn(date, map, limits)) return { checkIn: date, checkOut: null };
  return selection;
}

export type DayRole = "check-in" | "check-out" | "between" | "none";

export type DayView = {
  /** True when a click on this day changes the selection. */
  selectable: boolean;
  /** Night starting on this day is bookable at all. */
  available: boolean;
  past: boolean;
  role: DayRole;
  /** Why this day cannot end the current stay, when a check-in is pending. */
  blocked?: CheckOutReason;
  minStay?: number;
};

/**
 * How one day should render given the selection and the day under the
 * pointer (or keyboard focus) while a check-out is being chosen.
 */
export function dayView(
  date: string,
  selection: Selection,
  preview: string | null,
  map: DayMap,
  limits: StayLimits,
): DayView {
  const day = map.get(date);
  const past = date < limits.today;
  const available = day !== undefined && day.available && !past;
  const { checkIn, checkOut } = selection;
  const arrival = canCheckIn(date, map, limits);

  if (checkIn && !checkOut) {
    if (date === checkIn) {
      return { selectable: true, available, past, role: "check-in" };
    }
    if (date > checkIn) {
      const verdict = checkOutVerdict(checkIn, date, map, limits);
      const end = preview && date <= preview ? preview : null;
      const endOk =
        end !== null && checkOutVerdict(checkIn, end, map, limits).ok;
      const role: DayRole = endOk
        ? date === end
          ? "check-out"
          : "between"
        : "none";
      if (verdict.ok) return { selectable: true, available, past, role };
      return {
        selectable: arrival,
        available,
        past,
        role,
        blocked: verdict.reason,
        minStay: verdict.minStay,
      };
    }
    return { selectable: arrival, available, past, role: "none" };
  }

  let role: DayRole = "none";
  if (checkIn && checkOut) {
    if (date === checkIn) role = "check-in";
    else if (date === checkOut) role = "check-out";
    else if (date > checkIn && date < checkOut) role = "between";
  }
  return { selectable: arrival, available, past, role };
}

/** Preview nightly price in whole dollars: base plus the direct markup. */
export function previewNightlyDollars(
  base: Cents,
  directMarkupPct: number,
): number {
  return Math.round((base / 100) * (1 + directMarkupPct / 100));
}

/** Sum of the preview nightly prices for a stay, or null if a night is missing. */
export function previewTotalDollars(
  checkIn: string,
  checkOut: string,
  map: DayMap,
  directMarkupPct: number,
): number | null {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return null;
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const night = map.get(addDays(checkIn, i));
    if (!night) return null;
    total += previewNightlyDollars(night.price, directMarkupPct);
  }
  return total;
}

export type Guests = {
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

export const DEFAULT_GUESTS: Guests = {
  adults: 2,
  children: 0,
  infants: 0,
  pets: 0,
};

export const MAX_INFANTS = 5;
export const MAX_PETS = 2;

/** Adults and children count toward occupancy; infants and pets do not. */
export function clampGuests(
  guests: Guests,
  limits: { maxGuests: number; petsAllowed: boolean },
): Guests {
  const adults = Math.min(Math.max(1, guests.adults), limits.maxGuests);
  const children = Math.min(
    Math.max(0, guests.children),
    limits.maxGuests - adults,
  );
  return {
    adults,
    children,
    infants: Math.min(Math.max(0, guests.infants), MAX_INFANTS),
    pets: limits.petsAllowed ? Math.min(Math.max(0, guests.pets), MAX_PETS) : 0,
  };
}

/** First day of the month containing `date`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/**
 * The weeks of a month as rows of seven dates (Sunday first), with null in
 * the cells outside the month. Always at least the month's own weeks.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const first = monthStart(month);
  const next = addMonths(first, 1);
  const leading = new Date(`${first}T00:00:00Z`).getUTCDay();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let date = first; date < next; date = addDays(date, 1)) cells.push(date);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
