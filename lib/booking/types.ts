/*
 * Shapes the booking API routes return and the widget consumes. Client-safe:
 * no server imports. Every amount is an integer in minor units (cents) in
 * the property's `currency`; the widget formats for display.
 */

export type Cents = number;

export type BookingProperty = {
  /** Hospitable property id (UUID); the `propertyId` every other route takes. */
  id: string;
  slug: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  /** Root-relative path under /photos/. */
  heroImage: { src: string; alt: string; width: number; height: number };
  /** "16:00" / "10:00", as Hospitable reports them. */
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  petsAllowed: boolean;
  /** Per-channel listing markups configured in Hospitable, in percent. */
  markups: { directPct: number; airbnbPct: number };
  /** Public Airbnb listing, for the comparison link. */
  airbnbUrl: string;
};

export type CalendarDay = {
  date: string;
  available: boolean;
  /** Hospitable's base nightly rate (pre-markup), in cents. */
  price: Cents;
  minStay: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
};

export type MoneyLine = { label: string; amount: Cents };

export type QuoteNight = { date: string; price: Cents };

export type Quote = {
  quoteId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nightCount: number;
  /**
   * Per-night direct prices derived from the calendar and the property's
   * direct markup. Null when they could not be reconciled with `subTotal`,
   * which is always Hospitable's number.
   */
  nights: QuoteNight[] | null;
  subTotal: Cents;
  cleaningFee: Cents;
  /** Every non-zero fee line, cleaning included. */
  fees: MoneyLine[];
  discounts: MoneyLine[];
  taxes: Cents;
  taxLines: MoneyLine[];
  total: Cents;
  currency: string;
  /** Hospitable's hosted checkout for this quote. */
  bookingUrl: string;
  /** Hospitable sends no expiry; kept so the widget has one place to look. */
  quoteExpiresAt: string | null;
  /** Present only when booking direct is cheaper and the feature is on. */
  comparison: QuoteComparison | null;
};

/**
 * What the same nights would cost on Airbnb, estimated from the base rates
 * and the house's configured Airbnb markup. Nightly totals only: cleaning
 * fee and taxes are the same on both channels.
 */
export type QuoteComparison = {
  airbnbNightlyTotal: Cents;
  directNightlyTotal: Cents;
  /** Always positive. */
  savings: Cents;
  /** The public Airbnb listing, so a guest can check. */
  airbnbUrl: string;
};

export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  /** E.164. */
  phone: string;
};

export type QuoteRequest = {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  infants?: number;
  pets?: number;
  guestDetails?: GuestDetails;
};

export type BookingErrorCode =
  | "INVALID"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "MIN_STAY"
  | "MAX_NIGHTS"
  | "MAX_GUESTS"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "UPSTREAM";

export type BookingErrorBody = {
  ok: false;
  code: BookingErrorCode;
  /** Plain English, written to show the guest verbatim. */
  message: string;
  /** Field → message, on INVALID only. */
  errors?: Record<string, string>;
};

export type PropertiesResponse =
  | {
      ok: true;
      properties: BookingProperty[];
      /** Longest stay the quote route will price. */
      maxNights: number;
      comparisonEnabled: boolean;
    }
  | BookingErrorBody;

export type CalendarResponse =
  | {
      ok: true;
      propertyId: string;
      start: string;
      end: string;
      days: CalendarDay[];
    }
  | BookingErrorBody;

export type QuoteResponse = { ok: true; quote: Quote } | BookingErrorBody;

/** A stay to check every house against: the URL contract of /search. */
export type SearchQuery = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

/**
 * Why a house is not free for a stay. All but `unknown` come from the
 * calendar rules the widget uses (`rules.ts`) or the house's capacity;
 * `unknown` means its calendar could not be read, which is never reported
 * as free.
 */
export type StayReason =
  | "unavailable"
  | "min-stay"
  | "max-nights"
  | "closed-to-arrival"
  | "closed-to-departure"
  | "max-guests"
  | "pets"
  | "past"
  | "unknown";

/**
 * One house's answer for a stay. The amounts are estimates from the
 * calendar, each night at the direct preview price the widget shows
 * (`previewNightlyDollars`, in cents), nights only: no cleaning fee, no
 * taxes. The quote on the house page is the price.
 */
export type StayEvaluation =
  | {
      available: true;
      nights: number;
      nightly: { min: Cents; max: Cents };
      estimatedNightlyTotal: Cents;
    }
  | {
      available: false;
      reason: StayReason;
      nights: number;
      /** The check-in day's minimum, on `min-stay` only. */
      minStay?: number;
    };

/** What a search result card needs about a house, plus its verdict. */
export type SearchResult = Pick<
  BookingProperty,
  | "id"
  | "slug"
  | "name"
  | "bedrooms"
  | "bathrooms"
  | "maxGuests"
  | "petsAllowed"
  | "heroImage"
  | "currency"
> & { stay: StayEvaluation };

export type SearchAvailability = {
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Every bookable house, in content order. */
  results: SearchResult[];
};

export type SearchResponse =
  ({ ok: true } & SearchAvailability) | BookingErrorBody;

/**
 * What the server hands the widget at render time so the calendar is in
 * the first HTML instead of two fetches later. `calendar` is null when the
 * house is not bookable or its calendar could not be read; the widget then
 * fetches (or fails) on the client exactly as it would with nothing.
 */
export type InitialBookingData = {
  catalog: {
    properties: BookingProperty[];
    maxNights: number;
    comparisonEnabled: boolean;
  };
  calendar: {
    propertyId: string;
    start: string;
    end: string;
    days: CalendarDay[];
  } | null;
};
