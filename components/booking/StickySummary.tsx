"use client";

import { type RefObject, useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";

export type StickySummaryProps = {
  /** A stay is selected; otherwise the bar stays hidden. */
  active: boolean;
  /** "3 nights · Oct 25 – Oct 28" */
  label: string;
  /** "$512 est." or "$467.59"; empty while nothing can be shown. */
  amount: string;
  reserveLabel?: string;
  reserveDisabled: boolean;
  onReserve?: () => void;
  /** The real price panel; the bar hides itself while that is on screen. */
  panelRef: RefObject<HTMLElement | null>;
};

/*
 * A bar pinned to the bottom of the viewport while the widget is scrolled
 * through, so the running total and Reserve stay in reach on a phone where
 * the calendar and guest rows push the price panel below the fold. It is
 * a mirror of the panel for pointer users only: hidden from assistive
 * tech, with its button out of the tab order, so nothing is announced or
 * focused twice.
 */
export function StickySummary({
  active,
  label,
  amount,
  reserveLabel = "Reserve",
  reserveDisabled,
  onReserve,
  panelRef,
}: StickySummaryProps) {
  const [panelInView, setPanelInView] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPanelInView(entry?.isIntersecting ?? false),
      { threshold: 0.4 },
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelRef]);

  const shown = active && !panelInView;

  return (
    <div
      aria-hidden="true"
      data-testid="booking-sticky-summary"
      data-shown={shown || undefined}
      className={cx(
        "sticky bottom-0 z-10 -mx-[clamp(1rem,3vw,1.75rem)] -mb-[clamp(1rem,3vw,1.75rem)] border-t border-hairline bg-paper-2 px-[clamp(1rem,3vw,1.75rem)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-[120ms]",
        shown ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.66rem] tracking-[0.06em] text-muted uppercase">
            {label}
          </p>
          <p className="text-[1.05rem] font-medium text-ink tabular-nums">
            {amount || "—"}
          </p>
        </div>
        <Button
          tabIndex={-1}
          disabled={reserveDisabled}
          aria-disabled={reserveDisabled}
          onClick={onReserve}
          className={cx("shrink-0", reserveDisabled && "opacity-60")}
        >
          {reserveLabel}
        </Button>
      </div>
    </div>
  );
}
