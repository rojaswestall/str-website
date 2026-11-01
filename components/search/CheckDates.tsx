import Link from "next/link";

import { getAllProperties } from "@/content";
import { hospitableConfigured } from "@/lib/booking/client";
import type { SearchQuery } from "@/lib/booking/search";

import { SearchForm, type SearchFormVariant } from "./SearchForm";

/*
 * The "check dates" search, or, when the booking API has no token (local
 * builds, the stub and live e2e projects), a short panel that sends guests
 * to a house's own calendar instead. The search needs only
 * HOSPITABLE_PERSONAL_ACCESS_TOKEN; it does not depend on
 * NEXT_PUBLIC_HOSPITABLE_MODE, so Production can run it while the house
 * pages still embed Hospitable's booking widget.
 */
export function CheckDates({
  variant,
  initial = null,
}: {
  variant: SearchFormVariant;
  initial?: SearchQuery | null;
}) {
  const properties = getAllProperties();
  if (!hospitableConfigured()) {
    return <SearchFallback />;
  }
  const maxGuests = Math.max(...properties.map((p) => p.sleeps));
  const petsAllowed = properties.some((p) =>
    p.amenities.some((a) => /\bpets? allowed\b/i.test(a)),
  );
  return (
    <SearchForm
      initial={initial}
      maxGuests={maxGuests}
      petsAllowed={petsAllowed}
      variant={variant}
    />
  );
}

export function SearchFallback() {
  const properties = getAllProperties();
  return (
    <div
      data-testid="check-dates-fallback"
      className="flex flex-col gap-[0.9rem] border border-hairline bg-paper-2 p-[clamp(1rem,2.5vw,1.25rem)]"
    >
      <p className="max-w-[46ch] text-[0.98rem] text-ink-soft">
        Each house has its own calendar. Open one to see the nights that are
        free.
      </p>
      <ul className="flex flex-wrap gap-x-[1.5rem] gap-y-[0.5rem]">
        {properties.map((property) => (
          <li key={property.slug}>
            <Link
              href={`/stays/${property.slug}#book`}
              className="font-display text-[1.1rem] text-ink underline decoration-hairline underline-offset-[0.2em] transition-colors hover:decoration-ink"
            >
              {property.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
