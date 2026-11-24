import { AirbnbTitle } from "@/components/property/AirbnbTitle";
import { Button, PhotoFrame } from "@/components/ui";
import { getProperty } from "@/content";
import { formatDollars, plural } from "@/lib/booking/format";
import type { Guests } from "@/lib/booking/rules";
import { houseHref, refusalText } from "@/lib/booking/search";
import type { SearchResult, StayEvaluation } from "@/lib/booking/types";
import { cx } from "@/lib/cx";

/** What a card shows about a house: a search result's fields, or the same from content. */
export type ResultCardHouse = Pick<
  SearchResult,
  "slug" | "name" | "bedrooms" | "bathrooms" | "maxGuests" | "heroImage"
> & { currency?: string };

const STATUS_CLASS =
  "font-mono text-[0.72rem] tracking-[0.11em] text-muted uppercase";

/*
 * One house on /search. Three shapes from one frame:
 *
 * - free for the stay: the calendar's estimate (never called the price; the
 *   quote on the house page is) and the primary button, which carries the
 *   whole stay to the house page so it is quoted on arrival;
 * - not free: one plain line saying why, and a ghost button to the house's
 *   own calendar with the guests only;
 * - no verdict (`stay` omitted: no dates searched, or nothing could be
 *   checked): the house and the ghost button, with no claim either way.
 *
 * A Server Component: nothing here needs the browser.
 */
export function ResultCard({
  house,
  guests,
  stay,
  dates,
  className,
}: {
  house: ResultCardHouse;
  guests: Guests;
  /** The verdict for the searched stay; omit for a card that claims nothing. */
  stay?: StayEvaluation;
  /** The searched stay, carried to the house page by a free card. */
  dates?: { checkIn: string; checkOut: string };
  className?: string;
}) {
  const headingId = `result-${house.slug}`;
  const free = stay?.available === true;
  const airbnbTitle = getProperty(house.slug)?.airbnbTitle;
  return (
    <article
      aria-labelledby={headingId}
      data-testid="search-result"
      data-slug={house.slug}
      data-available={stay ? String(stay.available) : undefined}
      className={cx(
        "flex h-full flex-col items-start gap-[0.75rem]",
        className,
      )}
    >
      <PhotoFrame
        image={house.heroImage}
        ratio="3:2"
        sizes="(min-width: 1180px) 360px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="w-full"
      />
      {stay ? (
        <p className={STATUS_CLASS}>
          {stay.available
            ? "Free for these dates"
            : stay.reason === "unknown"
              ? "Not checked"
              : "Not free for these dates"}
        </p>
      ) : null}
      <h3
        id={headingId}
        className="font-display text-[1.35rem] leading-[1.2] font-normal tracking-[-0.01em]"
      >
        {house.name}
      </h3>
      {airbnbTitle ? (
        <AirbnbTitle title={airbnbTitle} className="-mt-[0.4rem]" />
      ) : null}
      <p className="font-mono text-[0.78rem] tracking-[0.04em] text-muted">
        {house.bedrooms} bed · {house.bathrooms} bath · up to {house.maxGuests}{" "}
        guests
      </p>

      {stay?.available ? (
        <div className="flex flex-col gap-[0.2rem]">
          <p className="font-display text-[1.2rem] leading-[1.25] text-ink">
            from {formatDollars(stay.nightly.min / 100, house.currency)} / night
          </p>
          <p className="max-w-[40ch] text-[0.92rem] text-ink-soft">
            about{" "}
            {formatDollars(stay.estimatedNightlyTotal / 100, house.currency)}{" "}
            for {plural(stay.nights, "night")}, before fees and taxes
          </p>
        </div>
      ) : stay ? (
        <p className="max-w-[40ch] text-[0.95rem] text-ink-soft">
          {refusalText(stay, house)}
        </p>
      ) : null}

      {/* mt-auto: the buttons of a row line up whatever sits above them. */}
      <div className="mt-auto pt-[0.35rem]">
        {free && dates ? (
          <Button
            href={houseHref(house.slug, guests, dates)}
            aria-label={`See the price and book: ${house.name}`}
          >
            See the price and book
          </Button>
        ) : (
          <Button
            href={houseHref(house.slug, guests)}
            variant="ghost"
            aria-label={`See the calendar: ${house.name}`}
          >
            See the calendar
          </Button>
        )}
      </div>
    </article>
  );
}
