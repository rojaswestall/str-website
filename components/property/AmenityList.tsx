import { TagList } from "@/components/ui";
import { cx } from "@/lib/cx";
import { MonoHeading } from "./MonoHeading";

/** The amenity chips under a mono heading. */
export function AmenityList({
  amenities,
  className,
}: {
  amenities: readonly string[];
  className?: string;
}) {
  return (
    <section
      aria-labelledby="amenities-heading"
      className={cx("flex flex-col gap-4", className)}
    >
      <MonoHeading id="amenities-heading">Amenities</MonoHeading>
      <TagList items={amenities} />
    </section>
  );
}
