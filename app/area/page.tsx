import type { Metadata } from "next";
import Link from "next/link";
import { AreaPickCard } from "@/components/area/AreaPickCard";
import { Section, Tbc } from "@/components/ui";
import { getAreaPicks, isTbc } from "@/content";
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
 * The area guide: every pick from content/area.ts with its drive time from
 * each house. Static; reads content at build time.
 */
export default function AreaPage() {
  const picks = getAreaPicks();
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
          house; look for the one you&apos;re booking.
        </p>
      </header>

      <div
        data-testid="area-picks"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]"
      >
        {picks.map((pick) => (
          <AreaPickCard key={pick.id} pick={pick} />
        ))}
      </div>
    </Section>
  );
}
