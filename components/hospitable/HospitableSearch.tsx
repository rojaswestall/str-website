"use client";

import { type HospitableMode, resolveHospitableMode } from "@/lib/hospitable";
import { HospitableSearchStub } from "./HospitableSearchStub";
import { warnOnce } from "./warn-once";

export type HospitableSearchProps = {
  /** `site.hospitable.searchWidgetId`; null renders the stub. */
  searchWidgetId: string | null;
  propertyCount: number;
  mode: HospitableMode;
};

/*
 * Multi-property search widget for the home hero.
 *
 * TODO(step 14): Hospitable's per-property loader refuses to run without a
 * data-property-id, so the search widget has its own snippet that has not been
 * copied from the dashboard yet (docs/plan.md, open items). Until it is, live
 * mode warns once and renders the stub. When the snippet lands, mount it the
 * way LiveBookingWidget in HospitableWidget.tsx does, with useInjectedScript.
 */
export function HospitableSearch({
  searchWidgetId,
  propertyCount,
  mode,
}: HospitableSearchProps) {
  const resolvedMode = resolveHospitableMode(mode);

  if (resolvedMode === "live") {
    warnOnce(
      "search",
      searchWidgetId === null
        ? "[Hospitable] live mode, but site.hospitable.searchWidgetId is null; rendering the search stub."
        : "[Hospitable] live mode, but the search widget snippet is not implemented yet; rendering the search stub.",
    );
  }

  return <HospitableSearchStub propertyCount={propertyCount} />;
}
