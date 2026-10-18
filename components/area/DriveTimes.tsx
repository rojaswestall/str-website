import { Tbc } from "@/components/ui";
import { type AreaPick, getAllProperties } from "@/content";
import { cx } from "@/lib/cx";

/**
 * Drive time from every house to one pick, one row per house in content
 * order. The houses sit on different sides of town, so a guest reads the row
 * for the house they are booking rather than trusting one shared distance.
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
      aria-label={`Drive time to ${pick.title.replace(/^\[TBC\]\s*/, "")} from each house`}
      data-testid="drive-times"
      className={cx(
        "m-0 border-t border-hairline font-mono text-[0.74rem] tracking-[0.04em]",
        className,
      )}
    >
      {getAllProperties().map((property) => {
        const minutes = pick.driveMinutes[property.slug] ?? null;
        return (
          <div
            key={property.slug}
            data-slug={property.slug}
            className="flex items-baseline justify-between gap-4 border-b border-hairline py-[0.45rem]"
          >
            <dt className="text-muted">{property.name}</dt>
            <dd className="m-0 text-ink tabular-nums">
              {minutes === null ? (
                <Tbc>t.b.c.</Tbc>
              ) : (
                <>
                  {minutes} min<span className="sr-only"> drive</span>
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** "12 min drive" for one house, or the t.b.c. gap. */
export function DriveTime({ minutes }: { minutes: number | null | undefined }) {
  if (minutes === null || minutes === undefined) {
    return <Tbc>drive time t.b.c.</Tbc>;
  }
  return <>{minutes} min drive</>;
}
