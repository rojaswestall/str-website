import "server-only";

import { getAllProperties, getSite, type Property } from "@/content";

import { cached } from "./cache";
import { hospitableFetch } from "./client";
import { getBookingConfig } from "./config";
import { addMonths, todayInBookingZone } from "./dates";
import { markupPct, normalizeCalendar, normalizeQuote } from "./normalize";
import type { ParsedQuoteRequest } from "./schema";
import type { BookingProperty, CalendarDay, Quote } from "./types";
import { UpstreamPropertyListSchema } from "./upstream";

/*
 * The booking data the routes serve, built from Hospitable plus content.
 * Content is the allow-list: a property the site does not list cannot be
 * quoted or read through this layer, whatever Hospitable returns.
 */

const PROPERTIES_TTL_MS = 60 * 60 * 1000;
const CALENDAR_TTL_MS = 5 * 60 * 1000;
/** How far ahead the calendar is read; also the cap on any requested range. */
export const CALENDAR_WINDOW_MONTHS = 18;

function contentByHospitableId(): Map<string, Property> {
  const map = new Map<string, Property>();
  for (const property of getAllProperties()) {
    if (property.hospitable.uuid) map.set(property.hospitable.uuid, property);
  }
  return map;
}

export async function listBookingProperties(): Promise<BookingProperty[]> {
  return cached("properties", PROPERTIES_TTL_MS, async () => {
    const config = getBookingConfig();
    const raw = await hospitableFetch("/properties", {
      query: { include: "bookings", per_page: 50 },
    });
    const upstream = UpstreamPropertyListSchema.parse(raw).data;
    const content = contentByHospitableId();

    const properties: BookingProperty[] = [];
    for (const local of getAllProperties()) {
      const remote = upstream.find((p) => p.id === local.hospitable.uuid);
      if (!remote || !remote.listed || !content.has(remote.id)) continue;
      const hero =
        local.photos.find((p) => p.role === "hero") ?? local.photos[0]!;
      properties.push({
        id: remote.id,
        slug: local.slug,
        name: local.name,
        bedrooms: remote.capacity.bedrooms,
        bathrooms: remote.capacity.bathrooms,
        maxGuests: remote.capacity.max,
        heroImage: {
          src: hero.src,
          alt: hero.alt,
          width: hero.width,
          height: hero.height,
        },
        checkInTime: remote.checkin ?? "",
        checkOutTime: remote.checkout ?? "",
        currency: remote.currency,
        petsAllowed: remote.house_rules?.pets_allowed ?? false,
        markups: {
          directPct: markupPct(remote, "direct", config.directMarkupPct),
          airbnbPct: markupPct(remote, "airbnb", config.airbnbMarkupPct),
        },
        airbnbUrl: config.airbnbListingUrls[remote.id] ?? local.airbnbUrl,
      });
    }
    return properties;
  });
}

export async function getBookingProperty(
  id: string,
): Promise<BookingProperty | undefined> {
  if (!contentByHospitableId().has(id)) return undefined;
  return (await listBookingProperties()).find((p) => p.id === id);
}

export type CalendarWindow = {
  start: string;
  end: string;
  days: CalendarDay[];
};

/** The next CALENDAR_WINDOW_MONTHS of one property's calendar, cached 5 minutes. */
export async function getCalendarWindow(
  propertyId: string,
): Promise<CalendarWindow> {
  const start = todayInBookingZone();
  const end = addMonths(start, CALENDAR_WINDOW_MONTHS);
  return cached(
    `calendar:${propertyId}:${start}`,
    CALENDAR_TTL_MS,
    async () => {
      const raw = await hospitableFetch(
        `/properties/${encodeURIComponent(propertyId)}/calendar`,
        { query: { start_date: start, end_date: end } },
      );
      return { start, end, days: normalizeCalendar(raw) };
    },
  );
}

export async function createQuote(
  request: ParsedQuoteRequest,
  property: BookingProperty,
): Promise<Quote> {
  const config = getBookingConfig();
  const customSiteId =
    config.hospitable.customSiteId ?? getSite().hospitable.siteUuid;
  if (!customSiteId) {
    throw new Error("HOSPITABLE_CUSTOM_SITE_ID is not set.");
  }
  const details = request.guestDetails;

  const raw = await hospitableFetch(
    `/properties/${encodeURIComponent(property.id)}/quote`,
    {
      method: "POST",
      body: {
        checkin_date: request.checkIn,
        checkout_date: request.checkOut,
        guests: {
          adults: request.adults,
          children: request.children,
          infants: request.infants,
          pets: request.pets,
        },
        custom_site_id: customSiteId,
        ...(details
          ? {
              guest_details: {
                first_name: details.firstName,
                last_name: details.lastName,
                email: details.email,
                phone: details.phone,
              },
            }
          : {}),
      },
    },
  );

  // The nightly breakdown is derived from the cached calendar; a calendar
  // failure must not cost the guest their quote.
  let days: CalendarDay[] | undefined;
  try {
    days = (await getCalendarWindow(property.id)).days;
  } catch (error) {
    console.warn(
      `[booking] calendar unavailable for nightly breakdown: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return normalizeQuote(raw, {
    propertyId: property.id,
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    days,
    directMarkupPct: property.markups.directPct,
  });
}
