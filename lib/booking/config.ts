import { z } from "zod";

/*
 * Booking configuration, read from the environment on every call so a test
 * can set variables before asking. Only `hospitable.pat` is secret; the
 * server-only client is the single place that uses it.
 *
 * Markup percentages are fallbacks: Hospitable reports the configured
 * per-channel markups on each property (`listing_markups`), and those win.
 */

const percent = z.coerce.number().min(0).max(100);

const EnvSchema = z.object({
  HOSPITABLE_PAT: z.string().trim().min(1).optional(),
  HOSPITABLE_PERSONAL_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  HOSPITABLE_CUSTOM_SITE_ID: z.uuid().optional(),
  AIRBNB_MARKUP_PCT: percent.default(15.5),
  DIRECT_MARKUP_PCT: percent.default(11),
  /** JSON object: Hospitable property id → public Airbnb listing URL. */
  AIRBNB_LISTING_URLS: z
    .string()
    .trim()
    .default("")
    .transform((raw, ctx) => {
      if (!raw) return {} as Record<string, string>;
      try {
        return z.record(z.uuid(), z.url()).parse(JSON.parse(raw));
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: `must be a JSON object of property id → Airbnb URL (${error instanceof Error ? error.message : String(error)})`,
        });
        return z.NEVER;
      }
    }),
  COMPARISON_ENABLED: z
    .string()
    .trim()
    .toLowerCase()
    .default("true")
    .transform((v) => !["0", "false", "no", "off"].includes(v)),
  MAX_NIGHTS: z.coerce.number().int().min(1).max(365).default(90),
  BOOKING_ADMIN_TOKEN: z.string().trim().min(16).optional(),
});

export type BookingConfig = {
  hospitable: {
    pat: string | null;
    /** `custom_site_id` for quotes; null falls back to content's site uuid. */
    customSiteId: string | null;
  };
  airbnbMarkupPct: number;
  directMarkupPct: number;
  airbnbListingUrls: Record<string, string>;
  comparisonEnabled: boolean;
  maxNights: number;
  adminToken: string | null;
};

type Env = Record<string, string | undefined>;

function blankToUndefined(env: Env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return out;
}

export function getBookingConfig(env: Env = process.env): BookingConfig {
  const parsed = EnvSchema.safeParse(blankToUndefined(env));
  if (!parsed.success) {
    throw new Error(
      `booking configuration is invalid:\n${z.prettifyError(parsed.error)}`,
    );
  }
  const e = parsed.data;
  return {
    hospitable: {
      pat: e.HOSPITABLE_PAT ?? e.HOSPITABLE_PERSONAL_ACCESS_TOKEN ?? null,
      customSiteId: e.HOSPITABLE_CUSTOM_SITE_ID ?? null,
    },
    airbnbMarkupPct: e.AIRBNB_MARKUP_PCT,
    directMarkupPct: e.DIRECT_MARKUP_PCT,
    airbnbListingUrls: e.AIRBNB_LISTING_URLS,
    comparisonEnabled: e.COMPARISON_ENABLED,
    maxNights: e.MAX_NIGHTS,
    adminToken: e.BOOKING_ADMIN_TOKEN ?? null,
  };
}
