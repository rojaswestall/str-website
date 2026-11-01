import { z } from "zod";

import { isIsoDate } from "./dates";

/*
 * Shape of a quote request as POSTed to /api/quote. Client-safe, so the
 * widget can validate with the same rules before asking. Stay rules that
 * need the property (max guests, max nights, dates in the past) are checked
 * in the route, where the property is known.
 */

const isoDate = z
  .string({ error: "Use a date like 2027-03-12." })
  .refine(isIsoDate, { error: "Use a date like 2027-03-12." });

const count = (max: number) => z.number().int().min(0).max(max).default(0);

/** E.164: a plus, a leading non-zero digit, 7 to 15 digits in all. */
export const E164 = /^\+[1-9]\d{6,14}$/;

export const GuestDetailsSchema = z.object({
  firstName: z
    .string({ error: "Please enter your first name." })
    .trim()
    .min(1, { error: "Please enter your first name." })
    .max(80, { error: "First name must be 80 characters or fewer." }),
  lastName: z
    .string({ error: "Please enter your last name." })
    .trim()
    .min(1, { error: "Please enter your last name." })
    .max(80, { error: "Last name must be 80 characters or fewer." }),
  email: z
    .string({ error: "Please enter your email." })
    .trim()
    .pipe(z.email({ error: "Enter a valid email address." })),
  phone: z
    .string({ error: "Please enter your phone number." })
    .trim()
    .regex(E164, {
      error:
        "Enter a phone number with its country code, like +1 512 555 0123.",
    }),
});

export const QuoteRequestSchema = z
  .object({
    propertyId: z.uuid({ error: "Choose one of our houses." }),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z
      .number({ error: "How many adults are staying?" })
      .int()
      .min(1, { error: "At least one adult must stay." })
      .max(16),
    children: count(16),
    infants: count(10),
    pets: count(5),
    guestDetails: GuestDetailsSchema.optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    error: "Checkout must be after check-in.",
    path: ["checkOut"],
  });

export type QuoteRequestInput = z.input<typeof QuoteRequestSchema>;
export type ParsedQuoteRequest = z.infer<typeof QuoteRequestSchema>;

/** Field name → first error message. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".");
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
