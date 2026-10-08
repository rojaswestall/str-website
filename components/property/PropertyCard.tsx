import Link from "next/link";
import { Credential, PhotoFrame } from "@/components/ui";
import type { Property } from "@/content";
import { cx } from "@/lib/cx";

/** Compact card: hero photo, place line, name (the link), credential, and the one-line summary. */
export function PropertyCard({
  property,
  className,
}: {
  property: Property;
  className?: string;
}) {
  const hero = property.photos.find((photo) => photo.role === "hero") ?? null;
  return (
    <article
      className={cx("flex flex-col items-start gap-[0.75rem]", className)}
    >
      <PhotoFrame
        image={hero}
        ratio="3:2"
        sizes="(min-width: 1180px) 560px, (min-width: 640px) 50vw, 100vw"
        className="w-full"
      />
      <p className="font-mono text-[0.75rem] tracking-[0.11em] text-muted uppercase">
        {property.locationLine}
      </p>
      <h3 className="font-display text-[1.35rem] leading-[1.2] font-normal tracking-[-0.01em]">
        <Link
          href={`/stays/${property.slug}`}
          className="border-b border-hairline pb-px no-underline transition-[border-color] duration-[120ms] hover:border-ink"
        >
          {property.name}
        </Link>
      </h3>
      <Credential
        rating={property.rating}
        reviewCount={property.reviewCount}
        guestFavorite={property.guestFavorite}
      />
      <p className="max-w-[46ch] text-[0.95rem] text-ink-soft">
        {property.summary}
      </p>
    </article>
  );
}
