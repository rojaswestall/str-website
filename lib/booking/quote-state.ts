import type { Guests, Selection } from "./rules";
import type { BookingErrorBody, Quote } from "./types";

/*
 * What the price panel knows about the quote for the current stay. While a
 * quote is loading no amounts are shown, so a guest never sees two totals;
 * `previous` only keeps the panel's shape stable.
 */
export type QuoteState =
  | { status: "idle" }
  | { status: "loading"; previous: Quote | null }
  | { status: "ready"; quote: Quote }
  | { status: "error"; error: BookingErrorBody; previous: Quote | null };

export type QuoteAction =
  | { type: "request" }
  | { type: "success"; quote: Quote }
  | { type: "failure"; error: BookingErrorBody }
  | { type: "reset" };

export const IDLE_QUOTE: QuoteState = { status: "idle" };

function current(state: QuoteState): Quote | null {
  if (state.status === "ready") return state.quote;
  if (state.status === "loading" || state.status === "error")
    return state.previous;
  return null;
}

export function quoteReducer(
  state: QuoteState,
  action: QuoteAction,
): QuoteState {
  switch (action.type) {
    case "request":
      return { status: "loading", previous: current(state) };
    case "success":
      return { status: "ready", quote: action.quote };
    case "failure":
      return { status: "error", error: action.error, previous: current(state) };
    case "reset":
      return IDLE_QUOTE;
  }
}

/** A quote state together with the key of the stay it describes. */
export type TrackedQuote = { key: string | null; state: QuoteState };

export const IDLE_TRACKED: TrackedQuote = { key: null, state: IDLE_QUOTE };

/**
 * Applies an action that was raised for stay `key`. A result for a
 * different stay than the one tracked starts fresh under its own key; the
 * hook then shows it only while that key is still the current one.
 */
export function trackedQuoteReducer(
  tracked: TrackedQuote,
  { key, action }: { key: string | null; action: QuoteAction },
): TrackedQuote {
  const base = key === tracked.key ? tracked.state : IDLE_QUOTE;
  return { key, state: quoteReducer(base, action) };
}

/** Identity of a quote request; a change means the current quote no longer applies. */
export function quoteKey(
  propertyId: string | undefined,
  selection: Selection,
  guests: Guests,
): string | null {
  if (!propertyId || !selection.checkIn || !selection.checkOut) return null;
  return [
    propertyId,
    selection.checkIn,
    selection.checkOut,
    guests.adults,
    guests.children,
    guests.infants,
    guests.pets,
  ].join("|");
}
