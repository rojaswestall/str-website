import Link from "next/link";
import {
  Credential,
  formatRating,
  Section,
  SectionHead,
  Tbc,
} from "@/components/ui";
import { ReviewCarousel } from "@/components/home/ReviewCarousel";
import { getAllProperties } from "@/content";

/*
 * `#reviews`: the Airbnb review record for each house, then guest quotes from
 * every house (two each) as a timed slideshow. Ratings and counts come from content (copied from the live
 * listings); the headline average is weighted by review count. Quotes are
 * never invented: until content has some, a dashed note says what is missing.
 */
export function GuestReviews() {
  const properties = getAllProperties();
  const totalReviews = properties.reduce((n, p) => n + p.reviewCount, 0);
  const average =
    properties.reduce((sum, p) => sum + p.rating * p.reviewCount, 0) /
    totalReviews;
  // Two quotes per house, interleaved (first from each house, then second),
  // so no single house fills the section. Content order picks which two.
  const quotes = [0, 1].flatMap((index) =>
    properties.flatMap((property) => {
      const quote = property.quotes[index];
      return quote ? [{ ...quote, propertyName: property.name }] : [];
    }),
  );

  return (
    <Section id="reviews" hairline aria-labelledby="reviews-heading">
      <SectionHead
        id="reviews-heading"
        title="What guests say"
        meta={
          <>
            <span aria-hidden="true">★ </span>
            {formatRating(Math.round(average * 100) / 100)} average ·{" "}
            {totalReviews} reviews
          </>
        }
      />

      <ul
        data-testid="review-records"
        className="grid border-t border-hairline sm:grid-cols-3 sm:gap-x-[clamp(1.5rem,3vw,2.5rem)]"
      >
        {properties.map((property) => (
          <li
            key={property.slug}
            className="flex flex-col items-start gap-[0.6rem] border-b border-hairline py-[1.1rem]"
          >
            <Link
              href={`/stays/${property.slug}`}
              className="font-display text-[1.25rem] text-ink no-underline hover:underline"
            >
              {property.name}
            </Link>
            <Credential
              rating={property.rating}
              reviewCount={property.reviewCount}
              guestFavorite={property.guestFavorite}
            />
            <a
              href={property.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-transparent py-[0.2rem] font-mono text-[0.72rem] tracking-[0.06em] text-muted uppercase no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink"
            >
              Read the reviews on Airbnb
              <span className="sr-only"> for {property.name}</span>
              <span aria-hidden="true"> ↗</span>
            </a>
          </li>
        ))}
      </ul>

      {quotes.length > 0 ? (
        <ReviewCarousel
          quotes={quotes}
          className="mt-[clamp(2.5rem,5vw,4rem)]"
        />
      ) : (
        <p
          data-testid="review-quotes-tbc"
          className="mt-[clamp(1.5rem,3vw,2rem)] font-mono text-[0.74rem] tracking-[0.04em]"
        >
          <Tbc>Guest quotes to add: two or three per house, from Airbnb</Tbc>
        </p>
      )}
    </Section>
  );
}
