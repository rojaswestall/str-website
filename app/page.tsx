import type { Metadata } from "next";
import { AreaGuide } from "@/components/area/AreaGuide";
import { Hero } from "@/components/home/Hero";
import { GuestReviews } from "@/components/home/GuestReviews";
import { HostsStrip } from "@/components/home/HostsStrip";
import { Stays } from "@/components/home/Stays";
import { WhyBookDirect } from "@/components/home/WhyBookDirect";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSite } from "@/content";
import { canonicalUrl, openGraphDefaults, organizationJsonLd } from "@/lib/seo";

const site = getSite();

/*
 * Title stays the root default (the bare site name, no template). No
 * `openGraph.images` here on purpose: the `app/opengraph-image.tsx` file
 * convention supplies the tag, absolute through `metadataBase` and with the
 * cache-busting hash scrapers need when the artwork changes.
 */
export const metadata: Metadata = {
  description: site.description,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    ...openGraphDefaults,
    title: site.name,
    description: site.description,
    url: canonicalUrl("/"),
  },
  twitter: { card: "summary_large_image" },
};

/*
 * The landing page, section by section. The area guide sits after the
 * reviews and before the hosts (moved there 2026-11-24). Everything
 * reads from `@/content` at build time; nothing here is dynamic, so the route
 * prerenders as a static page.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Hero />
      <Stays />
      <WhyBookDirect />
      <GuestReviews />
      <AreaGuide />
      <HostsStrip />
    </>
  );
}
