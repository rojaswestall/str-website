import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CheckDates, SearchFallback, SearchResults } from "@/components/search";
import { Eyebrow, Prose, Section } from "@/components/ui";
import { getAllProperties } from "@/content";
import { hospitableConfigured } from "@/lib/booking/client";
import {
  parseSearchParams,
  type SearchParams,
  searchQueryString,
} from "@/lib/booking/search";
import { searchLimits } from "@/lib/booking/search-server";
import { canonicalUrl } from "@/lib/seo";

/*
 * Results page for the "check dates" search. The home hero's form submits
 * here with the stay in the query string (checkin, checkout, adults,
 * children, infants, pets); the form at the top starts from it and the
 * houses free for that stay are listed below, read on the server.
 *
 * The query is request-time data, so under Cache Components everything that
 * reads it sits in a Suspense boundary: the prerendered shell carries the
 * heading and the house links, and the form and results stream in. The
 * page is kept out of the index; its content depends on the query.
 */
export const metadata: Metadata = {
  title: "Check dates",
  description:
    "Search all three houses at once and see which is free for your dates.",
  alternates: { canonical: canonicalUrl("/search") },
  robots: { index: false, follow: true },
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
          Pick your dates and guests, and the houses with those nights open are
          listed below. Choose one to book it direct.
        </p>
      </Prose>
      <div
        role="search"
        aria-label="Check dates"
        className="mt-[clamp(2rem,4vw,3rem)]"
      >
        <Suspense fallback={<FormFallback />}>
          <SearchArea searchParams={searchParams} />
        </Suspense>
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

async function SearchArea({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (!hospitableConfigured()) return <SearchFallback />;
  const parsed = parseSearchParams(params, searchLimits());
  return (
    <>
      <CheckDates
        key={parsed.status === "ok" ? searchQueryString(parsed.query) : "empty"}
        variant="page"
        initial={parsed.status === "ok" ? parsed.query : null}
      />
      {parsed.status === "invalid" ? (
        <p role="alert" className="mt-[1rem] text-ink">
          {parsed.message}
        </p>
      ) : null}
      {parsed.status === "ok" ? <SearchResults query={parsed.query} /> : null}
    </>
  );
}

/** Same footprint as the form, so the page doesn't jump when it streams in. */
function FormFallback() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[5.5rem] border border-hairline bg-paper-2"
    />
  );
}
