"use client";

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";

import type { TravelBand } from "@/lib/area-travel";
import { cx } from "@/lib/cx";

export type HouseOption = { slug: string; name: string };

/** One house's sorted picks: id and its closeness band, closest first. */
export type HouseOrder = readonly { id: string; band: TravelBand }[];

export type AreaPicksBrowserProps = {
  houses: readonly HouseOption[];
  /** Pick ids in content order, for "Any house". */
  defaultOrder: readonly string[];
  /** Per house slug, the picks sorted by travel time from that house. */
  orders: Readonly<Record<string, HouseOrder>>;
  /** Band headings, closest first (TRAVEL_BANDS). */
  bands: readonly { band: TravelBand; label: string }[];
  /** The server-rendered card for each pick id. */
  cards: Readonly<Record<string, ReactNode>>;
};

/*
 * The chosen house lives in the URL as `?house=<slug>`, so a property page can
 * link straight to its sorted guide and a reload keeps the choice. It is read
 * with useSyncExternalStore rather than useSearchParams so /area stays a
 * static page: the server renders "Any house", and the browser re-sorts on
 * hydration when the URL names a house.
 */
const PARAM = "house";
const CHANGE_EVENT = "area-house-change";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const readHouse = () =>
  new URLSearchParams(window.location.search).get(PARAM) ?? "";
const readHouseOnServer = () => "";

function writeHouse(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(PARAM, slug);
  else url.searchParams.delete(PARAM);
  // Keep the #pick anchor out of the new URL: it has already done its job.
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The area guide's picks, re-sorted closest-first for the house a guest picks. */
export function AreaPicksBrowser({
  houses,
  defaultOrder,
  orders,
  bands,
  cards,
}: AreaPicksBrowserProps) {
  const fromUrl = useSyncExternalStore(subscribe, readHouse, readHouseOnServer);
  const active = houses.find((h) => h.slug === fromUrl) ?? null;
  const order = active ? orders[active.slug] : null;

  /*
   * A link like /area?house=oak-hill#escuela-farms scrolls to the pick before
   * hydration, in the unsorted order; scroll again once the sorted order is
   * in place. Only for the first sort.
   */
  const rescrolled = useRef(false);
  useEffect(() => {
    if (rescrolled.current || !active) return;
    rescrolled.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [active]);

  const groups = order
    ? bands
        .map(({ band, label }) => ({
          band,
          label,
          ids: order.filter((o) => o.band === band).map((o) => o.id),
        }))
        .filter((g) => g.ids.length > 0)
    : [{ band: null, label: null, ids: defaultOrder }];

  return (
    <div className="flex flex-col gap-[clamp(1.5rem,3vw,2.25rem)]">
      <div
        data-testid="area-filter"
        className="flex flex-col gap-3 border-y border-hairline py-[clamp(1rem,2vw,1.25rem)] min-[720px]:flex-row min-[720px]:items-center min-[720px]:gap-5"
      >
        <span
          id="area-filter-label"
          className="shrink-0 font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase"
        >
          Closest to
        </span>
        <div
          role="group"
          aria-labelledby="area-filter-label"
          className="flex flex-wrap gap-2"
        >
          <FilterButton pressed={!active} onClick={() => writeHouse(null)}>
            Any house
          </FilterButton>
          {houses.map((house) => (
            <FilterButton
              key={house.slug}
              pressed={active?.slug === house.slug}
              onClick={() => writeHouse(house.slug)}
              slug={house.slug}
            >
              {house.name}
            </FilterButton>
          ))}
        </div>
        <p
          aria-live="polite"
          data-testid="area-filter-status"
          className="m-0 font-mono text-[0.72rem] leading-[1.5] tracking-[0.04em] text-muted min-[720px]:ml-auto min-[720px]:max-w-[38ch] min-[720px]:text-right"
        >
          {active
            ? `Closest first from ${active.name}, walks before drives.`
            : "Pick a house to sort by how close each place is."}
        </p>
      </div>

      <div
        data-testid="area-picks"
        data-active-house={active?.slug ?? ""}
        className="flex flex-col gap-[clamp(2rem,4vw,3rem)]"
      >
        {groups.map((group) => (
          <section
            key={group.band ?? "all"}
            data-band={group.band ?? undefined}
            aria-label={group.label ?? undefined}
            className="flex flex-col gap-[clamp(1rem,2vw,1.25rem)]"
          >
            {group.label ? (
              <h2 className="m-0 flex items-baseline gap-3 font-mono text-[0.74rem] font-normal tracking-[0.08em] text-ink uppercase">
                {group.label}
                <span className="text-muted tabular-nums">
                  {group.ids.length}
                </span>
              </h2>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]">
              {group.ids.map((id) => (
                <div key={id} className="min-w-0">
                  {cards[id]}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  pressed,
  onClick,
  slug,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  slug?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-house={slug ?? ""}
      onClick={onClick}
      className={cx(
        "cursor-pointer border px-3 py-[0.45rem] font-mono text-[0.72rem] tracking-[0.06em] uppercase transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        pressed
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-ink hover:border-muted",
      )}
    >
      {children}
    </button>
  );
}
