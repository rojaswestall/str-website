import { PropertyWidget } from "@/components/hospitable";
import { Button } from "@/components/ui";
import type { Property } from "@/content";
import { cx } from "@/lib/cx";

/**
 * The booking column: the Hospitable widget for this house (or its stub), a
 * short note, and the Airbnb fallback. `id="book"` is the anchor the home
 * page's "Book direct" buttons point at.
 */
export function BookingPanel({
  property,
  className,
}: {
  property: Property;
  className?: string;
}) {
  return (
    <section
      id="book"
      aria-labelledby="book-heading"
      className={cx("flex scroll-mt-6 flex-col gap-[1.1rem]", className)}
    >
      <h2
        id="book-heading"
        className="font-display text-[clamp(1.55rem,3vw,2.05rem)] leading-[1.12] font-normal tracking-[-0.01em]"
      >
        Book direct
      </h2>
      <PropertyWidget property={property} />
      <p className="font-mono text-[0.72rem] tracking-[0.04em] text-muted">
        Same calendar as Airbnb, no platform fee
      </p>
      <Button
        href={property.airbnbUrl}
        variant="ghost"
        external
        className="self-start"
      >
        Or view on Airbnb
      </Button>
    </section>
  );
}
