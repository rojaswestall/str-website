/*
 * The custom MapKit callout: the card that opens when a guest taps a house's
 * marker. MapKit's `calloutElementForAnnotation` replaces Apple's bubble with
 * whatever element it returns, so this builds plain DOM (MapKit owns it, not
 * React) styled with the same token utilities as the rest of the site, so it
 * recolours with the theme.
 */

/** What the map needs to know about a house; serialisable server → client. */
export type MapHouse = {
  slug: string;
  name: string;
  neighborhood: string;
  sleeps: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Sleeps 8 · 3 bed · 5 beds · 2.5 bath", the site's mono spec line. */
export function specLine(house: MapHouse) {
  return [
    `Sleeps ${house.sleeps}`,
    `${house.bedrooms} bed`,
    plural(house.beds, "bed", "beds"),
    `${house.bathrooms} bath`,
  ].join(" · ");
}

export function buildCallout(
  house: MapHouse,
  options: {
    /** True on that house's own page: no link back to where the guest is. */
    current: boolean;
    /** Client-side navigation for the "See the house" link. */
    navigate: (href: string) => void;
  },
): HTMLElement {
  const card = el(
    "div",
    "map-callout relative flex w-[260px] flex-col gap-[0.35rem] border border-hairline bg-paper px-4 pt-[0.9rem] pb-4 text-left font-sans text-ink shadow-[0_10px_30px_-14px_var(--scrim)]",
  );
  card.dataset.testid = "map-callout";
  card.dataset.slug = house.slug;

  card.append(
    el(
      "p",
      "font-mono text-[0.66rem] tracking-[0.12em] text-muted uppercase",
      house.neighborhood,
    ),
    el("p", "font-display text-[1.3rem] leading-[1.15] text-ink", house.name),
    el("p", "font-mono text-[0.7rem] text-ink-soft", specLine(house)),
    el(
      "p",
      "font-mono text-[0.7rem] text-muted",
      `${house.rating.toFixed(house.rating % 1 === 0 ? 1 : 2)} ★ · ${plural(
        house.reviewCount,
        "review",
        "reviews",
      )}`,
    ),
  );

  if (options.current) {
    card.append(
      el(
        "p",
        "mt-[0.35rem] font-mono text-[0.7rem] text-muted",
        "You're looking at this one",
      ),
    );
  } else {
    const href = `/stays/${house.slug}`;
    const link = el(
      "a",
      "mt-[0.35rem] self-start border-b border-ink font-mono text-[0.72rem] tracking-[0.06em] text-ink uppercase hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      "See the house →",
    );
    link.href = href;
    link.addEventListener("click", (event) => {
      // Let modified clicks open a new tab as usual.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button)
        return;
      event.preventDefault();
      options.navigate(href);
    });
    card.append(link);
  }

  // The tail, pointing down at the marker.
  const tail = el(
    "span",
    "absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b border-hairline bg-paper",
  );
  tail.setAttribute("aria-hidden", "true");
  card.append(tail);

  return card;
}
