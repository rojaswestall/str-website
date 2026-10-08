import type { AreaPick } from "./types";

/*
 * The three area-guide picks are an open item (docs/plan.md, "Needed before
 * step 3"). Titles and blurbs are placeholders; the artifact's prompt text for
 * each slot is kept as the blurb so the page still reads as a brief.
 */
export const areaPicks: AreaPick[] = [
  {
    title: "[TBC] Somewhere to eat",
    kind: "eat",
    blurb:
      "[TBC] The one place you send every guest to. A specific recommendation from the host beats a list of twenty links.",
    distanceLine: "[TBC] Distance from the houses",
    photo: {
      src: "/photos/area/eat.jpg",
      alt: "[TBC] Placeholder for a photo of the place to eat",
      width: 1200,
      height: 1200,
    },
  },
  {
    title: "[TBC] Somewhere outdoors",
    kind: "outdoors",
    blurb:
      "[TBC] A greenbelt trail, a swimming hole, a park within a short drive of all three houses.",
    distanceLine: "[TBC] Distance from the houses",
    photo: {
      src: "/photos/area/outdoors.jpg",
      alt: "[TBC] Placeholder for a photo of the outdoors pick",
      width: 1200,
      height: 1200,
    },
  },
  {
    title: "[TBC] Something only locals know",
    kind: "local",
    blurb:
      "[TBC] The detail that makes the page worth reading: the coffee place that opens early, the shortcut that avoids 290 at rush hour, the night the music is good.",
    distanceLine: "[TBC] Distance from the houses",
    photo: {
      src: "/photos/area/local.jpg",
      alt: "[TBC] Placeholder for a photo of the locals-only pick",
      width: 1200,
      height: 1200,
    },
  },
];
