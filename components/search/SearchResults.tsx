import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { getAllProperties } from "@/content";
import { getBookingConfig } from "@/lib/booking/config";
import { todayInBookingZone } from "@/lib/booking/dates";
import type { Guests } from "@/lib/booking/rules";
import {
  freeFirst,
  nothingKnown,
  parseSearchPage,
  resultsHeadline,
  type SearchParamsInput,
} from "@/lib/booking/search";
import { searchAvailability } from "@/lib/booking/server";
import type { SearchAvailability } from "@/lib/booking/types";

import { ResultCard, type ResultCardHouse } from "./ResultCard";

const HEADING_CLASS =
  "font-display text-[clamp(1.45rem,2.8vw,1.9rem)] leading-[1.15] font-normal tracking-[-0.01em] text-balance";

const NOTE_CLASS = "max-w-[62ch] text-[0.95rem] text-ink-soft";

const GRID_CLASS =
  "grid gap-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-2 lg:grid-cols-3";

/*
 * The results of the site's own search, rendered on the server for the
 * `/search` page: which houses are free for the stay in the URL, from the
 * same cached calendars and the same rules as the availability route
 * (`searchAvailability`), so no request leaves the browser for the first
 * paint. `connection()` marks it as request-time work (today's date, live
 * calendars), which is why the page mounts it inside a Suspense boundary.
 *
 * The URL is read leniently (`parseSearchPage`): anything short of a whole,
 * future stay within `MAX_NIGHTS` is "no dates", an invitation to pick them
 * over the houses as plain cards. With a stay, the free houses come first
 * with the calendar's estimate (labelled as one; the quote on the house
 * page is the price), then the rest with the reason. When nothing could be
 * checked the houses are listed with no claim at all.
 */
export async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  await connection();
  const { maxNights } = getBookingConfig();
  const page = parseSearchPage(await searchParams, {
    today: todayInBookingZone(),
    maxNights,
  });
  const { guests, query } = page;

  if (!query) {
    return (
      <Results
        state="invitation"
        heading="Pick your dates to see which houses are free"
        houses={contentHouses()}
        guests={guests}
      >
        {page.tooLong ? (
          <p className={NOTE_CLASS}>
            Stays are limited to {maxNights} nights online, so that check-out
            was dropped. For a longer stay, please{" "}
            <Link
              href="/#direct"
              className="text-ink underline decoration-hairline underline-offset-[0.2em] hover:decoration-ink"
            >
              send us a message
            </Link>
            .
          </p>
        ) : null}
        <p className={NOTE_CLASS}>
          Choose a check-in and a check-out above. Until then the houses are
          listed below, each with its own calendar.
        </p>
      </Results>
    );
  }

  let search: SearchAvailability | null = null;
  try {
    search = await searchAvailability(query);
  } catch (error) {
    // Not configured, or the property list could not be read. The cause is
    // only logged; the guest gets the houses without a claim.
    console.error(
      `[booking:search] results unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!search || search.results.length === 0 || nothingKnown(search.results)) {
    return (
      <Results
        state="unavailable"
        heading="We couldn't check the calendars just now"
        houses={search?.results.length ? search.results : contentHouses()}
        guests={guests}
      >
        <p className={NOTE_CLASS}>
          Please try again in a moment. The houses are listed below without an
          answer for those dates; each one&rsquo;s page has its own calendar.
        </p>
      </Results>
    );
  }

  const results = freeFirst(search.results);
  const noneFree = results.every((result) => !result.stay.available);
  return (
    <ResultsFrame
      state="results"
      heading={resultsHeadline(results, query.checkIn, query.checkOut)}
    >
      {noneFree ? (
        <p className={NOTE_CLASS}>
          Try other dates above, or open a house&rsquo;s calendar to see which
          nights are open.
        </p>
      ) : (
        <p className={NOTE_CLASS}>
          The figures are estimates: the nightly rates on each house&rsquo;s
          calendar for those nights, before the cleaning fee and taxes. The
          price is the quote on the house page.
        </p>
      )}
      <ul className={GRID_CLASS}>
        {results.map((result) => (
          <li key={result.slug}>
            <ResultCard
              house={result}
              guests={guests}
              stay={result.stay}
              dates={query}
            />
          </li>
        ))}
      </ul>
    </ResultsFrame>
  );
}

/** The houses as content has them, for the cards that claim nothing. */
function contentHouses(): ResultCardHouse[] {
  return getAllProperties().map((property) => ({
    slug: property.slug,
    name: property.name,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.sleeps,
    heroImage:
      property.photos.find((photo) => photo.role === "hero") ??
      property.photos[0]!,
  }));
}

function ResultsFrame({
  state,
  heading,
  children,
}: {
  state: "results" | "invitation" | "unavailable";
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="search-results-heading"
      data-testid="search-results"
      data-state={state}
      className="flex flex-col gap-[clamp(1rem,2vw,1.4rem)]"
    >
      <h2 id="search-results-heading" className={HEADING_CLASS}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** A heading, its notes, and the houses as cards with no verdict. */
function Results({
  state,
  heading,
  houses,
  guests,
  children,
}: {
  state: "invitation" | "unavailable";
  heading: string;
  houses: readonly ResultCardHouse[];
  guests: Guests;
  children: ReactNode;
}) {
  return (
    <ResultsFrame state={state} heading={heading}>
      {children}
      <ul className={GRID_CLASS}>
        {houses.map((house) => (
          <li key={house.slug}>
            <ResultCard house={house} guests={guests} />
          </li>
        ))}
      </ul>
    </ResultsFrame>
  );
}

/**
 * The Suspense fallback, and so what the prerendered page carries: the
 * results' outline, pulsing. React reveals a streamed boundary with a
 * script, so without JavaScript this is all there is; the `noscript` line
 * says so and points at the house links under it.
 */
export function ResultsSkeleton({ count }: { count: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      data-testid="search-results-skeleton"
      className="flex flex-col gap-[clamp(1rem,2vw,1.4rem)]"
    >
      <p className="font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase">
        Checking the calendars…
      </p>
      <noscript>
        <p className={NOTE_CLASS}>
          The results need JavaScript. Without it, go straight to a house below:
          each page has its own calendar.
        </p>
      </noscript>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
        <div className="h-8 w-[min(100%,34rem)] bg-slot-b" />
        <div className={GRID_CLASS}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex flex-col gap-[0.75rem]">
              <div className="aspect-[3/2] bg-slot-a" />
              <div className="h-6 w-40 bg-slot-b" />
              <div className="h-4 w-52 bg-slot-a" />
              <div className="h-10 w-44 bg-slot-a" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
