import type { Metadata } from "next";
import { AreaGuide } from "@/components/area/AreaGuide";
import { Hero } from "@/components/home/Hero";
import { HostsStrip } from "@/components/home/HostsStrip";
import { Practicals } from "@/components/home/Practicals";
import { Stays } from "@/components/home/Stays";
import { WhyBookDirect } from "@/components/home/WhyBookDirect";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSite } from "@/content";
import {
  canonicalUrl,
  openGraphDefaults,
  organizationJsonLd,
  siteDescription,
} from "@/lib/seo";

const site = getSite();

/*
 * Title stays the root default (the bare site name, no template). The OG
 * image is the generated card at /opengraph-image; listing it explicitly
 * replaces the file-convention tag with the same route, so the URL is built
 * through canonicalUrl like every other absolute URL.
 */
export const metadata: Metadata = {
  description: siteDescription,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    ...openGraphDefaults,
    title: site.name,
    description: siteDescription,
    url: canonicalUrl("/"),
    images: [
      {
        url: canonicalUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: site.name,
      },
    ],
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
