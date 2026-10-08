"use client";

import { useRef } from "react";
import { useInjectedScript } from "@/lib/hooks/useInjectedScript";
import {
  bookingWidgetAttributes,
  HOSPITABLE_LOADER_SRC,
  type HospitableMode,
  resolveHospitableMode,
} from "@/lib/hospitable";
import { HospitableStub } from "./HospitableStub";
import { warnOnce } from "./warn-once";

export type HospitableWidgetProps = {
  /** `data-property-id` for this house; null renders the stub. */
  propertyId: string | null;
  propertyName: string;
  airbnbUrl: string;
  /** `data-site-uuid`, shared across the site. */
  siteUuid: string | null;
  /** `data-theme`. */
  theme: string;
  /** Default mode from content; `NEXT_PUBLIC_HOSPITABLE_MODE` overrides it. */
  mode: HospitableMode;
};

/*
 * Per-property booking widget. In live mode it recreates the dashboard snippet
 * inside a hairline frame: the loader script goes into the container and the
 * loader inserts its iframe right after it. Everything inside the container is
 * owned by the loader; React only renders the frame around it.
 *
 * The iframe is Hospitable's and stays light in dark mode; that is accepted.
 */
export function HospitableWidget({
  propertyId,
  propertyName,
  airbnbUrl,
  siteUuid,
  theme,
  mode,
}: HospitableWidgetProps) {
  const resolvedMode = resolveHospitableMode(mode);
  const live =
    resolvedMode === "live" && propertyId !== null && siteUuid !== null;

  if (resolvedMode === "live" && !live) {
    warnOnce(
      `booking:${propertyName}`,
      `[Hospitable] live mode, but ${propertyName} has no ${
        siteUuid === null ? "site uuid" : "property id"
      } in content; rendering the stub.`,
    );
  }

  if (!live) {
    return <HospitableStub propertyName={propertyName} airbnbUrl={airbnbUrl} />;
  }

  return (
    <LiveBookingWidget
      propertyId={propertyId}
      siteUuid={siteUuid}
      theme={theme}
    />
  );
}

function LiveBookingWidget({
  propertyId,
  siteUuid,
  theme,
}: {
  propertyId: string;
  siteUuid: string;
  theme: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useInjectedScript({
    src: HOSPITABLE_LOADER_SRC,
    attributes: bookingWidgetAttributes({ siteUuid, propertyId, theme }),
    target: container,
    key: propertyId,
  });

  return (
    <div
      data-testid="hospitable-widget"
      data-property-id={propertyId}
      className="group relative border border-hairline bg-paper-2"
    >
      <p
        aria-live="polite"
        className="px-[clamp(1.25rem,3vw,1.75rem)] py-[1.1rem] font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase group-has-[iframe]:hidden"
      >
        Loading the booking calendar…
      </p>
      {/* Owned by the loader: it appends the script here, then its iframe. */}
      <div ref={container} data-hospitable-container />
    </div>
  );
}
