import Link from "next/link";
import { MonoHeading } from "@/components/property/MonoHeading";
import { TbcText } from "@/components/ui";
import { getAreaPicksNear, getTravel, type Property } from "@/content";
import { KIND_LABEL } from "./AreaPickCard";
import { TravelTime } from "./DriveTimes";

/**
 * "Near this house" on a property page: the closest area-guide picks from
 * this house (walkable ones first, then by drive time), each linking to its entry on /area, which shows the
 * times from every house.
 */
export function NearbyPicks({
  property,
  limit = 3,
}: {
  property: Property;
  limit?: number;
}) {
  const picks = getAreaPicksNear(property.slug).slice(0, limit);
  if (picks.length === 0) return null;
  return (
    <section
      aria-labelledby="nearby-heading"
      data-testid="nearby-picks"
      className="flex flex-col gap-4"
    >
      <MonoHeading id="nearby-heading">Near this house</MonoHeading>
      <ul className="m-0 list-none border-t border-hairline p-0">
        {picks.map((pick) => (
          <li
            key={pick.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-[0.2rem] border-b border-hairline py-[0.85rem]"
          >
            <Link
              href={`/area#${pick.id}`}
              className="font-display text-[1.1rem] text-ink no-underline hover:underline"
            >
              <TbcText value={pick.title} />
            </Link>
            <span className="font-mono text-[0.74rem] tracking-[0.04em] text-ink tabular-nums">
              <TravelTime travel={getTravel(pick, property.slug)} />
            </span>
            <span className="col-span-2 font-mono text-[0.7rem] tracking-[0.06em] text-muted uppercase">
              {KIND_LABEL[pick.kind]}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/area"
        className="self-start border-b border-transparent py-[0.2rem] font-mono text-[0.78rem] tracking-[0.06em] text-muted uppercase no-underline transition-[color,border-color] duration-[120ms] hover:border-accent hover:text-ink"
      >
        The full area guide<span aria-hidden="true"> →</span>
      </Link>
    </section>
  );
}
