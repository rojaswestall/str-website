import { Suspense } from "react";

import { BookingWidget } from "@/components/booking";
import { PropertyWidget } from "@/components/hospitable";
import { Button } from "@/components/ui";
import { getSite, type Property } from "@/content";
import { cx } from "@/lib/cx";
import { resolveHospitableMode } from "@/lib/hospitable";

/**
 * The booking column: the site's own widget in native mode, otherwise the
 * Hospitable widget for this house (or its stub); then a short note and the
 * Airbnb fallback. `id="book"` is the anchor the home page's "Book direct"
 * buttons point at.
 *
 * The native widget reads request-time data (today's date, live calendar),
 * so under Cache Components it must sit in its own Suspense boundary: the
 * prerendered page carries the fallback and the widget fills in on the
 * client. Without the boundary `next build` fails prerendering the page.
 */
export function BookingPanel({
  property,
  className,
}: {
  property: Property;
  className?: string;
}) {
  const native =
    resolveHospitableMode(getSite().hospitable.mode) === "native" &&
    property.hospitable.uuid !== null;
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
      {native ? (
        <Suspense
          fallback={
            <div
              role="status"
              className="border border-hairline bg-paper-2 p-[clamp(1rem,3vw,1.75rem)] font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase"
            >
              Loading the booking calendar…
            </div>
          }
        >
          <BookingWidget propertyId={property.hospitable.uuid!} />
        </Suspense>
      ) : (
        <PropertyWidget property={property} />
      )}
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
