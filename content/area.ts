import type { AreaPick } from "./types";

/*
 * Area-guide picks, shown on /area and, closest first, in "Near this house" on
 * each property page. Titles and blurbs are placeholders until the hosts
 * choose the places (docs/plan.md, "Needed before step 3"); the artifact's
 * prompt text for each slot is kept as the blurb so the page still reads as a
 * brief.
 *
 * `driveMinutes` is by car from each house, keyed by property slug. Every
 * house needs an entry; null shows "t.b.c.". Picks can be added freely: give
 * each a unique `id` (it becomes the /area#<id> anchor).
 */
export const areaPicks: AreaPick[] = [
  {
    title: "[TBC] Somewhere to eat",
    id: "eat",
    kind: "eat",
    blurb:
      "[TBC] The one place you send every guest to. A specific recommendation from the host beats a list of twenty links.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    photo: {
      src: "/photos/area/eat.jpg",
      alt: "[TBC] Placeholder for a photo of the place to eat",
      width: 1200,
      height: 1200,
    },
  },
  {
    title: "[TBC] Somewhere outdoors",
    id: "outdoors",
    kind: "outdoors",
    blurb:
      "[TBC] A greenbelt trail, a swimming hole, a park within a short drive of all three houses.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    photo: {
      src: "/photos/area/outdoors.jpg",
      alt: "[TBC] Placeholder for a photo of the outdoors pick",
      width: 1200,
      height: 1200,
    },
  },
  {
    title: "[TBC] Something only locals know",
    id: "local",
    kind: "local",
    blurb:
      "[TBC] The detail that makes the page worth reading: the coffee place that opens early, the shortcut that avoids 290 at rush hour, the night the music is good.",
    driveMinutes: { "oak-hill": null, "south-austin": null, "fire-side": null },
    photo: {
      src: "/photos/area/local.jpg",
      alt: "[TBC] Placeholder for a photo of the locals-only pick",
      width: 1200,
      height: 1200,
    },
  },
];
