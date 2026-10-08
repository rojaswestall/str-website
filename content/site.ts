import type { SiteConfig } from "./types";

/*
 * Site-wide configuration. Domain, contact email, and Instagram handle are
 * open items (docs/plan.md, "Needed before step 9 / 14"); they are `[TBC]`
 * placeholders and should render as such, never as a live mailto: or link.
 *
 * The TikTok clip is the one from the artifact (@exploretex, Barton Springs).
 * Set `tiktok` to null to drop the embed if the hosts decide against it.
 */
export const site: SiteConfig = {
  name: "The Austin Collection",
  tagline: "Places we look after, properly.",
  domain: "[TBC] domain",
  contactEmail: "[TBC] email address",
  instagram: "[TBC] instagram handle",
  hospitable: {
    searchWidgetId: null,
    mode: "stub",
  },
  tiktok: {
    url: "https://www.tiktok.com/@exploretex/video/7648810803109367053",
    handle: "exploretex",
  },
  heroCollage: {
    src: "/photos/home/hero-collage.jpg",
    alt: "[TBC] Placeholder for the hero collage of the three houses",
    width: 2100,
    height: 900,
  },
};
