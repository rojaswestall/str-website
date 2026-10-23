import { photos } from "./photos";
import type { Property } from "./types";

/*
 * The three houses, seeded from design/artifact.html.
 *
 * Still unconfirmed (docs/plan.md, "Needed before step 3"):
 * - final names for South Austin Stay and Fire Side Home
 * - nightly rate and minimum nights (null here; render as "t.b.c.")
 * - Hospitable property ids for Oak Hill and South Austin Stay (`data-property-id`
 *   in each house's dashboard snippet; null renders the stub). Fire Side Home
 *   is "Dan Jean B" in Hospitable, property 2338068, from the snippet in
 *   docs/plan.md.
 *
 * Photos live in content/photos.ts. Guest quotes, names, and months are from
 * the Airbnb reviews (whitespace and stray typos tidied; the month is when
 * the review was posted). Ratings and review counts were copied from the
 * listings on 2026-10-12.
 *
 * `mapArea` places each house on the Apple map at neighbourhood precision
 * (rounded to roughly half a kilometre and kept off the real address, which
 * is internal). The two South Austin houses are drawn apart on purpose; the
 * map never shows them as neighbours. The map also caps how far it zooms in.
 */

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
    reviewCount: 25,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1598934202273477463",
    strLicense: "OL2026086598",
    hospitable: { propertyId: "2338067" }, // "Parkwood A" in Hospitable
    photos: photos["oak-hill"],
    quotes: [
      {
        text: "Aaron and Alexis were extremely responsive, helpful, kind and generous—definitely hosts with the most! The place was adorable and had everything one needs from an air bnb. We thoroughly enjoyed our stay.",
        author: "Melanie",
        month: "October 2026",
      },
      {
        text: "We really enjoyed our stay here. The house is located in a quiet countryside setting, which was perfect for our trip and provided a relaxing atmosphere after a busy day. The kitchen was very well equipped with everything we needed, and the entire house was beautifully decorated and felt warm and welcoming. We had a very pleasant stay and would happily recommend it to other guests.",
        author: "Liping",
        month: "June 2026",
      },
      {
        text: "Alexis and her team were friendly, professional, quick to respond, great communicators and the space was exactly as described in the listing description and we felt right at home. We are already planning to book again!",
        author: "Dena",
        month: "June 2026",
      },
    ],
    mapPin: { x: 85, y: 299 },
    mapArea: { latitude: 30.234, longitude: -97.858 },
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
    bathrooms: 2.5,
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
    reviewCount: 20,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1655329029936239948",
    strLicense: "OL2026040319",
    hospitable: { propertyId: "2338069" }, // "Dan Jean Unit A" in Hospitable
    photos: photos["south-austin"],
    quotes: [
      {
        text: "Loved my stay! Aaron was super helpful getting situated and the house was beautiful, clean, and in a great location for my needs in South Austin. Definitely plan on staying here during my next trip.",
        author: "Adrián",
        month: "October 2026",
      },
      {
        text: "We had a wonderful stay! The Airbnb was very clean, comfortable, and exactly as described. Everything we needed was provided, and the place made us feel right at home. The host was friendly, helpful, and made the entire experience easy and enjoyable. We truly appreciated the hospitality and would definitely stay here again. Highly recommend!",
        author: "Damaris",
        month: "August 2026",
      },
      {
        text: "This place is exactly what we needed it to be. We were pleasantly surprised that it was exactly as it was described. Very clean/spacious, it has cute setup in the back yard. The pillows and the beds were super soft and comfortable. We felt like we were sleeping on our own bed. We 100% recommend this place and we are looking forward to stay here again. You will feel right at home! The neighborhood is very safe, calm and quiet. Alexis is very attentive and sent us a lot of information and kept in contact all the time.",
        author: "Maria",
        month: "June 2026",
      },
    ],
    // Both South Austin houses sit near (266, 299); offset so the dots read apart.
    mapPin: { x: 258, y: 292 },
    mapArea: { latitude: 30.225, longitude: -97.792 },
  },
  {
    slug: "fire-side",
    name: "Fire Side Home",
    shortName: "Fire Side",
    neighborhood: "South Austin",
    locationLine: "South Austin · near Radio Coffee & Beer",
    summary:
      "A fenced yard with a fire pit for the end of the evening, a spare half bath, and Radio Coffee & Beer a short walk away.",
    description:
      "A half bath to spare, which counts for a lot when eight people are getting ready at once. Bright open layout, full kitchen, and a fenced back yard with a fire pit for the end of the evening. Radio Coffee & Beer is close enough to walk to.",
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
    reviewCount: 30,
    guestFavorite: true,
    airbnbUrl: "https://www.airbnb.com/rooms/1598953749522814358",
    strLicense: "OL2026031718",
    hospitable: { propertyId: "2338068" }, // "Dan Jean B" in Hospitable
    photos: photos["fire-side"],
    quotes: [
      {
        text: "If I’m ever in Austin this will forever be the spot I come and stay! I was blown away by how clean the entire house was kept. It’s a beautiful spot in a pretty quiet neighborhood. It’s got anything you need to cook. The bedrooms were extremely nice. 0 bad things to say about this place! Alexis and Aaron were responsive within minutes whenever I had any questions.",
        author: "Alexander",
        month: "September 2026",
      },
      {
        text: "Great and responsive hosts! It’s such a clean space, and looked even better than it did in the photos. Thank you for a great stay, as I definitely recommend!",
        author: "Julene",
        month: "July 2026",
      },
      {
        text: "Beautiful all new interior, fully updated, new stylish furniture, impeccably clean, very comfortable home with comfortable beds that perfectly met all of our needs in the Austin area. The hosts were very, very responsive.",
        author: "Louis",
        month: "June 2026",
      },
    ],
    mapPin: { x: 274, y: 306 },
    mapArea: { latitude: 30.219, longitude: -97.784 },
  },
];
