import { nightsBetween, nightsOf } from "./dates";
import type {
  BookingErrorCode,
  CalendarDay,
  Cents,
  MoneyLine,
  Quote,
  QuoteNight,
} from "./types";
import {
  UpstreamCalendarSchema,
  type UpstreamError,
  type UpstreamProperty,
  UpstreamQuoteSchema,
} from "./upstream";

/*
 * Pure translations from Hospitable's shapes to the site's. No I/O, so the
 * captured responses in __fixtures__/ serve as test fixtures.
 */

/** Hosts we will send a guest to; anything else is refused, never followed. */
const CHECKOUT_HOSTS = new Set(["booking.hospitable.com"]);

export function isTrustedCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && CHECKOUT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Configured markup for one channel, or `fallbackPct` when Hospitable lists none. */
export function markupPct(
  property: Pick<UpstreamProperty, "bookings">,
  platform: "direct" | "airbnb",
  fallbackPct: number,
): number {
  const entry = property.bookings?.listing_markups.find(
    (m) => m.platform === platform,
  );
  return entry && entry.type === "percent" ? entry.markup : fallbackPct;
}

export function normalizeCalendar(raw: unknown): CalendarDay[] {
  return UpstreamCalendarSchema.parse(raw).data.days.map((day) => ({
    date: day.date,
    available: day.status.available,
    price: day.price?.amount ?? 0,
    minStay: day.min_stay ?? 1,
    closedToArrival: day.closed_for_checkin ?? false,
    closedToDeparture: day.closed_for_checkout ?? false,
  }));
}

/** Direct price of one night: base plus the channel markup, to the cent. */
export function directNightly(base: Cents, directMarkupPct: number): Cents {
  return Math.round(base * (1 + directMarkupPct / 100));
}

/**
 * Per-night direct prices for a stay, from the calendar's base rates. Returns
 * null when a night is missing from `days` or the nights do not add up to
 * `subTotal` within a cent per night (the quote is authoritative, so a real
 * disagreement means the nights would be wrong to show).
 */
export function deriveNights(
  days: readonly CalendarDay[],
  checkIn: string,
  checkOut: string,
  directMarkupPct: number,
  subTotal: Cents,
): QuoteNight[] | null {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const nights: QuoteNight[] = [];
  for (const date of nightsOf(checkIn, checkOut)) {
    const day = byDate.get(date);
    if (!day) return null;
    nights.push({ date, price: directNightly(day.price, directMarkupPct) });
  }
  if (nights.length === 0) return null;

  const sum = nights.reduce((acc, n) => acc + n.price, 0);
  const diff = subTotal - sum;
  if (diff === 0) return nights;
  if (Math.abs(diff) > nights.length) return null;
  const last = nights[nights.length - 1]!;
  last.price += diff;
  return nights;
}

function lines(
  items: { amount: Cents; label?: string | undefined }[],
  fallback: string,
): MoneyLine[] {
  return items
    .filter((item) => item.amount !== 0)
    .map((item) => ({ label: item.label || fallback, amount: item.amount }));
}

export class UntrustedCheckoutUrlError extends Error {
  constructor(url: string) {
    super(`quote booking_url is not on an allowed checkout host: ${url}`);
    this.name = "UntrustedCheckoutUrlError";
  }
}

export function normalizeQuote(
  raw: unknown,
  stay: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    /** Calendar days covering the stay, for the nightly breakdown. */
    days?: readonly CalendarDay[];
    directMarkupPct: number;
  },
): Quote {
  const { data } = UpstreamQuoteSchema.parse(raw);
  if (!isTrustedCheckoutUrl(data.booking_url)) {
    throw new UntrustedCheckoutUrlError(data.booking_url);
  }
  const f = data.financials;
  const fees = lines(f.fees, "Fee");
  const taxLines = lines(f.taxes, "Tax");
  const cleaning = f.fees.find((fee) => /cleaning/i.test(fee.label ?? ""));
  const subTotal = f.totals.sub_total.amount;

  return {
    quoteId: data.quote_id,
    propertyId: stay.propertyId,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nightCount: nightsBetween(stay.checkIn, stay.checkOut),
    nights: stay.days
      ? deriveNights(
          stay.days,
          stay.checkIn,
          stay.checkOut,
          stay.directMarkupPct,
          subTotal,
        )
      : null,
    subTotal,
    cleaningFee: cleaning?.amount ?? 0,
    fees,
    discounts: lines(f.discounts, "Discount"),
    taxes: taxLines.reduce((acc, t) => acc + t.amount, 0),
    taxLines,
    total: f.totals.total.amount,
    currency: data.currency,
    bookingUrl: data.booking_url,
    quoteExpiresAt: null,
  };
}

export type MappedError = {
  code: BookingErrorCode;
  message: string;
  status: number;
};

/**
 * Hospitable's quote errors, by status and wording, to the site's codes with
 * a message written for the guest. Anything unrecognised is UPSTREAM.
 */
export function mapUpstreamQuoteError(
  status: number,
  body: UpstreamError | null,
): MappedError {
  const reason = body?.reason_phrase ?? "";
  if (status === 422 && /unavailable/i.test(reason)) {
    return {
      code: "UNAVAILABLE",
      status: 409,
      message:
        "Some of those nights are no longer available. Please choose different dates.",
    };
  }
  if (status === 422 && /minimum stay/i.test(reason)) {
    return {
      code: "MIN_STAY",
      status: 422,
      message: "That stay is shorter than the minimum for those dates.",
    };
  }
  if (status === 400 || status === 422) {
    // Validation Hospitable caught that ours did not (an unusual phone, say).
    return {
      code: "INVALID",
      status: 400,
      message:
        "Hospitable couldn't price that stay. Please check the details and try again.",
    };
  }
  return {
    code: "UPSTREAM",
    status: 502,
    message:
      "We couldn't reach our booking system just now. Please try again in a moment.",
  };
}
