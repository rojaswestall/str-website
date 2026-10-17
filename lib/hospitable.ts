/*
 * Shared Hospitable constants and the mode switch.
 *
 * The dashboard snippet (docs/plan.md, step 6) is a single script tag:
 *
 *   <script src="https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js"
 *           data-site-uuid="…" data-property-id="…" data-theme="multi"></script>
 *
 * The loader reads its own data-* attributes, pings api.hospitable.com, and
 * inserts an <iframe id="booking-iframe"> from booking.hospitable.com directly
 * after the script element. Because the iframe id is fixed, it bails out if one
 * already exists on the page, so a mount must clear the previous one first.
 */

export const HOSPITABLE_LOADER_SRC =
  "https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js";

export type HospitableMode = "stub" | "live";

function isMode(value: string | undefined): value is HospitableMode {
  return value === "stub" || value === "live";
}

/**
 * `NEXT_PUBLIC_HOSPITABLE_MODE` wins when it is set to a valid value; otherwise
 * the mode from `content/site.ts` applies. The env var is inlined at build
 * time, so a Vercel environment flips the whole deployment to live.
 */
export function resolveHospitableMode(
  contentMode: HospitableMode,
): HospitableMode {
  const fromEnv = process.env.NEXT_PUBLIC_HOSPITABLE_MODE;
  return isMode(fromEnv) ? fromEnv : contentMode;
}

/** Attributes for the loader script, in the order the dashboard snippet lists them. */
export function bookingWidgetAttributes(options: {
  siteUuid: string;
  propertyId: string;
  theme: string;
}): Record<string, string> {
  return {
    "data-site-uuid": options.siteUuid,
    "data-property-id": options.propertyId,
    "data-theme": options.theme,
  };
}

/*
 * Property search (Hospitable → Direct → Property Search). A different script
 * from the booking loader: a plain library that registers the
 * <hospitable-direct-mps> custom element, so it is loaded once per page and
 * the element is rendered by React. The dashboard lists three pieces:
 *
 *   1. results page:  <hospitable-direct-mps identifier="…" type="custom">
 *   2. home search bar: the same element plus results-url="/search"; it shows
 *      only the bar and navigates to the results page on submit.
 *   3. property pages: copy the search terms from the query string into the
 *      booking iframe's src. The current loader (above) already does this
 *      itself, reading checkin, checkout, the guest counts, locale, and the
 *      utm_* parameters from the page URL, so nothing is added for it.
 *
 * A result click goes to the property URL set per house in the dashboard
 * (docs/plan.md, open items), which must be /stays/<slug> on the live domain.
 */

export const HOSPITABLE_SEARCH_SCRIPT_SRC =
  "https://hospitable.b-cdn.net/direct-property-search-widget/hospitable-search-widget.prod.js";

/** Route of the results page; the value of `results-url` on the hero bar. */
export const SEARCH_RESULTS_PATH = "/search";

/** Attributes for <hospitable-direct-mps>, in the dashboard's order. */
export function searchWidgetAttributes(options: {
  identifier: string;
  /** Set on the hero bar only; the results page omits it. */
  resultsUrl?: string;
}): { identifier: string; type: "custom"; "results-url"?: string } {
  return {
    identifier: options.identifier,
    type: "custom",
    ...(options.resultsUrl ? { "results-url": options.resultsUrl } : {}),
  };
}
