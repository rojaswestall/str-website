import { z } from "zod";

/*
 * The parts of Hospitable Public API v2 responses this site reads, as zod
 * schemas, so a changed upstream shape fails loudly in one place. Field
 * names and units were verified against real responses (docs/hospitable-discovery.md).
 * Unknown fields pass through untouched.
 */

const money = z.object({
  amount: z.number().int(),
  formatted: z.string().optional(),
});

const moneyLine = money.extend({
  label: z.string().optional(),
  category: z.string().optional(),
});

export const UpstreamPropertySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  public_name: z.string().nullish(),
  listed: z.boolean(),
  currency: z.string(),
  checkin: z.string().nullish(),
  checkout: z.string().nullish(),
  capacity: z.object({
    max: z.number().int(),
    bedrooms: z.number(),
    beds: z.number().nullish(),
    bathrooms: z.number(),
  }),
  house_rules: z
    .object({ pets_allowed: z.boolean().nullish() })
    .partial()
    .nullish(),
  bookings: z
    .object({
      fees: z.array(z.object({ name: z.string(), value: money })).default([]),
      listing_markups: z
        .array(
          z.object({
            platform: z.string(),
            type: z.string(),
            markup: z.number(),
          }),
        )
        .default([]),
    })
    .nullish(),
});
export type UpstreamProperty = z.infer<typeof UpstreamPropertySchema>;

export const UpstreamPropertyListSchema = z.object({
  data: z.array(UpstreamPropertySchema),
});

export const UpstreamCalendarDaySchema = z.object({
  date: z.string(),
  min_stay: z.number().int().nullish(),
  closed_for_checkin: z.boolean().nullish(),
  closed_for_checkout: z.boolean().nullish(),
  status: z.object({
    available: z.boolean(),
    reason: z.string().nullish(),
  }),
  price: money.extend({ currency: z.string().optional() }).nullish(),
});
export type UpstreamCalendarDay = z.infer<typeof UpstreamCalendarDaySchema>;

export const UpstreamCalendarSchema = z.object({
  data: z.object({ days: z.array(UpstreamCalendarDaySchema) }),
});

export const UpstreamQuoteSchema = z.object({
  data: z.object({
    quote_id: z.string(),
    booking_url: z.url(),
    currency: z.string().default("USD"),
    financials: z.object({
      fees: z.array(moneyLine).default([]),
      taxes: z.array(moneyLine).default([]),
      discounts: z.array(moneyLine).default([]),
      totals: z.object({
        sub_total: money,
        total: money,
      }),
    }),
  }),
});
export type UpstreamQuote = z.infer<typeof UpstreamQuoteSchema>;

/** Hospitable's error body: `{status_code, reason_phrase, errors?}`. */
export const UpstreamErrorSchema = z.object({
  status_code: z.number().optional(),
  reason_phrase: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});
export type UpstreamError = z.infer<typeof UpstreamErrorSchema>;
