"use client";

import { type ReactNode, type RefObject } from "react";

import {
  formatCents,
  formatDollars,
  formatLongDate,
  formatRange,
  plural,
} from "@/lib/booking/format";
import type { QuoteState } from "@/lib/booking/quote-state";
import type { Guests, Selection } from "@/lib/booking/rules";
import type { Quote } from "@/lib/booking/types";
import { cx } from "@/lib/cx";

export type ReserveState =
  | { status: "idle" }
  | { status: "loading" }
  /** The final quote came back with a different total; one more click to go. */
  | { status: "confirm"; previousTotal: number }
  | { status: "error"; message: string }
  | { status: "redirecting" };

export type PricePanelProps = {
  selection: Selection;
  guests: Guests;
  nights: number;
  currency: string;
  /** Whole-dollar calendar estimate, shown only before any quote exists. */
  previewTotal: number | null;
  quote: QuoteState;
  reserve: ReserveState;
  /** The guest details form, rendered once a quote is on screen. */
  form: ReactNode;
  headingRef: RefObject<HTMLParagraphElement | null>;
  onRetryQuote: () => void;
  onClear: () => void;
};

/*
 * The price column. "Select dates to see price" until a stay is chosen; a
 * loading quote shows the row structure with no amounts, so a guest never
 * sees two different totals; a ready quote shows Hospitable's breakdown and
 * total, which is what they pay. `aria-live` announces changes; the heading
 * is focusable so keyboard users land here after choosing a check-out.
 */
export function PricePanel({
  selection,
  guests,
  nights,
  currency,
  previewTotal,
  quote,
  reserve,
  form,
  headingRef,
  onRetryQuote,
  onClear,
}: PricePanelProps) {
  const { checkIn, checkOut } = selection;
  const complete = checkIn !== null && checkOut !== null;
  const ready = quote.status === "ready" ? quote.quote : null;
  const busy =
    quote.status === "loading" ||
    reserve.status === "loading" ||
    reserve.status === "redirecting";

  return (
    <div
      aria-live="polite"
      aria-busy={busy || undefined}
      className="flex flex-col gap-3 border-t border-hairline pt-4"
    >
      <p
        ref={headingRef}
        tabIndex={-1}
        className="font-mono text-[0.74rem] tracking-[0.08em] text-ink uppercase outline-offset-4"
      >
        {complete ? (
          <>
            {plural(nights, "night")} · {formatRange(checkIn, checkOut)} ·{" "}
            {guestLine(guests)}
          </>
        ) : checkIn ? (
          <>Check-in {formatLongDate(checkIn)} · choose a check-out</>
        ) : (
          "Select dates to see price"
        )}
      </p>

      {!complete ? (
        <Note>
          Prices under each date are the nightly rate for booking direct, before
          cleaning fee and taxes.
        </Note>
      ) : quote.status === "error" ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-[0.92rem] text-ink-soft">{quote.error.message}</p>
          {quote.error.code !== "UNAVAILABLE" &&
          quote.error.code !== "MIN_STAY" &&
          quote.error.code !== "MAX_NIGHTS" &&
          quote.error.code !== "MAX_GUESTS" ? (
            <TextButton onClick={onRetryQuote}>Try again</TextButton>
          ) : null}
        </div>
      ) : ready ? (
        <Breakdown quote={ready} nights={nights} currency={currency} />
      ) : (
        <LoadingBreakdown previewTotal={previewTotal} currency={currency} />
      )}

      {ready ? (
        <Note>
          Total is from Hospitable and is what you pay at checkout. Taxes may be
          recalculated if you change dates there.
        </Note>
      ) : null}

      {ready ? form : null}

      {reserve.status === "confirm" ? (
        <p
          role="status"
          className="border border-ink px-3 py-2 text-[0.9rem] text-ink"
        >
          The total changed from {formatCents(reserve.previousTotal, currency)}{" "}
          to {formatCents(ready?.total ?? 0, currency)} since you last saw it.
          Reserve again to continue at the new total.
        </p>
      ) : reserve.status === "error" ? (
        <p role="alert" className="text-[0.9rem] text-ink-soft">
          {reserve.message}
        </p>
      ) : null}

      {checkIn ? (
        <div>
          <TextButton onClick={onClear} muted>
            Clear dates
          </TextButton>
        </div>
      ) : null}
      {ready ? (
        <Note>
          Reserve takes you to Hospitable’s secure checkout to pay. We never see
          your card details.
        </Note>
      ) : null}
    </div>
  );
}

function guestLine(guests: Guests): string {
  return [
    plural(guests.adults + guests.children, "guest"),
    guests.infants ? plural(guests.infants, "infant") : null,
    guests.pets ? plural(guests.pets, "pet") : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function Breakdown({
  quote,
  nights,
  currency,
}: {
  quote: Quote;
  nights: number;
  currency: string;
}) {
  const uniform =
    quote.nights !== null &&
    quote.nights.every((n) => n.price === quote.nights![0]!.price);
  const nightsLabel = uniform
    ? `${formatCents(quote.nights![0]!.price, currency)} × ${plural(nights, "night")}`
    : plural(nights, "night");

  return (
    <dl className="flex flex-col gap-[0.45rem] text-[0.92rem]">
      <Row label={nightsLabel} amount={formatCents(quote.subTotal, currency)} />
      {!uniform && quote.nights ? (
        <ul className="-mt-1 mb-1 flex flex-col gap-[0.15rem] pl-3 font-mono text-[0.66rem] tracking-[0.03em] text-muted">
          {quote.nights.map((night) => (
            <li key={night.date} className="flex justify-between gap-4">
              <span>{formatLongDate(night.date)}</span>
              <span className="tabular-nums">
                {formatCents(night.price, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {quote.fees.map((fee) => (
        <Row
          key={fee.label}
          label={fee.label}
          amount={formatCents(fee.amount, currency)}
        />
      ))}
      {quote.discounts.map((discount) => (
        <Row
          key={discount.label}
          label={discount.label}
          amount={`−${formatCents(Math.abs(discount.amount), currency)}`}
        />
      ))}
      <Row
        label={quote.taxLines.length === 1 ? quote.taxLines[0]!.label : "Taxes"}
        amount={formatCents(quote.taxes, currency)}
      />
      <Row label="Total" amount={formatCents(quote.total, currency)} total />
    </dl>
  );
}

/** Same rows as the breakdown with the amounts blanked, so nothing shifts when they arrive. */
function LoadingBreakdown({
  previewTotal,
  currency,
}: {
  previewTotal: number | null;
  currency: string;
}) {
  return (
    <div>
      <p className="sr-only">Pricing these dates…</p>
      <dl
        aria-hidden="true"
        className="flex flex-col gap-[0.45rem] text-[0.92rem]"
      >
        <Row label="Nights" amount={<Bar />} />
        <Row label="Cleaning fee" amount={<Bar />} />
        <Row label="Taxes" amount={<Bar />} />
        <Row label="Total" amount={<Bar wide />} total />
      </dl>
      {previewTotal !== null ? (
        <p className="mt-2 font-mono text-[0.66rem] tracking-[0.04em] text-muted">
          Confirming the nightly estimate of{" "}
          {formatDollars(previewTotal, currency)}…
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  amount,
  total = false,
}: {
  label: ReactNode;
  amount: ReactNode;
  total?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-baseline justify-between gap-4",
        total && "border-t border-hairline pt-[0.45rem]",
      )}
    >
      <dt
        className={
          total
            ? "font-mono text-[0.74rem] tracking-[0.08em] text-muted uppercase"
            : "text-ink-soft"
        }
      >
        {label}
      </dt>
      <dd className={cx("text-ink tabular-nums", total && "font-medium")}>
        {amount}
      </dd>
    </div>
  );
}

function Bar({ wide = false }: { wide?: boolean }) {
  return (
    <span
      className={cx(
        "inline-block h-[0.9em] translate-y-[0.1em] bg-slot-b",
        wide ? "w-20" : "w-14",
      )}
    />
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[44ch] font-mono text-[0.66rem] leading-[1.5] tracking-[0.04em] text-muted">
      {children}
    </p>
  );
}

function TextButton({
  onClick,
  muted = false,
  children,
}: {
  onClick: () => void;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "cursor-pointer font-mono text-[0.72rem] tracking-[0.06em] underline underline-offset-4",
        muted ? "text-muted hover:text-ink" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}
