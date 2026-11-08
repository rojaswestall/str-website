import type { AreaPick } from "./types";

/*
 * Area-guide picks, shown on /area and, closest first, in "Near this house" on
 * each property page. These are the hosts' own recommendations; keep each
 * blurb to one or two sentences.
 *
 * `driveMinutes` is by car from each house, keyed by property slug (Google
 * Maps, from the house addresses, looked up on a weekday afternoon in Nov
 * 2026). Every house needs an entry; null shows "t.b.c.". `walkMinutes` is
 * set only where a house is a comfortable walk away, and shows instead.
 *
 * Picks can be added freely: give each a unique `id` (it becomes the
 * /area#<id> anchor). `link` is only set where the place's own site has been
 * checked.
 *
 * `photo` is optional; without one the card shows the striped placeholder.
 * Photos are 3:2 JPEGs under public/photos/area/ (1200 px long edge, q80,
 * metadata stripped) and need a `photoCredit` (author, licence, source page)
 * unless the hosts own them (`photoOwned: true`). Alt text starting
 * "Representative photo" marks a dish shot not taken at that place.
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
    photo: {
      src: "/photos/area/radio.jpg",
      alt: "A Veracruz All Natural taco in foil, from the taco truck in Radio's yard",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Stephanie from Austin TX",
      license: "CC BY 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Veracruz_All_Natural_Vegan_taco_(9718877114).jpg",
    },
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
    photo: {
      src: "/photos/area/cannon-coffee.jpg",
      alt: "Representative photo: a cortado with latte art (not taken at Cannon Coffee)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Andy Li",
      license: "CC0",
      source:
        "https://commons.wikimedia.org/wiki/File:Cortado_-_LOAM_2023-08-22.jpg",
    },
  },
  {
    title: "Radix House Coffee",
    id: "radix-house",
    kind: "coffee",
    blurb:
      "A local roaster's coffee truck on William Cannon. Grab one on the way out for the day.",
    driveMinutes: { "oak-hill": 13, "south-austin": 5, "fire-side": 5 },
    link: "https://www.radixhouse.com/",
    photo: {
      src: "/photos/area/radix-house.jpg",
      alt: "Representative photo: a latte and a black coffee (not taken at Radix House)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Bex Walton",
      license: "CC BY 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Latte_and_dark_coffee.jpg",
    },
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
    photo: {
      src: "/photos/area/bee-dumpling.jpg",
      alt: "Representative photo: steamed soup dumplings (not taken at Bee Dumpling)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Windmemories",
      license: "CC BY-SA 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Steamed_soup_buns_of_Kaifeng.jpg",
    },
  },
  {
    title: "LeRoy and Lewis Barbecue",
    id: "leroy-and-lewis",
    kind: "eat",
    blurb:
      "The barbecue we send people to: Central Texas smoke with a modern menu, and a Michelin guide listing to back it up.",
    driveMinutes: { "oak-hill": 14, "south-austin": 5, "fire-side": 5 },
    photo: {
      src: "/photos/area/leroy-and-lewis.jpg",
      alt: "The neon LeRoy and Lewis sign on the restaurant",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Presidentman",
      license: "CC BY-SA 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:LeRoy_and_Lewis_Barbecue_Austin.jpg",
    },
  },
  {
    title: "Evangeline Café",
    id: "evangeline",
    kind: "eat",
    blurb:
      "A small, unfussy spot on Brodie Lane cooking very good Cajun and French dishes. A true neighborhood favorite.",
    driveMinutes: { "oak-hill": 13, "south-austin": 9, "fire-side": 9 },
    photo: {
      src: "/photos/area/evangeline.jpg",
      alt: "Inside Evangeline Café, its walls covered in signs and string lights",
      width: 500,
      height: 333,
    },
    photoCredit: {
      author: "jonl",
      license: "CC BY-SA 2.0",
      source: "https://www.flickr.com/photo.gne?id=6924086303",
    },
  },
  {
    title: "Thicket Food Park",
    id: "thicket",
    kind: "eat",
    blurb:
      "A food-truck park on South 1st with something for everyone: Artipasta's fresh Italian pasta, and Brooklyn Breakfast Shop for stuffed French toast and fried chicken sandwiches.",
    driveMinutes: { "oak-hill": 19, "south-austin": 4, "fire-side": 4 },
    photo: {
      src: "/photos/area/thicket.jpg",
      alt: "The South Austin Thicket Food Park sign on South 1st Street",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Tony Webster",
      license: "CC BY 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Thicket_Food_Park_-_South_Austin,_Texas_(46687430225).jpg",
    },
  },
  {
    title: "Garrison Park & Pool",
    id: "garrison-park",
    kind: "outdoors",
    blurb:
      "A big neighborhood park just up Manchaca with a city pool: a 50-meter pool, a diving board and a wading pool for little ones. The pool is open in the summer season only.",
    driveMinutes: { "oak-hill": 11, "south-austin": 4, "fire-side": 4 },
    link: "https://austintexas.gov/parks/locations/garrison-pool",
    photo: {
      src: "/photos/area/garrison-park.jpg",
      alt: "Representative photo: the view from a diving board over an outdoor pool (not taken at Garrison Pool)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Citizen D",
      license: "CC BY-SA 3.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Rippon_Lea_swimming_pool.jpg",
    },
  },
  {
    title: "Sunrise at Shore & Shore Raw Bar",
    id: "shore",
    kind: "eat",
    blurb:
      "Two sister spots near the Y in Oak Hill. Sunrise does breakfast tacos and fair-trade coffee in the morning; next door, Shore is the dinner-out choice for raw oysters, grilled fish and steak, with half-price oysters at weekday happy hour.",
    driveMinutes: { "oak-hill": 8, "south-austin": 17, "fire-side": 17 },
    link: "https://www.sunriseatshore.com/",
    photo: {
      src: "/photos/area/shore.jpg",
      alt: "Representative photo: raw oysters on ice with lemon (not taken at Shore)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "sanjay_ach",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Oysters_served_on_ice.jpg",
    },
  },
  {
    title: "Escuela Farms",
    id: "escuela-farms",
    kind: "eat",
    blurb:
      "Farm-to-table Tex-Mex in Oak Hill's old elementary school, with vegetables grown right on the property. Book Fino, inside the schoolhouse, for a dressed-up dinner, or walk in to Campo for relaxed Tex-Mex barbecue out in the gardens. Tuesday to Saturday evenings.",
    driveMinutes: { "oak-hill": 1, "south-austin": 13, "fire-side": 13 },
    walkMinutes: { "oak-hill": 13 },
    link: "https://escuelafarm.com/",
    photo: {
      src: "/photos/area/escuela-farms.jpg",
      alt: "Representative photo: tomatoes ripening on the vine in a farm garden (not taken at Escuela Farms)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "NRCS Oregon",
      license: "CC BY 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Blackberry_Bog_Farm_-_52435807189.jpg",
    },
  },
  {
    title: "La Popular",
    id: "la-popular",
    kind: "eat",
    blurb:
      "Modern Mexican and craft agave cocktails at Lantana Place, with 80-plus mezcals and tequilas. Good for a group dinner or happy hour.",
    driveMinutes: { "oak-hill": 6, "south-austin": 17, "fire-side": 17 },
    link: "https://www.lapopularcdmx.com/locations/austin",
    photo: {
      src: "/photos/area/la-popular.jpg",
      alt: "Representative photo: a mezcal cocktail (not taken at La Popular)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Missvain",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Mezcal_cocktail_at_Wit_and_Wisdom_-_April_2023_-_Sarah_Stierch.jpg",
    },
  },
  {
    title: "CARVE American Grille",
    id: "carve",
    kind: "eat",
    blurb:
      "Live-fire grill at Lantana Place: the bacon-wrapped, cherry-smoked filet is the order, and weekend brunch is good too.",
    driveMinutes: { "oak-hill": 6, "south-austin": 17, "fire-side": 17 },
    link: "https://www.carveamericangrille.com/",
    photo: {
      src: "/photos/area/carve.jpg",
      alt: "Representative photo: grilled steak on a wooden board (not taken at CARVE)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Nenad Stojkovic",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Grilled_steak_served_with_orange_slices_and_sauce_on_wooden_board_-_Flickr_-_nenadstojkovicart.jpg",
    },
  },
  {
    title: "Moviehouse & Eatery by Cinépolis",
    id: "moviehouse",
    kind: "eat",
    blurb:
      "Dinner and a movie in one seat, also at Lantana Place. An easy night out, or a rainy-day plan with kids.",
    driveMinutes: { "oak-hill": 5, "south-austin": 16, "fire-side": 16 },
    photo: {
      src: "/photos/area/moviehouse.jpg",
      alt: "The Moviehouse & Eatery building and parking lot at Lantana Place",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Slamforeman",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Moviehouse_and_Eatery_in_Austin,_Texas.jpg",
    },
  },
  {
    title: "Jack Allen's Kitchen",
    id: "jack-allens",
    kind: "eat",
    blurb:
      "Oak Hill's Southern comfort-food classic on Highway 71, with a deep bourbon list and happy-hour margaritas.",
    driveMinutes: { "oak-hill": 7, "south-austin": 15, "fire-side": 15 },
    photo: {
      src: "/photos/area/jack-allens.jpg",
      alt: "Representative photo: fried green tomatoes with ranch (not taken at Jack Allen's)",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "City Foodsters",
      license: "CC BY 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Fried_Green_Tomatoes_with_ranch_dressing.jpg",
    },
  },
  {
    title: "Twin Falls & Sculpture Falls",
    id: "twin-falls",
    kind: "outdoors",
    blurb:
      "The Barton Creek Greenbelt's best-known hike: about three miles out and back from a trailhead off Mopac, with swimming holes at both falls. Twin Falls is half a mile in, down a rocky stretch. After a dry spell the creek can stop running, so check before you go.",
    driveMinutes: { "oak-hill": 10, "south-austin": 15, "fire-side": 15 },
    photo: {
      src: "/photos/area/twin-falls.jpg",
      alt: "Swimmers at Twin Falls on the Barton Creek Greenbelt",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "LoneStarMike",
      license: "CC BY-SA 3.0",
      source:
        "https://commons.wikimedia.org/wiki/File:BartonCreekGreenbelt-07.JPG",
    },
  },
  {
    title: "Lady Bird Johnson Wildflower Center",
    id: "wildflower-center",
    kind: "outdoors",
    blurb:
      "Gardens and trails of Texas native plants, minutes from Oak Hill. Spring wildflower season is the showstopper, but it's a good half-day any time of year. Tickets are sold on their site.",
    driveMinutes: { "oak-hill": 14, "south-austin": 14, "fire-side": 14 },
    link: "https://www.wildflower.org/visit",
    photo: {
      src: "/photos/area/wildflower-center.jpg",
      alt: "Bluebonnets in bloom at the Lady Bird Johnson Wildflower Center",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Larry D. Moore",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Bluebonnets_Wildflower_Center_Austin_Texas_2024.jpg",
    },
  },
  {
    title: "Franklin Barbecue",
    id: "franklin",
    kind: "eat",
    blurb:
      "The most famous brisket in Texas, on East 11th. The line forms before the 11am opening and the meat sells out by mid-afternoon, so bring a chair, or skip the wait by preordering on their site. Closed Mondays.",
    driveMinutes: { "oak-hill": 25, "south-austin": 26, "fire-side": 26 },
    link: "https://franklinbbq.com/",
    photo: {
      src: "/photos/area/franklin.jpg",
      alt: "The line outside Franklin Barbecue before it opens",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Larry D. Moore",
      license: "CC BY 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Franklin_Barbecue_Austin_About_to_Open.jpg",
    },
  },
  {
    title: "Terry Black's Barbecue",
    id: "terry-blacks",
    kind: "eat",
    blurb:
      "Big, roadhouse-style barbecue on Barton Springs Road, open every day and into the evening, so it's the easier brisket fix. Get the sliced brisket and a beef rib.",
    driveMinutes: { "oak-hill": 18, "south-austin": 19, "fire-side": 19 },
    photo: {
      src: "/photos/area/terry-blacks.jpg",
      alt: "A tray of brisket, ribs, sausage and mac and cheese",
      width: 1024,
      height: 683,
    },
    photoCredit: {
      author: "Phillie Casablanca",
      license: "CC BY 2.0",
      source: "https://www.flickr.com/photo.gne?id=51941999619",
    },
  },
  {
    title: "Barton Springs Pool",
    id: "barton-springs",
    kind: "outdoors",
    blurb:
      "Austin's spring-fed swimming hole in Zilker Park, cool and clear all year. Buy tickets ahead in the city's ATXSwims app to skip the counter.",
    driveMinutes: { "oak-hill": 15, "south-austin": 17, "fire-side": 17 },
    photo: {
      src: "/photos/area/barton-springs.jpg",
      alt: "A swimmer jumping off the diving board at Barton Springs Pool",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Todd Dwyer",
      license: "CC BY-SA 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Barton_Springs-_Austin,_Texas.jpg",
    },
  },
  {
    title: "Paddling Lady Bird Lake",
    id: "lady-bird-lake",
    kind: "outdoors",
    blurb:
      "Rent a kayak, canoe or paddleboard at Zilker Park Boat Rentals and paddle toward the downtown skyline. Pairs well with a swim at Barton Springs next door.",
    driveMinutes: { "oak-hill": 19, "south-austin": 21, "fire-side": 21 },
    photo: {
      src: "/photos/area/lady-bird-lake.jpg",
      alt: "Kayakers paddling on Lady Bird Lake",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Oleg Yunakov",
      license: "CC BY-SA 4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Recreational_Kayakers_on_Lady_Bird_Lake_in_Austin,_Texas.jpg",
    },
  },
  {
    title: "The Congress Avenue Bridge bats",
    id: "bats",
    kind: "local",
    blurb:
      "At sunset in the warm months, the bats that roost under the bridge stream out over the lake. Watch free from the lawn on the southeast side of the bridge, or from a bat cruise on the water, which runs March through October.",
    driveMinutes: { "oak-hill": 21, "south-austin": 23, "fire-side": 23 },
    link: "https://tpwd.texas.gov/huntwild/wild/species/bats/bat-watching-sites/congress-avenue-bridge.phtml",
    photo: {
      src: "/photos/area/bats.jpg",
      alt: "Bats flying out at dusk at the Congress Avenue Bridge",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Dan Pancamo",
      license: "CC BY-SA 2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Austin_Bat_Bridge_By_Dan_Pancamo.jpg",
    },
  },
  {
    title: "The Continental Club",
    id: "continental-club",
    kind: "local",
    blurb:
      "A small, legendary live-music room on South Congress. If you want to hear a band tonight, start here.",
    driveMinutes: { "oak-hill": 19, "south-austin": 20, "fire-side": 20 },
    link: "https://continentalclub.com/",
    photo: {
      src: "/photos/area/continental-club.jpg",
      alt: "The Continental Club's neon sign at night",
      width: 1024,
      height: 683,
    },
    photoCredit: {
      author: "Ashton Brown",
      license: "CC BY 2.0",
      source: "https://www.flickr.com/photo.gne?id=8624960936",
    },
  },
  {
    title: "Mount Bonnell",
    id: "mount-bonnell",
    kind: "outdoors",
    blurb:
      "A short climb up stone steps to the best sunset view in town, over the river and the west hills. Go about half an hour before sundown.",
    driveMinutes: { "oak-hill": 32, "south-austin": 36, "fire-side": 36 },
    photo: {
      src: "/photos/area/mount-bonnell.jpg",
      alt: "The view of Lake Austin and the hills from Mount Bonnell",
      width: 1200,
      height: 800,
    },
    photoCredit: {
      author: "Carol M. Highsmith",
      license: "Public domain",
      source:
        "https://commons.wikimedia.org/wiki/File:A_view_of_Lake_Austin_from_Mount_Bonnell,_above_Austin,_Texas_LCCN2014632040.tif",
    },
  },
  {
    title: "Mary Moore Searight Metro Park",
    id: "mary-moore-searight",
    kind: "outdoors",
    blurb:
      "Wide-open parkland along Slaughter Creek with easy walking loops and mountain-bike trails, a short drive south.",
    driveMinutes: { "oak-hill": 26, "south-austin": 10, "fire-side": 10 },
    photo: {
      src: "/photos/area/mary-moore-searight.jpg",
      alt: "Slaughter Creek running through Mary Moore Searight Metro Park",
      width: 1024,
      height: 683,
    },
    photoCredit: {
      author: "jonl",
      license: "CC BY-SA 2.0",
      source: "https://www.flickr.com/photo.gne?id=6584533437",
    },
  },
];
