import type { Photo, Property } from "./types";

/*
 * The three houses, seeded from design/artifact.html.
 *
 * Still unconfirmed (docs/plan.md, "Needed before step 3"):
 * - final names for South Austin Stay and Fire Side Home
 * - nightly rate and minimum nights (null here; render as "t.b.c.")
 * - guest quotes (empty arrays; step 8 hides the section when empty)
 * - Hospitable booking widget ids (null; step 6 falls back to the stub)
 * - real photos (the files under public/photos/<slug>/ are striped placeholders)
 */

function placeholderPhotos(slug: string, name: string): Photo[] {
  return [
    {
      src: `/photos/${slug}/hero.jpg`,
      alt: `[TBC] Placeholder for the hero photo of ${name}`,
      width: 1800,
      height: 1200,
      role: "hero",
    },
    ...([1, 2, 3] as const).map<Photo>((n) => ({
      src: `/photos/${slug}/gallery-0${n}.jpg`,
      alt: `[TBC] Placeholder for gallery photo ${n} of ${name}`,
      width: 1800,
      height: 1200,
      role: "gallery",
    })),
  ];
}

export const properties: Property[] = [
  {
    slug: "oak-hill",
    name: "An Oak Hill Home",
    shortName: "Oak Hill",
    neighborhood: "Oak Hill",
    locationLine: "Oak Hill, Austin · off Hwy 290 & 71",
    summary:
      "Three bedrooms and two baths off 290 and 71, with a fireplace, a fenced yard, and a proper desk for a working week.",
    description:
      "Three bedrooms and two baths a short drive from downtown, with 290 and 71 both close by. A living room built around the fireplace, a kitchen with everything you'd actually cook with, and a fenced back yard with a patio to sit out on. Fast wi-fi and a proper desk, so a working week here isn't a compromise.",
    sleeps: 8,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    minNights: null,
    rateFrom: null,
    amenities: [
      "fireplace",
      "fast wi-fi",
      "dedicated workspace",
      "fenced yard + patio",
      "free parking",
      "pets allowed",
    ],
    rating: 5.0,
    reviewCount: 23,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1598934202273477463",
    strLicense: "OL2026086598",
    hospitable: { bookingWidgetId: null },
    photos: placeholderPhotos("oak-hill", "An Oak Hill Home"),
    quotes: [],
    mapPin: { x: 85, y: 299 },
  },
  {
    slug: "south-austin",
    name: "South Austin Stay",
    shortName: "South Austin",
    neighborhood: "South Austin",
    locationLine: "South Austin · garage and yard",
    summary:
      "A bright three-bedroom with five beds, a garage to park in, and a yard worth sitting in once the sun drops.",
    description:
      "A bright, fully furnished three-bedroom with five beds, so a group of eight fits without anyone drawing the short straw. Open living space, smart TVs, a garage to park in rather than a curb, and a yard worth sitting in once the sun drops. Fast wi-fi and a desk, for anyone working through the week.",
    sleeps: 8,
    bedrooms: 3,
    beds: 5,
    bathrooms: 2,
    minNights: null,
    rateFrom: null,
    amenities: [
      "garage",
      "yard",
      "fast wi-fi",
      "dedicated workspace",
      "sofa bed",
      "pets allowed",
    ],
    rating: 4.95,
    reviewCount: 19,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1655329029936239948",
    strLicense: "OL2026040319",
    hospitable: { bookingWidgetId: null },
    photos: placeholderPhotos("south-austin", "South Austin Stay"),
    quotes: [],
    // Both South Austin houses sit near (266, 299); offset so the dots read apart.
    mapPin: { x: 258, y: 292 },
  },
  {
    slug: "fire-side",
    name: "Fire Side Home",
    shortName: "Fire Side",
    neighborhood: "South Austin",
    locationLine: "South Austin · near Radio Coffee & Beer",
    summary:
      "The only one of the three with a spare half bath, plus a fenced yard with a fire pit, a short walk from Radio Coffee & Beer.",
    description:
      "The only one of the three with a half bath to spare, which counts for a lot when eight people are getting ready at once. Bright open layout, full kitchen, and a fenced back yard with a fire pit for the end of the evening. Radio Coffee & Beer is close enough to walk to.",
    sleeps: 8,
    bedrooms: 3,
    beds: 5,
    bathrooms: 2.5,
    minNights: null,
    rateFrom: null,
    amenities: [
      "fire pit",
      "fenced yard",
      "fast wi-fi",
      "dedicated workspace",
      "sofa bed",
      "free parking",
      "pets allowed",
    ],
    rating: 5.0,
    reviewCount: 27,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1598953749522814358",
    strLicense: "OL2026031718",
    hospitable: { bookingWidgetId: null },
    photos: placeholderPhotos("fire-side", "Fire Side Home"),
    quotes: [],
    mapPin: { x: 274, y: 306 },
  },
];
