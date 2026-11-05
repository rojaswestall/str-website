import type { AreaPick } from "./types";

/*
 * Area-guide picks, shown on /area and, closest first, in "Near this house" on
 * each property page. These are the hosts' own recommendations; keep each
 * blurb to one or two sentences.
 *
 * `driveMinutes` is by car from each house, keyed by property slug (Google
 * Maps, from the house addresses, looked up on a weekday afternoon in Nov
 * 2026). Every house needs an entry; null shows "t.b.c.". `walkMinutes` is
 * set only where a house is a comfortable walk away, and shows instead. Picks can be added freely: give
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
    driveMinutes: { "oak-hill": 10, "south-austin": 8, "fire-side": 8 },
    link: "https://radiocoffeeandbeer.com/",
  },
  {
    title: "Cannon Coffee",
    id: "cannon-coffee",
    kind: "coffee",
    blurb:
      "Our neighborhood coffee shop on William Cannon: a proper cortado and a quiet table for the morning.",
    driveMinutes: { "oak-hill": 16, "south-austin": 2, "fire-side": 2 },
    walkMinutes: { "south-austin": 8, "fire-side": 8 },
    link: "https://www.cannoncoffeetx.com/",
  },
  {
    title: "Radix House Coffee",
    id: "radix-house",
    kind: "coffee",
    blurb:
      "A local roaster's coffee truck on William Cannon. Grab one on the way out for the day.",
    driveMinutes: { "oak-hill": 13, "south-austin": 5, "fire-side": 5 },
    link: "https://www.radixhouse.com/",
  },
  {
    title: "Bee Dumpling",
    id: "bee-dumpling",
    kind: "eat",
    blurb:
      "Handmade soup dumplings, potstickers and noodle soups in the same shopping center as Cannon Coffee. Easy for takeout back to the house.",
    driveMinutes: { "oak-hill": 16, "south-austin": 2, "fire-side": 2 },
    walkMinutes: { "south-austin": 7, "fire-side": 7 },
    link: "https://beedumplingtx.com/",
  },
  {
    title: "LeRoy and Lewis Barbecue",
    id: "leroy-and-lewis",
    kind: "eat",
    blurb:
      "The barbecue we send people to: Central Texas smoke with a modern menu, and a Michelin guide listing to back it up.",
    driveMinutes: { "oak-hill": 14, "south-austin": 5, "fire-side": 5 },
  },
  {
    title: "Evangeline Café",
    id: "evangeline",
    kind: "eat",
    blurb:
      "A small, unfussy spot on Brodie Lane cooking very good Cajun and French dishes. A true neighborhood favorite.",
    driveMinutes: { "oak-hill": 13, "south-austin": 9, "fire-side": 9 },
  },
  {
    title: "Thicket Food Park",
    id: "thicket",
    kind: "eat",
    blurb:
      "A food-truck park on South 1st with something for everyone: Artipasta's fresh Italian pasta, and Brooklyn Breakfast Shop for stuffed French toast and fried chicken sandwiches.",
    driveMinutes: { "oak-hill": 19, "south-austin": 4, "fire-side": 4 },
  },
  {
    title: "Garrison Park & Pool",
    id: "garrison-park",
    kind: "outdoors",
    blurb:
      "A big neighborhood park just up Manchaca with a city pool: a 50-meter pool, a diving board and a wading pool for little ones. The pool is open in the summer season only.",
    driveMinutes: { "oak-hill": 11, "south-austin": 4, "fire-side": 4 },
    link: "https://austintexas.gov/parks/locations/garrison-pool",
  },
  {
    title: "Sunrise at Shore & Shore Raw Bar",
    id: "shore",
    kind: "eat",
    blurb:
      "Two sister spots near the Y in Oak Hill. Sunrise does breakfast tacos and fair-trade coffee in the morning; next door, Shore is the dinner-out choice for raw oysters, grilled fish and steak, with half-price oysters at weekday happy hour.",
    driveMinutes: { "oak-hill": 8, "south-austin": 17, "fire-side": 17 },
    link: "https://www.sunriseatshore.com/",
  },
  {
    title: "Escuela Farms",
    id: "escuela-farms",
    kind: "eat",
    blurb:
      "Dinner on a working farm, in the building that was once Oak Hill's elementary school. The produce on the plate is grown on the property. Evenings Tuesday to Saturday; book ahead.",
    driveMinutes: { "oak-hill": 1, "south-austin": 13, "fire-side": 13 },
    walkMinutes: { "oak-hill": 13 },
    link: "https://escuelafarm.com/",
  },
  {
    title: "La Popular",
    id: "la-popular",
    kind: "eat",
    blurb:
      "Modern Mexican and craft agave cocktails at Lantana Place, with 80-plus mezcals and tequilas. Good for a group dinner or happy hour.",
    driveMinutes: { "oak-hill": 6, "south-austin": 17, "fire-side": 17 },
    link: "https://www.lapopularcdmx.com/locations/austin",
  },
  {
    title: "CARVE American Grille",
    id: "carve",
    kind: "eat",
    blurb:
      "Live-fire grill at Lantana Place: the bacon-wrapped, cherry-smoked filet is the order, and weekend brunch is good too.",
    driveMinutes: { "oak-hill": 6, "south-austin": 17, "fire-side": 17 },
    link: "https://www.carveamericangrille.com/",
  },
  {
    title: "Moviehouse & Eatery by Cinépolis",
    id: "moviehouse",
    kind: "eat",
    blurb:
      "Dinner and a movie in one seat, also at Lantana Place. An easy night out, or a rainy-day plan with kids.",
    driveMinutes: { "oak-hill": 5, "south-austin": 16, "fire-side": 16 },
  },
  {
    title: "Jack Allen's Kitchen",
    id: "jack-allens",
    kind: "eat",
    blurb:
      "Oak Hill's Southern comfort-food classic on Highway 71, with a deep bourbon list and happy-hour margaritas.",
    driveMinutes: { "oak-hill": 7, "south-austin": 15, "fire-side": 15 },
  },
  {
    title: "Twin Falls & Sculpture Falls",
    id: "twin-falls",
    kind: "outdoors",
    blurb:
      "The Barton Creek Greenbelt's best-known hike: about three miles out and back from a trailhead off Mopac, with swimming holes at both falls. Twin Falls is half a mile in, down a rocky stretch. After a dry spell the creek can stop running, so check before you go.",
    driveMinutes: { "oak-hill": 10, "south-austin": 15, "fire-side": 15 },
  },
  {
    title: "Lady Bird Johnson Wildflower Center",
    id: "wildflower-center",
    kind: "outdoors",
    blurb:
      "Gardens and trails of Texas native plants, minutes from Oak Hill. Spring wildflower season is the showstopper, but it's a good half-day any time of year. Tickets are sold on their site.",
    driveMinutes: { "oak-hill": 14, "south-austin": 14, "fire-side": 14 },
    link: "https://www.wildflower.org/visit",
  },
  {
    title: "Franklin Barbecue",
    id: "franklin",
    kind: "eat",
    blurb:
      "The most famous brisket in Texas, on East 11th. The line forms before the 11am opening and the meat sells out by mid-afternoon, so bring a chair, or skip the wait by preordering on their site. Closed Mondays.",
    driveMinutes: { "oak-hill": 25, "south-austin": 26, "fire-side": 26 },
    link: "https://franklinbbq.com/",
  },
  {
    title: "Terry Black's Barbecue",
    id: "terry-blacks",
    kind: "eat",
    blurb:
      "Big, roadhouse-style barbecue on Barton Springs Road, open every day and into the evening, so it's the easier brisket fix. Get the sliced brisket and a beef rib.",
    driveMinutes: { "oak-hill": 18, "south-austin": 19, "fire-side": 19 },
  },
  {
    title: "Barton Springs Pool",
    id: "barton-springs",
    kind: "outdoors",
    blurb:
      "Austin's spring-fed swimming hole in Zilker Park, cool and clear all year. Buy tickets ahead in the city's ATXSwims app to skip the counter.",
    driveMinutes: { "oak-hill": 15, "south-austin": 17, "fire-side": 17 },
  },
  {
    title: "Paddling Lady Bird Lake",
    id: "lady-bird-lake",
    kind: "outdoors",
    blurb:
      "Rent a kayak, canoe or paddleboard at Zilker Park Boat Rentals and paddle toward the downtown skyline. Pairs well with a swim at Barton Springs next door.",
    driveMinutes: { "oak-hill": 19, "south-austin": 21, "fire-side": 21 },
  },
  {
    title: "The Congress Avenue Bridge bats",
    id: "bats",
    kind: "local",
    blurb:
      "At sunset in the warm months, the bats that roost under the bridge stream out over the lake. Watch free from the lawn on the southeast side of the bridge, or from a bat cruise on the water, which runs March through October.",
    driveMinutes: { "oak-hill": 21, "south-austin": 23, "fire-side": 23 },
    link: "https://tpwd.texas.gov/huntwild/wild/species/bats/bat-watching-sites/congress-avenue-bridge.phtml",
  },
  {
    title: "The Continental Club",
    id: "continental-club",
    kind: "local",
    blurb:
      "A small, legendary live-music room on South Congress. If you want to hear a band tonight, start here.",
    driveMinutes: { "oak-hill": 19, "south-austin": 20, "fire-side": 20 },
    link: "https://continentalclub.com/",
  },
  {
    title: "Mount Bonnell",
    id: "mount-bonnell",
    kind: "outdoors",
    blurb:
      "A short climb up stone steps to the best sunset view in town, over the river and the west hills. Go about half an hour before sundown.",
    driveMinutes: { "oak-hill": 32, "south-austin": 36, "fire-side": 36 },
  },
  {
    title: "Mary Moore Searight Metro Park",
    id: "mary-moore-searight",
    kind: "outdoors",
    blurb:
      "Wide-open parkland along Slaughter Creek with easy walking loops and mountain-bike trails, a short drive south.",
    driveMinutes: { "oak-hill": 26, "south-austin": 10, "fire-side": 10 },
  },
];
