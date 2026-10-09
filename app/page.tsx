import type { Metadata } from "next";
import { AreaGuide } from "@/components/area/AreaGuide";
import { Hero } from "@/components/home/Hero";
import { HostsStrip } from "@/components/home/HostsStrip";
import { Practicals } from "@/components/home/Practicals";
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
 * The landing page, section by section in the artifact's order. Everything
 * reads from `@/content` at build time; nothing here is dynamic, so the route
 * prerenders as a static page.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Hero />
      <Stays />
      <HostsStrip />
      <AreaGuide />
      <Practicals />
      <WhyBookDirect />
    </>
  );
}
