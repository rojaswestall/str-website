import { z } from "zod";

import { getPropertySlugs } from "@/content";

/*
 * Shape of a contact inquiry as POSTed to /api/contact. Step 10's form sends
 * exactly these fields; `website` is the honeypot (hidden input a human never
 * fills). Empty strings from optional inputs are treated as "not provided".
 */

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional(),
);

const optionalIsoDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.iso.date({ error: "Use a date like 2027-03-12." }).optional(),
);

export const ContactInquirySchema = z
  .object({
    name: z
      .string({ error: "Please tell us your name." })
      .trim()
      .min(2, { error: "Name must be at least 2 characters." })
      .max(80, { error: "Name must be 80 characters or fewer." }),
    email: z
      .string({ error: "Please enter your email." })
      .trim()
      .pipe(z.email({ error: "Enter a valid email address." })),
    message: z
      .string({ error: "Please write a message." })
      .trim()
      .min(10, { error: "Message must be at least 10 characters." })
      .max(2000, { error: "Message must be 2000 characters or fewer." }),
    property: optionalString.pipe(
      z
        .string()
        .refine((slug) => getPropertySlugs().includes(slug), {
          error: "Choose one of our houses or leave this blank.",
        })
        .optional(),
    ),
    checkIn: optionalIsoDate,
    checkOut: optionalIsoDate,
    website: optionalString.pipe(
      z.string().max(0, { error: "Leave this field empty." }).optional(),
    ),
  })
  .refine(
    (data) => !data.checkIn || !data.checkOut || data.checkOut > data.checkIn,
    {
      error: "Checkout must be after check-in.",
      path: ["checkOut"],
    },
  );

export type ContactInquiry = z.infer<typeof ContactInquirySchema>;

/** Field name → first error message, the shape the 400 response carries. */
export type ContactFieldErrors = Partial<
  Record<keyof z.input<typeof ContactInquirySchema>, string>
>;

export function fieldErrors(error: z.ZodError): ContactFieldErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors as ContactFieldErrors;
}

/** True when the honeypot carries anything at all, before any other validation. */
export function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const website = (body as Record<string, unknown>).website;
  return typeof website === "string" ? website.trim() !== "" : website != null;
}
