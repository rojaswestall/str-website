import { connection } from "next/server";
import { Suspense } from "react";

import { BookingAnalytics } from "@/components/booking";
import { ResultsSkeleton, SearchBar, SearchResults } from "@/components/search";
import { getAllProperties, getSite } from "@/content";
import { getBookingConfig } from "@/lib/booking/config";
import { todayInBookingZone } from "@/lib/booking/dates";
import { parsePrefill, type SearchParamsInput } from "@/lib/booking/search";
import { cachedToday } from "@/lib/booking/today";
import { resolveHospitableMode } from "@/lib/hospitable";

import {
  HospitableSearch,
  type HospitableSearchVariant,
} from "./HospitableSearch";

/**
 * Server wrapper: the property search widget, wired to site config. In
 * native mode it is the site's own search: `SearchBar` for the hero, and
 * for `/search` the bar prefilled from the URL over `SearchResults`. In
 * `hospitable` and `stub` modes both variants are Hospitable's embed or the
 * stub, exactly as before, and `searchParams` is never read.
 */
export function SearchWidget({
  variant = "bar",
  searchParams,
}: {
  variant?: HospitableSearchVariant;
  /** The `/search` page's `searchParams`; only the native results read them. */
  searchParams?: Promise<SearchParamsInput>;
}) {
  const { hospitable } = getSite();
  const propertyCount = getAllProperties().length;

  if (resolveHospitableMode(hospitable.mode) === "native") {
    return (
      <BookingAnalytics>
        {variant === "bar" ? (
          <NativeSearchBar propertyCount={propertyCount} />
        ) : (
          <NativeSearch
            searchParams={searchParams ?? Promise.resolve({})}
            propertyCount={propertyCount}
          />
        )}
      </BookingAnalytics>
    );
  }

  return (
    <HospitableSearch
      searchWidgetId={hospitable.searchWidgetId}
      propertyCount={propertyCount}
      mode={hospitable.mode}
      variant={variant}
    />
  );
}

/*
 * The bar needs today's date (the floor of its picker and the `min` of its
 * no-JavaScript inputs). It comes from `cachedToday`, not `connection()`:
 * the form has to be in the prerendered HTML to work without JavaScript, and
 * the cached date keeps the home page static (see lib/booking/today.ts).
 */
async function NativeSearchBar({ propertyCount }: { propertyCount: number }) {
  return (
    <SearchBar
      today={await cachedToday()}
      maxNights={getBookingConfig().maxNights}
      propertyCount={propertyCount}
    />
  );
}

/*
 * The `/search` page in native mode. The URL is request-time data under
 * Cache Components, so both halves that read it sit in Suspense boundaries
 * and stream in: the prerendered page carries the empty bar (the same one
 * the hero has, so the form is there before anything streams) and the
 * results' skeleton.
 *
 * A new search from the bar is a client-side navigation to the same route,
 * which React runs as a transition: the old results would stay on screen
 * until the new ones are ready, with nothing to say a search is under way.
 * The bar marks its form `data-pending` for as long as that takes, and the
 * two wrappers below swap the results for the skeleton on it, in CSS.
 */
function NativeSearch({
  searchParams,
  propertyCount,
}: {
  searchParams: Promise<SearchParamsInput>;
  propertyCount: number;
}) {
  return (
    <div className="group flex flex-col gap-[clamp(2rem,4vw,3rem)]">
      <Suspense fallback={<NativeSearchBar propertyCount={propertyCount} />}>
        <PrefilledSearchBar
          searchParams={searchParams}
          propertyCount={propertyCount}
        />
      </Suspense>
      <div className="group-has-data-pending:hidden">
        <Suspense fallback={<ResultsSkeleton count={propertyCount} />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </div>
      <div className="hidden group-has-data-pending:block">
        <ResultsSkeleton count={propertyCount} />
      </div>
    </div>
  );
}

/** The bar holding whatever in the URL is valid (`parsePrefill`); the rest is dropped. */
async function PrefilledSearchBar({
  searchParams,
  propertyCount,
}: {
  searchParams: Promise<SearchParamsInput>;
  propertyCount: number;
}) {
  await connection();
  const today = todayInBookingZone();
  const { maxNights } = getBookingConfig();
  const prefill = parsePrefill(await searchParams, { today, maxNights });
  return (
    <SearchBar
      today={today}
      maxNights={maxNights}
      propertyCount={propertyCount}
      defaultSelection={prefill.selection}
      defaultGuests={prefill.guests}
    />
  );
}
