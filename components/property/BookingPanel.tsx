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
      className={cx(
        // On wide screens the column is sticky (see the house page), so it
        // must never be taller than the viewport: it scrolls inside itself
        // and the widget's Reserve footer pins to its bottom edge.
        "flex scroll-mt-6 flex-col gap-[1.1rem] lg:max-h-[calc(100vh_-_4rem)] lg:overflow-y-auto lg:overscroll-contain",
        className,
      )}
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
              aria-busy="true"
              className="flex flex-col gap-4 border border-hairline bg-paper-2 p-[clamp(1rem,3vw,1.75rem)]"
            >
              <p className="font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase">
                Loading the booking calendar…
              </p>
              <div
                aria-hidden="true"
                className="flex animate-pulse flex-col gap-4"
              >
                <div className="h-6 w-44 bg-slot-b" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }, (_, i) => (
                    <div key={i} className="min-h-[2.9rem] bg-slot-a" />
                  ))}
                </div>
                <div className="h-12 bg-slot-a" />
              </div>
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
