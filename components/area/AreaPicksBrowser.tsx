"use client";

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";

import type { AreaPick } from "@/content";
import type { TravelBand } from "@/lib/area-travel";
import { cx } from "@/lib/cx";

export type HouseOption = { slug: string; name: string };

export type KindOption = { kind: AreaPick["kind"]; label: string };

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
  /** Categories for the "Show" filter, in display order. */
  kindOptions: readonly KindOption[];
  /** Each pick id's category. */
  kinds: Readonly<Record<string, AreaPick["kind"]>>;
  /** The server-rendered card for each pick id. */
  cards: Readonly<Record<string, ReactNode>>;
};

/*
 * The chosen house and category live in the URL as `?house=<slug>` and
 * `?kind=<kind>`, so a property page can link straight to its sorted guide
 * and a reload keeps the choice. They are read with useSyncExternalStore
 * rather than useSearchParams so /area stays a static page: the server
 * renders every pick for "Any house", and the browser re-sorts and filters on
 * hydration when the URL names a house or a category.
 */
const HOUSE_PARAM = "house";
const KIND_PARAM = "kind";
const CHANGE_EVENT = "area-filter-change";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// The query string itself is the snapshot: a string, so it compares by value.
const readSearch = () => window.location.search;
const readSearchOnServer = () => "";

function writeParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  // Keep the #pick anchor out of the new URL: it has already done its job.
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The area guide's picks, re-sorted closest-first for the house a guest picks
 * and narrowed to the category they pick.
 */
export function AreaPicksBrowser({
  houses,
  defaultOrder,
  orders,
  bands,
  kindOptions,
  kinds,
  cards,
}: AreaPicksBrowserProps) {
  const search = useSyncExternalStore(
    subscribe,
    readSearch,
    readSearchOnServer,
  );
  const params = new URLSearchParams(search);
  const active = houses.find((h) => h.slug === params.get(HOUSE_PARAM)) ?? null;
  const activeKind =
    kindOptions.find((k) => k.kind === params.get(KIND_PARAM)) ?? null;
  const order = active ? orders[active.slug] : null;
  const shown = (id: string) => !activeKind || kinds[id] === activeKind.kind;

  /*
   * A link like /area?house=oak-hill#escuela scrolls to the pick before
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
          ids: order
            .filter((o) => o.band === band && shown(o.id))
            .map((o) => o.id),
        }))
        .filter((g) => g.ids.length > 0)
    : [{ band: null, label: null, ids: defaultOrder.filter(shown) }];

  return (
    <div className="flex flex-col gap-[clamp(1.5rem,3vw,2.25rem)]">
      <div
        data-testid="area-filter"
        className="flex flex-col gap-[clamp(0.85rem,1.6vw,1rem)] border-y border-hairline py-[clamp(1rem,2vw,1.25rem)]"
      >
        <div className="flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center min-[720px]:gap-5">
          <FilterLabel id="area-filter-label">Closest to</FilterLabel>
          <div
            role="group"
            aria-labelledby="area-filter-label"
            className="flex flex-wrap gap-2"
          >
            <FilterButton
              pressed={!active}
              onClick={() => writeParam(HOUSE_PARAM, null)}
            >
              Any home
            </FilterButton>
            {houses.map((house) => (
              <FilterButton
                key={house.slug}
                pressed={active?.slug === house.slug}
                onClick={() => writeParam(HOUSE_PARAM, house.slug)}
                data={{ "data-house": house.slug }}
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
              ? `Sorted by travel time from ${active.name}, walkable places first.`
              : "Pick a home to sort by how close each place is."}
          </p>
        </div>
        <div className="flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center min-[720px]:gap-5">
          <FilterLabel id="area-kind-label">Show</FilterLabel>
          <div
            role="group"
            aria-labelledby="area-kind-label"
            className="flex flex-wrap gap-2"
          >
            <FilterButton
              pressed={!activeKind}
              onClick={() => writeParam(KIND_PARAM, null)}
            >
              Everything
            </FilterButton>
            {kindOptions.map((option) => (
              <FilterButton
                key={option.kind}
                pressed={activeKind?.kind === option.kind}
                onClick={() => writeParam(KIND_PARAM, option.kind)}
                data={{ "data-kind": option.kind }}
              >
                {option.label}
              </FilterButton>
            ))}
          </div>
        </div>
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
              <h2 className="m-0 font-mono text-[0.74rem] font-normal tracking-[0.08em] text-ink uppercase">
                {group.label}
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

/* Same width on both rows, so the two button groups line up on desktop. */
function FilterLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span
      id={id}
      className="shrink-0 font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase min-[720px]:w-[6.5rem]"
    >
      {children}
    </span>
  );
}

function FilterButton({
  pressed,
  onClick,
  data,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  /** data-house or data-kind, for tests and styling hooks. */
  data?: Readonly<Record<`data-${string}`, string>>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...data}
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
