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
