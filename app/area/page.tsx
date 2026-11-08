import type { Metadata } from "next";
import Link from "next/link";
import { AreaPickCard } from "@/components/area/AreaPickCard";
import { AreaPicksBrowser } from "@/components/area/AreaPicksBrowser";
import { Section, Tbc } from "@/components/ui";
import {
  getAllProperties,
  getAreaPicks,
  getAreaPicksNear,
  getTravel,
  isTbc,
} from "@/content";
import { TRAVEL_BANDS, travelBand } from "@/lib/area-travel";
import { canonicalUrl, openGraphDefaults } from "@/lib/seo";

const description =
  "Where to eat, where to get outside, and what locals know in Austin, with the drive time from each of our three houses.";

export const metadata: Metadata = {
  title: "Area guide",
  description,
  alternates: { canonical: canonicalUrl("/area") },
  openGraph: {
    ...openGraphDefaults,
    title: "Area guide",
    description,
    url: canonicalUrl("/area"),
  },
  twitter: { card: "summary_large_image" },
};

/*
 * The area guide: every pick from content/area.ts with its travel time from
 * each house. Static; reads content at build time. The "Closest to" filter
 * (AreaPicksBrowser) re-sorts the server-rendered cards in the browser using
 * the per-house orders worked out here.
 */
export default function AreaPage() {
  const picks = getAreaPicks();
  const houses = getAllProperties().map(({ slug, name }) => ({ slug, name }));
  const orders = Object.fromEntries(
    houses.map(({ slug }) => [
      slug,
      getAreaPicksNear(slug).map((pick) => ({
        id: pick.id,
        band: travelBand(getTravel(pick, slug)),
      })),
    ]),
  );
  const cards = Object.fromEntries(
    picks.map((pick) => [pick.id, <AreaPickCard key={pick.id} pick={pick} />]),
  );
  /*
   * With a house chosen, its row in every card's travel list stands out. One
   * rule per house, since CSS cannot compare two attribute values.
   */
  const highlight = houses
    .map(
      ({ slug }) =>
        `[data-active-house="${slug}"] [data-testid="drive-times"] [data-slug="${slug}"] :is(dt,dd){color:var(--ink);font-weight:600}`,
    )
    .join("");
  const anyTbc = picks.some(
    (pick) =>
      isTbc(pick.title) ||
      isTbc(pick.blurb) ||
      Object.values(pick.driveMinutes).some((minutes) => minutes === null),
  );

  return (
    <Section aria-labelledby="area-page-heading">
      <Link
        href="/"
        className="inline-block border-b border-transparent py-[0.2rem] font-mono text-[0.78rem] tracking-[0.06em] text-muted uppercase no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink"
      >
        <span aria-hidden="true">← </span>Home
      </Link>

      <header className="mt-6 mb-[clamp(2rem,4vw,3rem)] flex flex-col gap-4">
        <p className="font-mono text-[0.74rem] tracking-[0.1em] text-muted uppercase">
          {anyTbc ? <Tbc>Picks to confirm · Austin</Tbc> : "Our picks · Austin"}
        </p>
        <h1
          id="area-page-heading"
          className="font-display text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.06] font-normal tracking-[-0.012em]"
        >
          What&apos;s worth doing
        </h1>
        <p className="max-w-[60ch] text-ink-soft">
          Oak Hill sits on the southwest edge of town and the other two houses
          are in South Austin, so the same place can be a short hop from one and
          a longer drive from another. Every pick lists the drive time from each
          house, or the walk when it&apos;s close. Choose the house you&apos;re
          booking to see what&apos;s closest first.
        </p>
      </header>

      <style>{highlight}</style>
      <AreaPicksBrowser
        houses={houses}
        defaultOrder={picks.map((pick) => pick.id)}
        orders={orders}
        bands={TRAVEL_BANDS}
        cards={cards}
      />
    </Section>
  );
}
