"use client";

import { useCallback, useEffect, useReducer, useState } from "react";

import { postQuote } from "@/lib/booking/api-client";
import {
  IDLE_QUOTE,
  type QuoteAction,
  quoteKey,
  quoteReducer,
  type QuoteState,
} from "@/lib/booking/quote-state";
import type { Guests, Selection } from "@/lib/booking/rules";
import type { Quote, QuoteRequest } from "@/lib/booking/types";

const DEBOUNCE_MS = 400;

type Tracked = { key: string | null; state: QuoteState };

type TrackedAction = { key: string | null; action: QuoteAction };

/** Results for a stay the guest has since changed are dropped. */
function reducer(tracked: Tracked, { key, action }: TrackedAction): Tracked {
  if (key !== tracked.key) {
    if (action.type !== "request") return tracked;
    return { key, state: quoteReducer(IDLE_QUOTE, action) };
  }
  return { key, state: quoteReducer(tracked.state, action) };
}

/*
 * Prices the current stay with /api/quote, 400ms after the last change to
 * dates or guests, cancelling any request still in flight. A quote only
 * ever describes the stay it was asked for: while the inputs differ from
 * the last answered request the state reads as loading, so stale amounts
 * never appear against new dates.
 */
export function useQuote(input: {
  propertyId: string | undefined;
  selection: Selection;
  guests: Guests;
}): {
  state: QuoteState;
  refresh: () => void;
  /** Adopts a quote fetched elsewhere (the final one with guest details). */
  replace: (quote: Quote) => void;
} {
  const key = quoteKey(input.propertyId, input.selection, input.guests);
  const [tracked, dispatch] = useReducer(reducer, {
    key: null,
    state: IDLE_QUOTE,
  });
  const [attempt, setAttempt] = useState(0);

  const { propertyId, selection, guests } = input;
  useEffect(() => {
    if (!key || !propertyId || !selection.checkIn || !selection.checkOut)
      return;
    const request: QuoteRequest = {
      propertyId,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      adults: guests.adults,
      children: guests.children,
      infants: guests.infants,
      pets: guests.pets,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => {
      postQuote(request, controller.signal)
        .then((body) => {
          if (controller.signal.aborted) return;
          dispatch({
            key,
            action: body.ok
              ? { type: "success", quote: body.quote }
              : { type: "failure", error: body },
          });
        })
        .catch(() => {
          /* aborted: a newer request replaced this one */
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, attempt, propertyId, selection, guests]);

  const refresh = useCallback(() => {
    dispatch({ key, action: { type: "request" } });
    setAttempt((n) => n + 1);
  }, [key]);

  const replace = useCallback(
    (quote: Quote) => dispatch({ key, action: { type: "success", quote } }),
    [key],
  );

  const state: QuoteState =
    tracked.key === key
      ? tracked.state
      : key
        ? { status: "loading", previous: null }
        : IDLE_QUOTE;

  return { state, refresh, replace };
}
