import type { SiteConfig } from "./types";

/*
 * Site-wide configuration. Domain, contact email, and Instagram handle are
 * open items (docs/plan.md, "Needed before step 7 / 14"); they are `[TBC]`
 * placeholders and should render as such, never as a live mailto: or link.
 *
 * Hospitable: `siteUuid` and `theme` come from the real embed snippet. The
 * per-house `propertyId` lives on each property. `mode` is the default for
 * the widgets; `NEXT_PUBLIC_HOSPITABLE_MODE` overrides it per environment.
 *
 * The TikTok clip is the one from the artifact (@exploretex, Barton Springs).
 * Set `tiktok` to null to drop the embed if the hosts decide against it.
 */
export const site: SiteConfig = {
  name: "The Austin Collection",
  tagline: "Places we look after, properly.",
  description:
    "Three short-term rental houses in Austin, Texas, booked directly with the hosts who look after them.",
  domain: "[TBC] domain",
  contactEmail: "[TBC] email address",
  instagram: "[TBC] instagram handle",
  hospitable: {
    mode: "live",
    // From the dashboard snippet pasted into docs/plan.md (step 6).
    siteUuid: "a2dd8e69-2e7b-4a23-a07e-718ab1e46afb",
    theme: "multi",
    // The search widget snippet has not been copied yet (open item, step 6 / 14).
    searchWidgetId: null,
  },
  tiktok: {
    url: "https://www.tiktok.com/@exploretex/video/7648810803109367053",
    handle: "exploretex",
    title: "Barton Springs, and the river through the middle of it",
    body: [
      "Sixty-eight degrees year round, spring-fed, and busy from the first warm weekend onward. The clip runs the length of the river as it cuts through the city — the stretch of Austin most people come here for, and a short drive from all three houses.",
      "Video does something a photograph can't: it shows what a place feels like at the hour you'd actually be standing in it.",
    ],
  },
  staysLede:
    "All three are three-bedroom houses that sleep eight, so the choice is mostly about which side of town you want and what you need out back — a fireplace and a patio, a garage to park in, or a fire pit and a spare half bath.",
  directPitch: [
    "Book through a platform and roughly 15% of what you pay is a service fee that goes to the platform, not to the house. Booking here, that fee simply isn’t there.",
    "Everything else is the same: the same calendar the listings use, the same houses, and the same three people answering your messages before and during the stay.",
  ],
  heroCollage: {
    src: "/photos/home/hero-collage.jpg",
    alt: "[TBC] Placeholder for the hero collage of the three houses",
    width: 2100,
    height: 900,
    // The places the artifact's collage shows; update alongside the real photo.
    caption: ["South Congress", "Zilker Park", "Radio Coffee & Beer"],
  },
};
