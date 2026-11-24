import type { Host } from "./types";

/*
 * Host bios are an open item (docs/plan.md, "Content still marked [TBC]").
 * Alexis's line is confirmed; Gabe's and Aaron's are placeholders. Photos are
 * omitted until all three hosts have one (public/photos/hosts/alexis.jpg is
 * ready), so the strip stays even.
 */
export const hosts: Host[] = [
  {
    name: "Alexis",
    line: "A coffee lover who's probably at a local café right now.",
  },
  { name: "Gabe", line: "[TBC] One sentence about Gabe." },
  { name: "Aaron", line: "[TBC] One sentence about Aaron." },
];
