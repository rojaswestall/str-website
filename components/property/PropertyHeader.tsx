import { Credential } from "@/components/ui";
import type { Property } from "@/content";
import { cx } from "@/lib/cx";

/** Place line, house name, review credential, and the one-line summary. */
export function PropertyHeader({
  property,
  className,
}: {
  property: Property;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-start gap-4", className)}>
      <p className="font-mono text-[0.75rem] tracking-[0.11em] text-muted uppercase">
        {property.locationLine}
      </p>
      <h1 className="max-w-[18ch] font-display text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.06] font-normal tracking-[-0.012em] text-balance">
        {property.name}
      </h1>
      <Credential
        rating={property.rating}
        reviewCount={property.reviewCount}
        guestFavorite={property.guestFavorite}
      />
      <p className="max-w-measure text-[clamp(1.02rem,1.6vw,1.18rem)] text-ink-soft">
        {property.summary}
      </p>
    </div>
  );
}
