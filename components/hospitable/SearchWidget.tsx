import { BookingAnalytics } from "@/components/booking";
import { SearchBar } from "@/components/search";
import { getAllProperties, getSite } from "@/content";
import { getBookingConfig } from "@/lib/booking/config";
import { cachedToday } from "@/lib/booking/today";
import { resolveHospitableMode } from "@/lib/hospitable";

import {
  HospitableSearch,
  type HospitableSearchVariant,
} from "./HospitableSearch";

/**
 * Server wrapper: the property search widget, wired to site config. In
 * native mode the bar variant is the site's own `SearchBar`; everything else
 * (the results variant until its checkpoint ships, and both variants in
 * `hospitable` and `stub` modes) is Hospitable's embed or the stub, exactly
 * as before.
 */
export function SearchWidget({
  variant = "bar",
}: {
  variant?: HospitableSearchVariant;
}) {
  const { hospitable } = getSite();
  const propertyCount = getAllProperties().length;

  if (
    resolveHospitableMode(hospitable.mode) === "native" &&
    variant === "bar"
  ) {
    return (
      <BookingAnalytics>
        <NativeSearchBar propertyCount={propertyCount} />
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
