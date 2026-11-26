import type { Host } from "./types";

/*
 * The people behind the houses, in the order the hero names them. Photos
 * are 480x480 square crops of the hosts' originals (JPEG quality 82,
 * metadata stripped) under public/photos/hosts/.
 */
export const hosts: Host[] = [
  {
    name: "Alexis",
    photo: {
      src: "/photos/hosts/alexis.jpg",
      alt: "Alexis",
      width: 480,
      height: 480,
    },
    line: "The detail person: if something's out of place, she's already fixed it.",
  },
  {
    name: "Gabe",
    photo: {
      src: "/photos/hosts/gabe.jpg",
      alt: "Gabe",
      width: 480,
      height: 480,
    },
    line: "Keeps an eye on the big picture, so the homes keep getting better.",
  },
  {
    name: "Aaron",
    photo: {
      src: "/photos/hosts/aaron.jpg",
      alt: "Aaron",
      width: 480,
      height: 480,
    },
    line: "The co-host who looks after you day to day, from check-in to checkout.",
  },
];
