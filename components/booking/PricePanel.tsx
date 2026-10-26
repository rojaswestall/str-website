"use client";

import { type RefObject } from "react";

import { Button } from "@/components/ui";
import {
  formatDollars,
  formatLongDate,
  formatRange,
  plural,
} from "@/lib/booking/format";
import type { Guests, Selection } from "@/lib/booking/rules";

export type PricePanelProps = {
  selection: Selection;
  guests: Guests;
  /** Whole-dollar preview from the calendar; null until the stay is complete. */
  previewTotal: number | null;
  nights: number;
  currency: string;
  headingRef: RefObject<HTMLParagraphElement | null>;
  onClear: () => void;
};

/*
 * The price column. Until a stay is chosen it says so; with one it shows the
 * calendar preview, clearly marked as an estimate. Phase 3 replaces the
 * estimate with the quote. `aria-live` announces the change; the heading is
 * focusable so keyboard users land here after choosing a check-out.
 */
export function PricePanel({
  selection,
  guests,
  previewTotal,
  nights,
  currency,
  headingRef,
  onClear,
}: PricePanelProps) {
  const { checkIn, checkOut } = selection;
  const complete = checkIn !== null && checkOut !== null;
  const guestLine = [
    plural(guests.adults + guests.children, "guest"),
    guests.infants ? plural(guests.infants, "infant") : null,
    guests.pets ? plural(guests.pets, "pet") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-3 border-t border-hairline pt-4"
    >
      <p
        ref={headingRef}
        tabIndex={-1}
        className="font-mono text-[0.74rem] tracking-[0.08em] text-ink uppercase outline-offset-4"
      >
        {complete ? (
          <>
            {plural(nights, "night")} · {formatRange(checkIn, checkOut)}
          </>
        ) : checkIn ? (
          <>Check-in {formatLongDate(checkIn)} · choose a check-out</>
        ) : (
          "Select dates to see price"
        )}
      </p>

      {complete ? (
        <dl className="flex flex-col gap-[0.45rem] text-[0.92rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">
              {plural(nights, "night")}, {guestLine}
            </dt>
            <dd className="text-ink tabular-nums">
              {previewTotal === null
                ? "—"
                : formatDollars(previewTotal, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Cleaning fee, taxes</dt>
            <dd className="text-muted">at the next step</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-hairline pt-[0.45rem]">
            <dt className="font-mono text-[0.74rem] tracking-[0.08em] text-muted uppercase">
              Estimated nightly total
            </dt>
            <dd className="font-medium text-ink tabular-nums">
              {previewTotal === null
                ? "—"
                : formatDollars(previewTotal, currency)}
            </dd>
          </div>
        </dl>
      ) : null}

      <p className="max-w-[40ch] font-mono text-[0.66rem] leading-[1.5] tracking-[0.04em] text-muted">
        {complete
          ? "Nightly rates shown are estimates. The exact total, with cleaning fee and taxes, comes from Hospitable before you pay."
          : "Prices under each date are the nightly rate for booking direct, before cleaning fee and taxes."}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!complete} aria-disabled={!complete}>
          Reserve
        </Button>
        {checkIn ? (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer font-mono text-[0.72rem] tracking-[0.06em] text-muted underline underline-offset-4 hover:text-ink"
          >
            Clear dates
          </button>
        ) : null}
      </div>
    </div>
  );
}
