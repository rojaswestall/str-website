import type { Host } from "./types";

/*
 * Host bios are an open item (docs/plan.md, "Content still marked [TBC]").
 * Alexis's and Aaron's lines are confirmed; Gabe's is a placeholder. Photos
 * are omitted until all three hosts have one (public/photos/hosts/alexis.jpg
 * and aaron.jpg are ready), so the strip stays even.
 */
export const hosts: Host[] = [
  {
    name: "Alexis",
    line: "The detail person: if something's out of place, she's already fixed it.",
  },
  { name: "Gabe", line: "[TBC] One sentence about Gabe." },
  {
    name: "Aaron",
    line: "The co-host who looks after you day to day, from check-in to checkout.",
  },
];
