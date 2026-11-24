import { Tbc } from "@/components/ui";
import {
  type AreaPick,
  getAllProperties,
  getTravel,
  type Travel,
} from "@/content";
import { cx } from "@/lib/cx";

/**
 * Travel time from every house to one pick, one row per house in content
 * order: the walk time where the pick lists one for that house, otherwise the
 * drive time. The houses sit on different sides of town, so a guest reads the
 * row for the house they are booking rather than trusting one shared distance.
 */
export function DriveTimes({
  pick,
  className,
}: {
  pick: AreaPick;
  className?: string;
}) {
  return (
    <dl
      aria-label={`Travel time to ${pick.title.replace(/^\[TBC\]\s*/, "")}`}
      data-testid="drive-times"
      className={cx(
        "m-0 border-t border-hairline font-mono text-[0.74rem] tracking-[0.04em]",
        className,
      )}
    >
      {getAllProperties().map((property) => {
        const travel = getTravel(pick, property.slug);
        return (
          <div
            key={property.slug}
            data-slug={property.slug}
            data-mode={travel.mode}
            className="flex items-baseline justify-between gap-4 border-b border-hairline py-[0.45rem]"
          >
            <dt className="text-muted">{property.name}</dt>
            <dd className="m-0 text-ink tabular-nums">
              {travel.minutes === null ? (
                <Tbc>t.b.c.</Tbc>
              ) : travel.mode === "walk" ? (
                <>{travel.minutes} min walk</>
              ) : (
                <>
                  {travel.minutes} min<span className="sr-only"> drive</span>
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** "12 min drive" or "6 min walk" for one house, or the t.b.c. gap. */
export function TravelTime({ travel }: { travel: Travel }) {
  if (travel.minutes === null) {
    return <Tbc>drive time t.b.c.</Tbc>;
  }
  return (
    <>
      {travel.minutes} min {travel.mode}
    </>
  );
}
