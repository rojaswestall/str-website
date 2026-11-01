import { useId } from "react";
import { cx } from "@/lib/cx";
import { getAllProperties, type Property } from "@/content";

type CityMapProps = {
  /**
   * Slug of the house this map sits beside (property pages). That pin keeps
   * the ink dot and halo; the other houses drop to muted dots so the page
   * still shows where the rest of the collection is.
   */
  highlightSlug?: string;
  className?: string;
};

/** "one house", "two houses", … for the legend. */
function countLabel(count: number) {
  const words = ["no", "one", "two", "three", "four", "five", "six"];
  const word = words[count] ?? String(count);
  return `${word} ${count === 1 ? "house" : "houses"}`;
}

/** Legend lines grouped by neighbourhood, in property order. */
function houseLegend(properties: readonly Property[]) {
  const groups = new Map<string, number>();
  for (const property of properties) {
    groups.set(
      property.neighborhood,
      (groups.get(property.neighborhood) ?? 0) + 1,
    );
  }
  return [...groups].map(([neighborhood, count]) => ({
    label: `${neighborhood} · ${countLabel(count)}`,
  }));
}

/*
 * The artifact's circular Austin map. Geometry is copied verbatim from
 * design/artifact.html; every fill and stroke is a token utility so the map
 * recolours with the theme. Pins are drawn from each property's `mapPin`
 * rather than the artifact's single shared South Austin dot.
 */
export function CityMap({ highlightSlug, className }: CityMapProps) {
  const id = useId();
  const clipId = `${id}-clip`;
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const properties = getAllProperties();
  const highlighted = highlightSlug
    ? properties.find((property) => property.slug === highlightSlug)
    : undefined;

  const legend = highlighted
    ? [
        {
          kind: "house" as const,
          label: `${highlighted.shortName} · this house`,
        },
        ...(properties.length > 1
          ? [{ kind: "other" as const, label: "The other houses" }]
          : []),
      ]
    : houseLegend(properties).map((entry) => ({
        kind: "house" as const,
        ...entry,
      }));

  return (
    <figure
      data-testid="city-map"
      className={cx(
        "m-0 flex flex-wrap items-center gap-[clamp(0.9rem,2vw,1.4rem)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="block size-[200px] max-w-full flex-none"
      >
        <title id={titleId}>Where the houses are in Austin</title>
        <desc id={descId}>
          A circular map of Austin. The Colorado River runs east across the top
          through downtown. Interstate 35 and MoPac run north to south, Ben
          White Boulevard east to west. Two houses are marked in South Austin,
          below Ben White, and one in Oak Hill to the south-west where Highways
          290 and 71 split. Green marks Zilker Park and the Barton Creek
          greenbelt.
        </desc>

        <defs>
          <clipPath id={clipId}>
            <circle cx="200" cy="200" r="196" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect
            data-map-ground
            className="fill-map-ground"
            x="0"
            y="0"
            width="400"
            height="400"
          />

          {/* Barton Creek greenbelt, winding south-west out of Zilker */}
          <path
            className="fill-none stroke-map-park"
            strokeOpacity={0.42}
            strokeWidth={12}
            strokeLinecap="round"
            d="M 248 150 C 222 186, 196 206, 168 244 C 146 274, 120 288, 92 298"
          />
          <path
            className="fill-none stroke-map-water"
            strokeOpacity={0.55}
            strokeWidth={3}
            strokeLinecap="round"
            d="M 248 150 C 222 186, 196 206, 168 244 C 146 274, 120 288, 92 298"
          />
          {/* Zilker Park, and the wilderness park out toward Oak Hill */}
          <ellipse
            className="fill-map-park"
            fillOpacity={0.55}
            cx="251"
            cy="134"
            rx="25"
            ry="16"
          />
          <ellipse
            className="fill-map-park"
            fillOpacity={0.55}
            cx="112"
            cy="246"
            rx="23"
            ry="14"
          />

          {/* MoPac and I-35, north to south */}
          <path
            className="fill-none stroke-map-road"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 208 0 L 217 200 L 228 400"
          />
          <path
            className="fill-none stroke-map-road-major"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 306 0 L 316 200 L 330 400"
          />
          {/* Ben White Blvd, east to west */}
          <path
            className="fill-none stroke-map-road-major"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 150 240 L 400 226"
          />
          {/* the Y at Oak Hill, where 290 and 71 split */}
          <path
            className="fill-none stroke-map-road"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 85 299 L 150 240"
          />
          <path
            className="fill-none stroke-map-road"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 85 299 L 0 334"
          />
          <path
            className="fill-none stroke-map-road"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 85 299 L 2 286"
          />
          {/* Manchaca Rd, south off Ben White */}
          <path
            className="fill-none stroke-map-road"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 272 234 L 264 292 L 252 400"
          />

          {/* the Colorado River, widening into Lady Bird Lake at downtown */}
          <path
            className="fill-none stroke-map-water"
            strokeWidth={12}
            strokeLinecap="round"
            d="M 104 22 C 182 66, 254 93, 316 104 C 358 111, 384 128, 400 152"
          />
          <path
            className="fill-none stroke-map-water"
            strokeWidth={19}
            strokeLinecap="round"
            d="M 268 97 C 296 101, 330 108, 356 118"
          />
        </g>

        <circle
          className="fill-none stroke-ink"
          strokeWidth={3}
          cx="200"
          cy="200"
          r="196"
        />

        {/* downtown */}
        <circle
          className="fill-paper stroke-ink"
          strokeWidth={3}
          cx="316"
          cy="101"
          r="6"
        />

        {properties.map((property) => {
          const dimmed = highlighted !== undefined && property !== highlighted;
          return (
            <g
              key={property.slug}
              data-map-pin={property.slug}
              data-highlighted={property === highlighted ? "" : undefined}
            >
              <title>{property.name}</title>
              {dimmed ? null : (
                <circle
                  className="fill-ink"
                  fillOpacity={0.13}
                  cx={property.mapPin.x}
                  cy={property.mapPin.y}
                  r="22"
                />
              )}
              <circle
                className={dimmed ? "fill-muted" : "fill-ink"}
                cx={property.mapPin.x}
                cy={property.mapPin.y}
                r={dimmed ? 6 : 8}
              />
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-col gap-[0.3rem] font-mono text-[0.72rem] text-ink-soft">
        <p className="mb-[0.25rem] text-[0.68rem] tracking-[0.12em] text-muted uppercase">
          Where we are
        </p>
        <ul className="flex flex-col gap-[0.34rem]">
          {legend.map((entry) => (
            <li
              key={entry.label}
              className="flex items-center gap-2 sm:whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "size-[0.55rem] flex-none rounded-full",
                  entry.kind === "house" ? "bg-ink" : "bg-muted",
                )}
              />
              {entry.label}
            </li>
          ))}
          <li className="flex items-center gap-2 sm:whitespace-nowrap">
            <span
              aria-hidden="true"
              className="size-[0.55rem] flex-none rounded-full border-[1.5px] border-ink bg-paper"
            />
            Downtown
          </li>
          <li className="flex items-center gap-2 sm:whitespace-nowrap">
            <span
              aria-hidden="true"
              className="h-[0.25rem] w-[0.7rem] flex-none rounded-[1px] bg-map-water"
            />
            Lady Bird Lake
          </li>
          <li className="flex items-center gap-2 sm:whitespace-nowrap">
            <span
              aria-hidden="true"
              className="size-[0.55rem] flex-none rounded-full bg-map-park"
            />
            Zilker &amp; the greenbelt
          </li>
        </ul>
        <p className="mt-[0.4rem] text-[0.68rem] text-muted">
          Approximate areas · not to scale
        </p>
      </figcaption>
    </figure>
  );
}
