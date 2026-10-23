import { ReviewCarousel } from "@/components/home/ReviewCarousel";
import type { Quote } from "@/content";
import { cx } from "@/lib/cx";
import { MonoHeading } from "./MonoHeading";

/**
 * This house's guest review quotes as the same timed slideshow as the home
 * page, in its column layout: clipped to the copy column (so a sliding quote
 * never runs under the booking panel) and left-aligned like the rest of the
 * column. Renders nothing when there are none: quotes come from real Airbnb
 * reviews and are never seeded with placeholders.
 */
export function Quotes({
  quotes,
  className,
}: {
  quotes: readonly Quote[];
  className?: string;
}) {
  if (quotes.length === 0) return null;

  return (
    <section
      aria-labelledby="quotes-heading"
      data-testid="guest-quotes"
      className={cx("flex flex-col gap-4", className)}
    >
      <MonoHeading id="quotes-heading">What guests say</MonoHeading>
      <ReviewCarousel quotes={quotes} layout="column" />
    </section>
  );
}
