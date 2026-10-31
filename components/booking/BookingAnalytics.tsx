"use client";

import { track } from "@vercel/analytics";
import { type ReactNode, useEffect, useRef } from "react";

/*
 * Forwards the widget's bubbling DOM events to Vercel Web Analytics as
 * custom events (`booking_quote_shown`, …). The widget itself knows nothing
 * about analytics; any other listener on the page can use the same events.
 * Details are flattened to the primitive values `track` accepts. None of the
 * events carries guest details, so nothing personal can leave the page here.
 */

export const BOOKING_EVENTS = [
  "widget_loaded",
  "dates_selected",
  "quote_shown",
  "comparison_shown",
  "reserve_clicked",
] as const;

type Primitive = string | number | boolean | null;

export function flattenDetail(detail: unknown): Record<string, Primitive> {
  const out: Record<string, Primitive> = {};
  if (!detail || typeof detail !== "object") return out;
  for (const [key, value] of Object.entries(detail)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.map(String).join(",");
    }
  }
  return out;
}

export function BookingAnalytics({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handler = (event: Event) => {
      track(
        `booking_${event.type}`,
        flattenDetail((event as CustomEvent).detail),
      );
    };
    for (const name of BOOKING_EVENTS) element.addEventListener(name, handler);
    return () => {
      for (const name of BOOKING_EVENTS) {
        element.removeEventListener(name, handler);
      }
    };
  }, []);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
