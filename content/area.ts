import type { AreaPick } from "./types";

/*
 * Area-guide picks, shown on /area and, closest first, in "Near this house" on
 * each property page. These are the hosts' own recommendations; keep each
 * blurb to one or two sentences.
 *
 * `driveMinutes` is by car from each house, keyed by property slug. Every
 * house needs an entry; null shows "t.b.c.". Picks can be added freely: give
 * each a unique `id` (it becomes the /area#<id> anchor). `link` is only set
 * where the place's own site has been checked. `photo` is optional; without
 * one the card shows the striped placeholder slot.
 */
export const areaPicks: AreaPick[] = [
  {
    title: "Radio Coffee & Beer",
    id: "radio",
    kind: "coffee",
    blurb:
      "Coffee in the morning, local craft beer and live music at night, in a 1940s house on Manchaca. Veracruz All Natural's taco truck and Dee Dee's Northeastern Thai share the yard, so it covers breakfast through dinner.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    link: "https://radiocoffeeandbeer.com/",
  },
  {
    title: "Cannon Coffee",
    id: "cannon-coffee",
    kind: "coffee",
    blurb:
      "Our neighborhood coffee shop on William Cannon: a proper cortado and a quiet table for the morning.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    link: "https://www.cannoncoffeetx.com/",
  },
  {
    title: "Radix House Coffee",
    id: "radix-house",
    kind: "coffee",
    blurb:
      "A local roaster's coffee truck on William Cannon. Grab one on the way out for the day.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    link: "https://www.radixhouse.com/",
  },
  {
    title: "Bee Dumpling",
    id: "bee-dumpling",
    kind: "eat",
    blurb:
      "Handmade soup dumplings, potstickers and noodle soups in the same shopping center as Cannon Coffee. Easy for takeout back to the house.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    link: "https://beedumplingtx.com/",
  },
  {
    title: "LeRoy and Lewis Barbecue",
    id: "leroy-and-lewis",
    kind: "eat",
    blurb:
      "The barbecue we send people to: Central Texas smoke with a modern menu, and a Michelin guide listing to back it up.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
  },
  {
    title: "Evangeline Café",
    id: "evangeline",
    kind: "eat",
    blurb:
      "A small, unfussy spot on Brodie Lane cooking very good Cajun and French dishes. A true neighborhood favorite.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
  },
  {
    title: "Thicket Food Park",
    id: "thicket",
    kind: "eat",
    blurb:
      "A food-truck park on South 1st with something for everyone: Artipasta's fresh Italian pasta, and Brooklyn Breakfast Shop for stuffed French toast and fried chicken sandwiches.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
  },
  {
    title: "Garrison Park & Pool",
    id: "garrison-park",
    kind: "outdoors",
    blurb:
      "A big neighborhood park just up Manchaca with a city pool: a 50-meter pool, a diving board and a wading pool for little ones. The pool is open in the summer season only.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    link: "https://austintexas.gov/parks/locations/garrison-pool",
  },
  {
    title: "Mary Moore Searight Metro Park",
    id: "mary-moore-searight",
    kind: "outdoors",
    blurb:
      "Wide-open parkland along Slaughter Creek with easy walking loops and mountain-bike trails, a short drive south.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
  },
];
