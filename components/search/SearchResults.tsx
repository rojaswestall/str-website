import Link from "next/link";

import { AirbnbTitle } from "@/components/property/AirbnbTitle";
import { propertyRoomItems } from "@/components/property/PropertyBand";
import { Button, PhotoFrame, SpecRow } from "@/components/ui";
import { getProperty, type Property } from "@/content";
import { formatDollars, formatRange, plural } from "@/lib/booking/format";
import {
  describeUnavailable,
  type HouseVerdict,
  type SearchQuery,
  searchQueryString,
} from "@/lib/booking/search";
import { type HouseResult, searchHouses } from "@/lib/booking/search-server";

import { ResultsHeading } from "./ResultsHeading";

type Available = {
  property: Property;
  verdict: Extract<HouseVerdict, { available: true }>;
};
type Unavailable = {
  property: Property;
  verdict: Extract<HouseVerdict, { available: false }>;
};

/*
 * The houses free for a stay, read on the server from the cached calendars.
 * Free houses are cards that link to the house page with the stay in the
 * URL, so the booking widget there (native or embedded) opens on those
 * dates; the rest are listed underneath with the reason they don't fit.
 */
export async function SearchResults({ query }: { query: SearchQuery }) {
  const queryKey = searchQueryString(query);
  let results: HouseResult[];
  try {
    results = await searchHouses(query);
  } catch (error) {
    console.error(
      `[search] ${error instanceof Error ? error.message : String(error)}`,
    );
    return (
      <section
        aria-labelledby="results-heading"
        className="mt-[clamp(2rem,4vw,3rem)]"
      >
        <ResultsHeading queryKey={queryKey} className={headingClass}>
          <span id="results-heading">
            We couldn&apos;t check dates just now
          </span>
        </ResultsHeading>
        <p className="mt-[0.75rem] max-w-measure text-ink-soft">
          Our booking system didn&apos;t answer. Try again in a moment, or open
          a house below and check its calendar there.
        </p>
      </section>
    );
  }

  const available: Available[] = [];
  const unavailable: Unavailable[] = [];
  for (const { property: booking, verdict } of results) {
    const property = getProperty(booking.slug);
    if (!property) continue;
    if (verdict.available) available.push({ property, verdict });
    else unavailable.push({ property, verdict });
  }
  const total = available.length + unavailable.length;
  const party = plural(query.guests.adults + query.guests.children, "guest");
  const stay = `${formatRange(query.checkIn, query.checkOut)}, ${party}`;

  return (
    <section
      aria-labelledby="results-heading"
      className="mt-[clamp(2rem,4vw,3rem)]"
    >
      <ResultsHeading queryKey={queryKey} className={headingClass}>
        <span id="results-heading">
          {available.length === 0
            ? `No house is free for ${stay}`
            : `${available.length} of ${total} ${total === 1 ? "house is" : "houses are"} free for ${stay}`}
        </span>
      </ResultsHeading>
      {available.length === 0 ? (
        <p className="mt-[0.75rem] max-w-measure text-ink-soft">
          Try moving the dates a day or two, or open a house to see its whole
          calendar.
        </p>
      ) : (
        <ul className="mt-[1.5rem] grid gap-[clamp(1.25rem,3vw,2rem)] sm:grid-cols-2 lg:grid-cols-3">
          {available.map(({ property, verdict }) => (
            <li key={property.slug}>
              <ResultCard
                property={property}
                href={`/stays/${property.slug}?${queryKey}#book`}
                nights={verdict.nights}
                totalDollars={verdict.totalDollars}
              />
            </li>
          ))}
        </ul>
      )}

      {unavailable.length > 0 ? (
        <div className="mt-[clamp(2rem,4vw,2.75rem)] border-t border-hairline pt-[1.25rem]">
          <h3 className="font-mono text-[0.72rem] tracking-[0.13em] text-muted uppercase">
            Not free for those dates
          </h3>
          <ul className="mt-[0.75rem] divide-y divide-hairline">
            {unavailable.map(({ property, verdict }) => (
              <li
                key={property.slug}
                className="flex flex-col gap-[0.2rem] py-[0.75rem] sm:flex-row sm:items-baseline sm:justify-between sm:gap-[1.5rem]"
              >
                <Link
                  href={`/stays/${property.slug}`}
                  className="font-display text-[1.15rem] text-ink underline decoration-hairline underline-offset-[0.2em] transition-colors hover:decoration-ink"
                >
                  {property.name}
                </Link>
                <p className="text-[0.95rem] text-ink-soft">
                  {describeUnavailable(verdict)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const headingClass =
  "font-display text-[clamp(1.4rem,2.6vw,1.8rem)] leading-[1.2] font-normal tracking-[-0.01em] text-balance outline-offset-4";

function ResultCard({
  property,
  href,
  nights,
  totalDollars,
}: {
  property: Property;
  href: string;
  nights: number;
  totalDollars: number | null;
}) {
  const hero = property.photos.find((photo) => photo.role === "hero") ?? null;
  return (
    <article className="flex h-full flex-col items-start gap-[0.7rem] border border-hairline bg-paper p-[clamp(0.9rem,2vw,1.1rem)]">
      <PhotoFrame
        image={hero}
        ratio="3:2"
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
        className="w-full"
      />
      <p className="font-mono text-[0.72rem] tracking-[0.11em] text-muted uppercase">
        {property.neighborhood}
      </p>
      <h3 className="font-display text-[1.3rem] leading-[1.2] font-normal tracking-[-0.01em]">
        {property.name}
      </h3>
      <AirbnbTitle title={property.airbnbTitle} className="-mt-[0.35rem]" />
      <SpecRow
        aria-label={`${property.name} at a glance`}
        items={propertyRoomItems(property)}
      />
      <div className="mt-auto flex w-full flex-col items-start gap-[0.75rem] border-t border-hairline pt-[0.75rem]">
        {totalDollars !== null ? (
          <p className="text-ink">
            <span className="text-[1.1rem]">
              About {formatDollars(totalDollars)}
            </span>
            <span className="text-[0.9rem] text-ink-soft">
              {" "}
              for {plural(nights, "night")}, before the cleaning fee and taxes
            </span>
          </p>
        ) : null}
        <Button href={href}>
          Book these dates<span className="sr-only"> at {property.name}</span>
        </Button>
      </div>
    </article>
  );
}
