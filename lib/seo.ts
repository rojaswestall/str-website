import type { Metadata } from "next";
import { getSite, isTbc, type Property } from "@/content";
import { getSiteUrl } from "@/lib/site-url";

/*
 * SEO helpers shared by the page metadata, the sitemap, robots, the OG image
 * routes, and the JSON-LD blocks.
 *
 * Every absolute URL goes through `canonicalUrl`, which builds on
 * `getSiteUrl()` (NEXT_PUBLIC_SITE_URL, falling back to localhost). Nothing
 * here hardcodes a host, and nothing here hardcodes copy: names, summaries,
 * amenities, ratings, and photos all come from `@/content`.
 *
 * Contact email, phone, and Instagram are still `[TBC]` open items, so the
 * JSON-LD leaves them out entirely rather than emitting placeholders; the
 * content carries no street address, so the PostalAddress stops at the city.
 */

const site = getSite();

/** Absolute URL for a root-relative path, e.g. `canonicalUrl("/stays/oak-hill")`. */
export function canonicalUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}

/** Open Graph fields every page shares. Pages spread this and add their own. */
export const openGraphDefaults = {
  siteName: site.name,
  locale: "en_US",
  type: "website",
} as const satisfies NonNullable<Metadata["openGraph"]>;

/** Site description reused by the home page and the Organization block. */
export const siteDescription =
  "Three short-term rental houses in Austin, Texas, booked directly with the hosts who look after them.";

/** The OG image route for a property page. */
export function propertyOgImageUrl(property: Pick<Property, "slug">): string {
  return canonicalUrl(`/stays/${property.slug}/opengraph-image`);
}

/** Absolute URLs of a property's photos, hero first. */
export function propertyImageUrls(property: Property): string[] {
  const ordered = [
    ...property.photos.filter((photo) => photo.role === "hero"),
    ...property.photos.filter((photo) => photo.role !== "hero"),
  ];
  return ordered.map((photo) => canonicalUrl(photo.src));
}

/** schema.org `VacationRental` for one house, from content only. */
export function vacationRentalJsonLd(property: Property) {
  return {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: property.summary,
    url: canonicalUrl(`/stays/${property.slug}`),
    image: propertyImageUrls(property),
    // Locality only: the content has no street address and none is invented.
    address: {
      "@type": "PostalAddress",
      addressLocality: "Austin",
      addressRegion: "TX",
      addressCountry: "US",
    },
    numberOfRooms: property.bedrooms,
    // `occupancy` belongs to Accommodation, not VacationRental; the validator
    // warns otherwise. The house itself is the contained accommodation.
    containsPlace: {
      "@type": "Accommodation",
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: property.sleeps,
        unitCode: "C62",
      },
      numberOfBedrooms: property.bedrooms,
      numberOfBathroomsTotal: property.bathrooms,
    },
    amenityFeature: property.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
    ...(property.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.rating,
            bestRating: 5,
            reviewCount: property.reviewCount,
          },
        }
      : {}),
    sameAs: [property.airbnbUrl],
    brand: { "@type": "Organization", name: site.name },
  };
}

/** schema.org `Organization` for the site. Contact fields appear only once confirmed. */
export function organizationJsonLd() {
  const sameAs = isTbc(site.instagram)
    ? []
    : [`https://www.instagram.com/${site.instagram.replace(/^@/, "")}`];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: canonicalUrl("/"),
    logo: canonicalUrl("/icon.svg"),
    description: siteDescription,
    ...(isTbc(site.contactEmail) ? {} : { email: site.contactEmail }),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}
