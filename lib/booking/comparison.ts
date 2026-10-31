import { nightsOf } from "./dates";
import type { CalendarDay, Cents, QuoteComparison } from "./types";

/*
 * What the same nights would cost on Airbnb, from the same base rates.
 * Airbnb shows floor(base × (1 + markup)) per night in whole dollars
 * (verified against the host calendar on three dates, docs/hospitable-
 * discovery.md). Cleaning fee and taxes are the same on both channels and
 * the direct site charges no service fee, so the nightly rate is the only
 * difference, and the comparison is nightly total against nightly total.
 */

/** Airbnb's displayed nightly price, in cents, for a base rate in cents. */
export function airbnbNightlyCents(
  base: Cents,
  airbnbMarkupPct: number,
): Cents {
  return Math.floor((base / 100) * (1 + airbnbMarkupPct / 100)) * 100;
}

/** Sum of Airbnb's nightly prices for a stay, or null if a night is missing. */
export function airbnbStayCents(
  days: readonly CalendarDay[],
  checkIn: string,
  checkOut: string,
  airbnbMarkupPct: number,
): Cents | null {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const nights = nightsOf(checkIn, checkOut);
  if (nights.length === 0) return null;
  let total = 0;
  for (const date of nights) {
    const day = byDate.get(date);
    if (!day) return null;
    total += airbnbNightlyCents(day.price, airbnbMarkupPct);
  }
  return total;
}

/**
 * The comparison line for a quote, or null whenever it should not be shown:
 * the feature is off, a night is unknown, or booking direct is not cheaper.
 * Never a zero or negative saving.
 */
export function compareWithAirbnb(input: {
  enabled: boolean;
  days: readonly CalendarDay[] | undefined;
  checkIn: string;
  checkOut: string;
  airbnbMarkupPct: number;
  /** The quote's nightly subtotal, Hospitable's number. */
  directNightlyTotal: Cents;
  airbnbUrl: string;
}): QuoteComparison | null {
  if (!input.enabled || !input.days) return null;
  const airbnbNightlyTotal = airbnbStayCents(
    input.days,
    input.checkIn,
    input.checkOut,
    input.airbnbMarkupPct,
  );
  if (airbnbNightlyTotal === null) return null;
  const savings = airbnbNightlyTotal - input.directNightlyTotal;
  if (savings <= 0) return null;
  return {
    airbnbNightlyTotal,
    directNightlyTotal: input.directNightlyTotal,
    savings,
    airbnbUrl: input.airbnbUrl,
  };
}
