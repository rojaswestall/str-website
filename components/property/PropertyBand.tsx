import Link from "next/link";
import {
  Button,
  Credential,
  PhotoFrame,
  SpecRow,
  type SpecItem,
} from "@/components/ui";
import type { Property } from "@/content";
import { cx } from "@/lib/cx";

import { AirbnbTitle } from "./AirbnbTitle";

/** The house itself: sleeps, bedrooms, beds, baths. */
export function propertyRoomItems(property: Property): SpecItem[] {
  return [
    { label: `Sleeps ${property.sleeps}` },
    { label: `${property.bedrooms} bed` },
    { label: `${property.beds} ${property.beds === 1 ? "bed" : "beds"}` },
    { label: `${property.bathrooms} bath` },
  ];
}

/**
 * The full mono spec strip for a house page: the rooms plus minimum nights and
 * rate, which render as Tbc until confirmed.
 */
export function propertySpecItems(property: Property): SpecItem[] {
  return [
    ...propertyRoomItems(property),
    property.minNights === null
      ? { label: "min nights t.b.c.", tbc: true }
      : {
          label: `${property.minNights} ${property.minNights === 1 ? "night" : "nights"} min`,
        },
    property.rateFrom === null
      ? { label: "rate t.b.c.", tbc: true }
      : { label: `from $${property.rateFrom} / night`, strong: true },
  ];
}

/*
 * Where fingers rather than a mouse are the likely input, the photo and the
 * house name are tap targets for the house page too: on a touch-first device
 * (primary pointer is coarse, at any width) and in the stacked layout below
 * 760px. Elsewhere they stay inert, as on desktop the two buttons do the job.
 * Both links are out of the tab order and the photo link is hidden from
 * assistive tech, so keyboard and screen-reader users meet each destination
 * once, through "See the whole home".
 */
const tapOnly =
  "pointer-events-none max-[759px]:pointer-events-auto pointer-coarse:pointer-events-auto";

/*
 * One house on the home page: the artifact's two-column `.property` band.
 * Photo left, body right; `flip` puts the photo on the right at ≥760px (the
 * artifact's `nth-child(even)` rule) and stacks photo-first below that.
 * Deliberately brief: rooms only. Rate, minimum nights, and amenities are on
 * the house page ("See the whole home").
 */
export function PropertyBand({
  property,
  flip = false,
  className,
}: {
  property: Property;
  flip?: boolean;
  className?: string;
}) {
  const hero = property.photos.find((photo) => photo.role === "hero") ?? null;
  const headingId = `stay-${property.slug}`;

  return (
    <article
      aria-labelledby={headingId}
      data-testid="property-band"
      data-slug={property.slug}
      className={cx(
        "grid items-center gap-[clamp(1.5rem,4vw,3.5rem)] py-[clamp(2rem,4vw,3.25rem)] min-[760px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
        className,
      )}
    >
      <Link
        href={`/stays/${property.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="property-band-photo-link"
        className={cx(
          "block transition-opacity active:opacity-85",
          tapOnly,
          flip && "min-[760px]:order-2",
        )}
      >
        <PhotoFrame
          image={hero}
          ratio="3:2"
          sizes="(min-width: 1180px) 630px, (min-width: 760px) 54vw, 100vw"
        />
      </Link>
      <div className="flex flex-col items-start gap-4">
        <p className="font-mono text-[0.75rem] tracking-[0.11em] text-muted uppercase">
          {property.locationLine}
        </p>
        <h3
          id={headingId}
          className="font-display text-[clamp(1.55rem,3vw,2.05rem)] leading-[1.12] font-normal tracking-[-0.01em] text-balance"
        >
          <Link
            href={`/stays/${property.slug}`}
            tabIndex={-1}
            data-testid="property-band-title-link"
            className={cx(
              "text-inherit no-underline transition-opacity active:opacity-70",
              tapOnly,
            )}
          >
            {property.name}
          </Link>
        </h3>
        <AirbnbTitle title={property.airbnbTitle} className="-mt-2" />
        <Credential
          rating={property.rating}
          reviewCount={property.reviewCount}
          guestFavorite={property.guestFavorite}
        />
        <p className="max-w-[46ch] text-ink-soft">{property.description}</p>
        <SpecRow
          aria-label={`${property.name} at a glance`}
          items={propertyRoomItems(property)}
        />
        <div className="mt-[0.35rem] flex flex-wrap gap-[0.6rem]">
          <Button href={`/stays/${property.slug}#book`}>Book direct</Button>
          <Button href={`/stays/${property.slug}`} variant="ghost">
            See the whole home
          </Button>
        </div>
      </div>
    </article>
  );
}
