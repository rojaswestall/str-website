"use client";

import Script from "next/script";
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
      <hospitable-direct-mps {...attributes} />
    </div>
  );
}
