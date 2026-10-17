"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import {
  HOSPITABLE_SEARCH_SCRIPT_SRC,
  type HospitableMode,
  resolveHospitableMode,
  SEARCH_RESULTS_PATH,
  searchWidgetAttributes,
} from "@/lib/hospitable";
import { HospitableSearchStub } from "./HospitableSearchStub";
import { warnOnce } from "./warn-once";

// Hospitable's custom element, so it can be rendered as JSX. Module
// augmentation is the only way to extend JSX.IntrinsicElements.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "hospitable-direct-mps": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        identifier: string;
        type: "custom";
        "results-url"?: string;
      };
    }
  }
}

export type HospitableSearchVariant =
  /** The home hero: only the search bar, which navigates to /search on submit. */
  | "bar"
  /** The /search page: the bar plus the list of available houses. */
  | "results";

export type HospitableSearchProps = {
  /** `site.hospitable.searchWidgetId`; null renders the stub. */
  searchWidgetId: string | null;
  propertyCount: number;
  mode: HospitableMode;
  variant: HospitableSearchVariant;
};

/*
 * Adjustments appended into the widget's open shadow root once it exists.
 * Checked against the live widget in step 14; each rule is additive and simply
 * stops matching if Hospitable renames a class, so a widget update can only
 * bring the original behaviour back, never break the page.
 *
 * - .search-bar-container: the widget stretches its search band to the
 *   viewport (width 100vw, margin-left -50vw) so it reaches the window edges
 *   on a host page. Inside the hairline frame that bleeds past the frame.
 * - .results-container: with map view disabled the widget still sets the
 *   results list to a viewport-derived height in JS, so on a phone the cards
 *   overflow the frame and over the footer, and on a desktop a tall blank
 *   area follows them. Letting it size to its content fixes both.
 * - The main font defaults to Montserrat from Google Fonts; the site's body
 *   font is used instead, read from the host page as custom properties
 *   inherit into shadow trees. Colours are left to the dashboard theme so
 *   the search bar and the booking calendar (an iframe, dashboard-only
 *   styling) stay the same.
 */
const SHADOW_ADJUSTMENTS = `
:host { --hospitable-main-font: var(--font-plex-sans), system-ui, sans-serif; }
.search-bar-container { width: auto !important; margin-left: 0 !important; left: auto !important; padding: 0 !important; margin-bottom: 20px !important; }
.results-container { height: auto !important; }
.left { overflow-y: visible !important; }
`;

const ADJUSTMENTS_ATTRIBUTE = "data-austin-collection";

/** True once the style sheet is in the shadow root; false while there is no root yet. */
function appendAdjustments(host: HTMLElement): boolean {
  const root = host.shadowRoot;
  if (!root) return false;
  if (!root.querySelector(`style[${ADJUSTMENTS_ATTRIBUTE}]`)) {
    const style = document.createElement("style");
    style.setAttribute(ADJUSTMENTS_ATTRIBUTE, "");
    style.textContent = SHADOW_ADJUSTMENTS;
    root.appendChild(style);
  }
  return true;
}

/*
 * The shadow root appears when the element upgrades, after the library has
 * loaded, and the Angular element inside may attach it a frame later; so
 * after `whenDefined` the host is re-checked each frame for a bounded time.
 */
function useShadowAdjustments(host: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = host.current;
    if (!element || appendAdjustments(element)) return;

    let cancelled = false;
    let frame = 0;
    const deadline = performance.now() + 15_000;
    const poll = () => {
      if (cancelled) return;
      if (appendAdjustments(element) || performance.now() > deadline) return;
      frame = requestAnimationFrame(poll);
    };
    void customElements.whenDefined("hospitable-direct-mps").then(poll);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [host]);
}

/*
 * Property search widget. In live mode it renders Hospitable's
 * <hospitable-direct-mps> element inside the hairline frame and loads the
 * library that defines it. Unlike the booking loader (HospitableWidget.tsx),
 * that script registers a custom element once and must not run twice, so
 * next/script's dedupe by src is exactly right here: the element upgrades
 * whenever the script lands, on first paint or after client-side navigation.
 */
export function HospitableSearch({
  searchWidgetId,
  propertyCount,
  mode,
  variant,
}: HospitableSearchProps) {
  const resolvedMode = resolveHospitableMode(mode);

  if (resolvedMode === "live" && searchWidgetId === null) {
    warnOnce(
      "search",
      "[Hospitable] live mode, but site.hospitable.searchWidgetId is null; rendering the search stub.",
    );
  }

  if (resolvedMode !== "live" || searchWidgetId === null) {
    return (
      <HospitableSearchStub propertyCount={propertyCount} variant={variant} />
    );
  }

  return <LiveSearchWidget searchWidgetId={searchWidgetId} variant={variant} />;
}

function LiveSearchWidget({
  searchWidgetId,
  variant,
}: {
  searchWidgetId: string;
  variant: HospitableSearchVariant;
}) {
  const host = useRef<HTMLElement>(null);
  useShadowAdjustments(host);

  const attributes = searchWidgetAttributes({
    identifier: searchWidgetId,
    resultsUrl: variant === "bar" ? SEARCH_RESULTS_PATH : undefined,
  });

  return (
    <div
      data-testid="hospitable-search"
      data-variant={variant}
      className="border border-hairline bg-paper-2 p-[clamp(1rem,2.5vw,1.5rem)]"
    >
      <Script src={HOSPITABLE_SEARCH_SCRIPT_SRC} strategy="afterInteractive" />
      {/* Custom elements default to inline; block keeps the frame around the results. */}
      <hospitable-direct-mps ref={host} {...attributes} className="block" />
    </div>
  );
}
