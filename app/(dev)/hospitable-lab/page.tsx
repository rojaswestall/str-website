import type { Metadata } from "next";
import Link from "next/link";
import { TikTokEmbed } from "@/components/embeds/TikTokEmbed";
import { SearchWidget } from "@/components/hospitable";
import { Section, SectionHead } from "@/components/ui";
import { getAllProperties, getSite } from "@/content";
import { assertDevRoute } from "../dev-routes";

export const metadata: Metadata = {
  title: "Hospitable lab",
  robots: { index: false, follow: false },
};

/*
 * Temporary home for the step 6 widgets until step 7 (home) and step 8
 * (property pages) mount them for real. Step 8 deletes this folder and points
 * e2e/hospitable*.spec.ts at /stays/<slug> instead.
 */
export default function HospitableLabPage() {
  assertDevRoute();
  const site = getSite();
  const properties = getAllProperties();

  return (
    <>
      <Section>
        <SectionHead
          title="Hospitable lab"
          meta={`mode in content · ${site.hospitable.mode}`}
          lede="The search widget, the TikTok embed, and one booking widget per house. Mode follows NEXT_PUBLIC_HOSPITABLE_MODE, then content."
        />
        <SearchWidget />
      </Section>
      <Section hairline>
        <SectionHead title="Booking widgets" meta="one per house" />
        <ul className="flex flex-wrap gap-[0.6rem] font-mono text-[0.78rem] tracking-[0.06em] uppercase">
          {properties.map((property) => (
            <li key={property.slug}>
              <Link
                href={`/hospitable-lab/${property.slug}`}
                className="border-b border-hairline pb-px no-underline hover:border-ink"
              >
                {property.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section hairline>
        <SectionHead
          title="TikTok"
          meta={site.tiktok ? `@${site.tiktok.handle}` : "off"}
        />
        <div className="max-w-[360px]">
          <TikTokEmbed clip={site.tiktok} />
        </div>
      </Section>
    </>
  );
}
