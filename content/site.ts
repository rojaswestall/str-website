import type { SiteConfig } from "./types";

/*
 * Site-wide configuration. The domain is an open item (docs/plan.md, "Go
 * live"); it is a `[TBC]` placeholder and should render as
 * such, never as a live link.
 *
 * Hospitable: `siteUuid` and `theme` come from the real embed snippet. The
 * per-house `propertyId` lives on each property. `mode` is the default for
 * the widgets; `NEXT_PUBLIC_HOSPITABLE_MODE` overrides it per environment.
 *
 * TikTok clips: the artifact's Barton Springs clip (@exploretex) and an
 * Austin BBQ comparison (@gabynjohnny), shown in this order in the area
 * guide. An empty list drops the row.
 */
export const site: SiteConfig = {
  name: "The Austin Collection",
  tagline: "Places we look after, properly.",
  description:
    "Three short-term rental houses in Austin, Texas, booked directly with the hosts who look after them.",
  domain: "[TBC] domain",
  hospitable: {
    mode: "stub",
    // From the dashboard snippet (docs/architecture.md, "Hospitable integration").
    siteUuid: "a2dd8e69-2e7b-4a23-a07e-718ab1e46afb",
    theme: "boutique",
    // `identifier` from Direct → Property Search (step 14).
    searchWidgetId: "178e46fc-3dbb-4433-ac2d-3ebe9d9cca07",
  },
  tiktoks: [
    {
      url: "https://www.tiktok.com/@exploretex/video/7648810803109367053",
      handle: "exploretex",
      title: "Barton Springs, and the river through the middle of it",
      body: [
        "Sixty-eight degrees year round, spring-fed, and busy from the first warm weekend onward. The clip runs the length of the river as it cuts through the city — the stretch of Austin most people come here for, and a short drive from all three houses.",
      ],
    },
    {
      url: "https://www.tiktok.com/@gabynjohnny/video/7693314476384275725",
      handle: "gabynjohnny",
      title: "Three of Austin's best-known BBQ spots, side by side",
      body: [
        "Franklin's brisket, Terry Black's dino ribs, and Interstellar, tried back to back. Worth a watch before you decide which line to stand in.",
      ],
    },
  ],
  staysLede:
    "All three are three-bedroom houses that sleep eight, so the choice is mostly about which side of town you want and what you need out back — a fireplace and a patio, a garage to park in, or a fire pit out back.",
  directPitch: [
    "Book through a platform and roughly 15% of what you pay is a service fee that goes to the platform, not to the house. Booking here, that fee simply isn’t there.",
    "Everything else is the same: the same calendar the listings use, the same houses, and the same three people answering your messages before and during the stay.",
  ],
  heroCollage: {
    src: "/photos/home/hero-collage.jpg",
    alt: "Collage of Austin: Congress Avenue leading up to the Capitol, the downtown skyline from Zilker Park, shopfronts on South Congress, and the Radio Coffee & Beer sign",
    width: 2100,
    height: 900,
    caption: ["South Congress", "Zilker Park", "Radio Coffee & Beer"],
  },
};
