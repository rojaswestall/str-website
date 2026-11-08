import type { AreaPick } from "../content/types";

/*
 * Travel time from a house to an area-guide pick, the "Near this house"
 * ordering, and the cross-file checks on area picks. Pure functions over the
 * pick data so they can be unit-tested without the content modules.
 */

/** The fields of a pick these functions read. */
export type TravelPick = Pick<AreaPick, "id" | "driveMinutes" | "walkMinutes">;

/** The fields `assertAreaPicksValid` reads: travel plus the photo credit. */
export type CheckedPick = TravelPick &
  Partial<Pick<AreaPick, "photo" | "photoCredit" | "photoOwned">>;

/** How a guest gets from one house to a pick: a short walk, or a drive. */
export type Travel =
  { mode: "walk"; minutes: number } | { mode: "drive"; minutes: number | null };

/** Walk time from this house when the pick lists one, otherwise drive time. */
export function getTravel(pick: TravelPick, slug: string): Travel {
  const walk = pick.walkMinutes?.[slug];
  if (walk !== undefined) return { mode: "walk", minutes: walk };
  return { mode: "drive", minutes: pick.driveMinutes[slug] ?? null };
}

/**
 * Picks ordered by how close they are to one house: walkable picks first
 * (shortest walk first), then by drive time. Picks without a confirmed time
 * for that house keep their content order, after the timed ones.
 */
export function sortPicksNear<T extends TravelPick>(
  picks: readonly T[],
  slug: string,
): T[] {
  const rank = (travel: Travel): [number, number] =>
    travel.minutes === null
      ? [2, 0]
      : [travel.mode === "walk" ? 0 : 1, travel.minutes];
  return picks
    .map((pick, index) => ({ pick, index, rank: rank(getTravel(pick, slug)) }))
    .sort(
      (a, b) =>
        a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.index - b.index,
    )
    .map(({ pick }) => pick);
}

/**
 * Checks the per-file schema cannot make: unique pick ids, a drive time (or
 * an explicit null) from every house, walk times only for real houses, and a
 * credit for every photo the hosts do not own. Throws on the first problem.
 */
export function assertAreaPicksValid(
  picks: readonly CheckedPick[],
  houseSlugs: readonly string[],
): void {
  const slugs = [...houseSlugs].sort();
  const ids = new Set<string>();
  for (const pick of picks) {
    if (ids.has(pick.id)) {
      throw new Error(`content/area.ts: duplicate pick id "${pick.id}"`);
    }
    ids.add(pick.id);
    const keys = Object.keys(pick.driveMinutes).sort();
    if (keys.join() !== slugs.join()) {
      throw new Error(
        `content/area.ts: pick "${pick.id}" needs driveMinutes for exactly ${slugs.join(", ")} (has ${keys.join(", ") || "none"})`,
      );
    }
    for (const slug of Object.keys(pick.walkMinutes ?? {})) {
      if (!slugs.includes(slug)) {
        throw new Error(
          `content/area.ts: pick "${pick.id}" has walkMinutes for unknown house "${slug}"`,
        );
      }
    }
    if (pick.photo && !pick.photoCredit && !pick.photoOwned) {
      throw new Error(
        `content/area.ts: pick "${pick.id}" has a photo but no photoCredit (set photoOwned: true if the hosts took it)`,
      );
    }
  }
}

/** How close a pick is to one house, for the headings on a sorted /area. */
export type TravelBand = "walk" | "near" | "mid" | "far" | "unknown";

/** Bands in display order, closest first, with their headings. */
export const TRAVEL_BANDS: readonly { band: TravelBand; label: string }[] = [
  { band: "walk", label: "A short walk" },
  { band: "near", label: "Under 10 minutes" },
  { band: "mid", label: "10 to 20 minutes" },
  { band: "far", label: "Over 20 minutes" },
  { band: "unknown", label: "Drive time to confirm" },
];

/** Walkable, under 10 min, 10–20 min, or over 20 min by car. */
export function travelBand(travel: Travel): TravelBand {
  if (travel.minutes === null) return "unknown";
  if (travel.mode === "walk") return "walk";
  if (travel.minutes < 10) return "near";
  if (travel.minutes <= 20) return "mid";
  return "far";
}
