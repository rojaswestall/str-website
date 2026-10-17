import type { Metadata } from "next";
import Link from "next/link";
import { SearchWidget } from "@/components/hospitable";
import { Eyebrow, Prose, Section } from "@/components/ui";
import { getAllProperties } from "@/content";
import { canonicalUrl } from "@/lib/seo";

/*
 * Results page for Hospitable's property search. The hero bar on the home
 * page submits here with the dates and guests in the query string, and the
 * widget below lists the houses that are free. Its content is client-rendered
 * by Hospitable, so the page is kept out of the index; the three house links
 * are the no-script fallback and the first thing on screen while it loads.
 */
export const metadata: Metadata = {
  title: "Check dates",
  description:
    "Search all three houses at once and see which is free for your dates.",
  alternates: { canonical: canonicalUrl("/search") },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  const properties = getAllProperties();
  return (
    <Section className="flex-1" aria-labelledby="search-heading">
      <Eyebrow className="mb-[1.1rem]">Check dates · all three houses</Eyebrow>
      <h1
        id="search-heading"
        className="max-w-[16ch] font-display text-[clamp(2.4rem,6.4vw,4.4rem)] leading-[1.04] font-light tracking-[-0.015em] text-balance"
      >
        Which house is free?
      </h1>
      <Prose className="mt-[1.4rem] text-[clamp(1.02rem,1.6vw,1.18rem)]">
        <p>
          Pick your dates and the houses with those nights open are listed
          below, with the same calendar the listings use. Choose one to book
          it direct.
        </p>
      </Prose>
      <div className="mt-[clamp(2rem,4vw,3rem)]">
        <SearchWidget variant="results" />
      </div>
      <nav
        aria-label="The houses"
        className="mt-[clamp(2rem,4vw,3rem)] border-t border-hairline pt-[1.25rem]"
      >
        <p className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
          Or go straight to a house
        </p>
        <ul className="mt-[0.8rem] flex flex-wrap gap-x-[1.5rem] gap-y-[0.5rem]">
          {properties.map((property) => (
            <li key={property.slug}>
              <Link
                href={`/stays/${property.slug}`}
                className="font-display text-[1.15rem] text-ink underline decoration-hairline underline-offset-[0.2em] transition-colors hover:decoration-ink"
              >
                {property.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Section>
  );
}
