import { z } from "zod";

/*
 * Content schemas. Every content module is parsed through these at import
 * time (see content/index.ts), so a typo in a data file fails the build rather
 * than rendering as an empty string.
 *
 * Unconfirmed values are written as the literal placeholder `TBC` or as
 * strings starting with `[TBC]` so they are easy to find, and easy to style
 * with the dashed `Tbc` underline from step 4.
 */

/** Marker for values the hosts still need to confirm (see docs/plan.md). */
export const TBC = "[TBC]";

export function isTbc(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(TBC);
}

const nonEmpty = z.string().trim().min(1);

/** A file under public/ with intrinsic size, enough for next/image. */
export const ImageSchema = z.object({
  src: z.string().regex(/^\/photos\/[a-z0-9/-]+\.(jpg|png|webp|avif)$/, {
    message: "src must be a root-relative path under /photos/",
  }),
  alt: nonEmpty,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Image = z.infer<typeof ImageSchema>;

/** A property photo. Exactly the Image fields plus where it is used. */
export const PhotoSchema = ImageSchema.extend({
  role: z.enum(["hero", "gallery"]),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const QuoteSchema = z.object({
  text: nonEmpty,
  /** First name only, as shown on Airbnb. */
  author: nonEmpty,
  /** Month of the stay as a display string, e.g. "March 2026". */
  month: nonEmpty,
});
export type Quote = z.infer<typeof QuoteSchema>;

/**
 * Per-property Hospitable settings. Site-wide ones live on SiteConfig.
 *
 * The dashboard snippet (Hospitable → Direct → self-hosted site) is a single
 * `<script>` tag whose `data-property-id` names the house; there is no
 * separate "widget id". The real snippet is recorded in docs/plan.md, step 6.
 */
export const HospitableConfigSchema = z.object({
  /** `data-property-id` from the snippet. Null until the house is matched to one (open item, step 6 / 14). */
  propertyId: z
    .string()
    .regex(/^\d+$/, { message: "propertyId is the numeric data-property-id" })
    .nullable(),
});
export type HospitableConfig = z.infer<typeof HospitableConfigSchema>;

/** Position in the CityMap's 400×400 viewBox (design/artifact.html). */
export const MapPinSchema = z.object({
  x: z.number().min(0).max(400),
  y: z.number().min(0).max(400),
});
export type MapPin = z.infer<typeof MapPinSchema>;

export const PropertySchema = z
  .object({
    /** URL segment under /stays/. */
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "slug must be lowercase kebab-case",
    }),
    name: nonEmpty,
    /** Short label for nav, map legend, and tight layouts. */
    shortName: nonEmpty,
    neighborhood: nonEmpty,
    /** The mono line above the name, e.g. "Oak Hill, Austin · off Hwy 290 & 71". */
    locationLine: nonEmpty,
    /** One or two sentences for cards and metadata. */
    summary: nonEmpty,
    /** The full paragraph from the listing band. */
    description: nonEmpty,
    sleeps: z.number().int().positive(),
    bedrooms: z.number().int().positive(),
    beds: z.number().int().positive(),
    /** Half baths count as 0.5. */
    bathrooms: z.number().positive().multipleOf(0.5),
    /** Null while unconfirmed; render as "t.b.c." */
    minNights: z.number().int().positive().nullable(),
    /** USD per night, null while unconfirmed; render as "t.b.c." */
    rateFrom: z.number().positive().nullable(),
    amenities: z.array(nonEmpty).min(1),
    rating: z.number().min(0).max(5),
    reviewCount: z.number().int().nonnegative(),
    guestFavorite: z.boolean(),
    airbnbUrl: z.url({ hostname: /(^|\.)airbnb\.com$/ }),
    /** City of Austin short-term rental license number. */
    strLicense: z.string().regex(/^OL\d+$/, {
      message: "strLicense must look like OL2026086598",
    }),
    hospitable: HospitableConfigSchema,
    photos: z.array(PhotoSchema).min(1),
    quotes: z.array(QuoteSchema),
    mapPin: MapPinSchema,
  })
  .refine(
    (property) => property.photos.some((photo) => photo.role === "hero"),
    {
      message: 'each property needs at least one photo with role "hero"',
      path: ["photos"],
    },
  );
export type Property = z.infer<typeof PropertySchema>;

export const PropertiesSchema = z
  .array(PropertySchema)
  .min(1)
  .superRefine((properties, ctx) => {
    const seen = new Set<string>();
    properties.forEach((property, index) => {
      if (seen.has(property.slug)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate slug "${property.slug}"`,
          path: [index, "slug"],
        });
      }
      seen.add(property.slug);
    });
  });

export const HostSchema = z.object({
  name: nonEmpty,
  /** One sentence. */
  line: nonEmpty,
  photo: ImageSchema.optional(),
});
export type Host = z.infer<typeof HostSchema>;
export const HostsSchema = z.array(HostSchema).min(1);

export const AreaPickSchema = z.object({
  title: nonEmpty,
  kind: z.enum(["eat", "outdoors", "local"]),
  blurb: nonEmpty,
  /** e.g. "10 min from all three houses". */
  distanceLine: nonEmpty,
  link: z.url().optional(),
  photo: ImageSchema.optional(),
});
export type AreaPick = z.infer<typeof AreaPickSchema>;
export const AreaPicksSchema = z.array(AreaPickSchema).min(1);

/** One row of the Practicals definition list. */
export const PolicyRowSchema = z.object({
  term: nonEmpty,
  detail: nonEmpty,
  /** True while the hosts have not confirmed the policy. */
  tbc: z.boolean(),
});
export type PolicyRow = z.infer<typeof PolicyRowSchema>;
export const PolicyRowsSchema = z.array(PolicyRowSchema).min(1);

/** One direct-booking question and answer. */
export const FaqRowSchema = z.object({
  question: nonEmpty,
  answer: nonEmpty,
  tbc: z.boolean(),
});
export type FaqRow = z.infer<typeof FaqRowSchema>;
export const FaqRowsSchema = z.array(FaqRowSchema).min(1);

/** A footer license line; derived from properties, never seeded by hand. */
export const LicenseSchema = z.object({
  propertyName: nonEmpty,
  propertySlug: nonEmpty,
  number: nonEmpty,
  issuer: z.literal("City of Austin"),
});
export type License = z.infer<typeof LicenseSchema>;

export const SiteConfigSchema = z.object({
  name: z.literal("The Austin Collection"),
  tagline: nonEmpty,
  /** Bare host name, no scheme. Placeholder until the domain is chosen. */
  domain: nonEmpty,
  contactEmail: nonEmpty,
  /** Handle without the @. */
  instagram: nonEmpty,
  hospitable: z.object({
    /** "stub" renders the placeholder panels; "live" injects the loader. `NEXT_PUBLIC_HOSPITABLE_MODE` overrides it. */
    mode: z.enum(["stub", "live"]),
    /** `data-site-uuid` from the dashboard snippet; shared by every widget on the site. */
    siteUuid: z.uuid().nullable(),
    /** `data-theme` from the dashboard snippet (the widget style configured there). */
    theme: nonEmpty,
    /**
     * Id for the multi-property search widget. Hospitable's per-property loader
     * requires a property id, so the search widget has a different snippet that
     * has not been copied yet; until it is, HospitableSearch renders the stub.
     */
    searchWidgetId: z.string().min(1).nullable(),
  }),
  /** Null drops the embed entirely (open item: keep the clip?). */
  tiktok: z
    .object({
      url: z.url({ hostname: /(^|\.)tiktok\.com$/ }),
      /** Handle without the @. */
      handle: nonEmpty,
    })
    .nullable(),
  /** The 21:9 image behind the home hero. */
  heroCollage: ImageSchema,
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
