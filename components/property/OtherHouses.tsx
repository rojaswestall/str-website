import type { Property } from "@/content";
import { PropertyCard } from "./PropertyCard";

/** "Other houses": the two houses that are not this one, as compact cards. */
export function OtherHouses({
  properties,
}: {
  properties: readonly Property[];
}) {
  if (properties.length === 0) return null;
  return (
    <nav
      aria-labelledby="other-houses-heading"
      className="flex flex-col gap-[clamp(1.5rem,3vw,2rem)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <h2
          id="other-houses-heading"
          className="font-display text-[clamp(1.55rem,3vw,2.05rem)] leading-[1.12] font-normal tracking-[-0.01em]"
        >
          Other houses
        </h2>
        <p className="font-mono text-[0.78rem] tracking-[0.05em] text-muted uppercase">
          {properties.length === 1
            ? "One more in the collection"
            : `${properties.length} more in the collection`}
        </p>
      </div>
      <ul className="grid gap-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-2">
        {properties.map((property) => (
          <li key={property.slug}>
            <PropertyCard property={property} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
