"use client";

import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";

export type StickySummaryProps = {
  /** "3 nights · Oct 25 – Oct 28", or a prompt while nothing is selected. */
  label: string;
  /** "$512 est." or "$467.59"; empty while nothing can be shown. */
  amount: string;
  /** The amount is about to change (a quote is in flight): pulse it. */
  amountPending?: boolean;
  reserveLabel?: string;
  reserveDisabled: boolean;
  /** Why Reserve is disabled, for the tooltip. */
  reserveHint?: string;
  onReserve?: () => void;
};

/*
 * The widget's footer: the running total and the one Reserve button, pinned
 * to the bottom edge of whatever scrolls — the page on a phone, the card
 * itself on desktop where the booking column is sticky and the card scrolls
 * inside its own max-height. It is always rendered, so a guest never has to
 * hunt for the button; the price panel above carries the breakdown and the
 * form, not a second button.
 */
export function StickySummary({
  label,
  amount,
  amountPending = false,
  reserveLabel = "Reserve",
  reserveDisabled,
  reserveHint,
  onReserve,
}: StickySummaryProps) {
  return (
    <div
      data-testid="booking-footer"
      className="sticky bottom-0 z-10 border-t border-hairline bg-paper-2 px-[clamp(1rem,3vw,1.75rem)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.66rem] tracking-[0.06em] text-muted uppercase">
            {label}
          </p>
          <p
            aria-live="polite"
            className={cx(
              "text-[1.05rem] font-medium text-ink tabular-nums",
              amountPending && "animate-pulse text-muted",
            )}
          >
            {amount || "—"}
          </p>
        </div>
        <Button
          disabled={reserveDisabled}
          aria-disabled={reserveDisabled}
          title={reserveDisabled ? reserveHint : undefined}
          onClick={onReserve}
          className={cx("shrink-0", reserveDisabled && "opacity-60")}
        >
          {reserveLabel}
        </Button>
      </div>
    </div>
  );
}
