"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { addDays, addMonths } from "@/lib/booking/dates";
import {
  formatDollars,
  formatLongDate,
  formatMonth,
} from "@/lib/booking/format";
import {
  type DayMap,
  type DayView,
  dayView,
  monthStart,
  monthWeeks,
  previewNightlyDollars,
  selectDate,
  type Selection,
  type StayLimits,
} from "@/lib/booking/rules";
import { cx } from "@/lib/cx";

export type SelectVia = "pointer" | "keyboard";

export type CalendarProps = {
  days: DayMap;
  limits: StayLimits;
  /** Last date the calendar knows about. */
  windowEnd: string;
  selection: Selection;
  directMarkupPct: number;
  currency: string;
  onSelect: (selection: Selection, via: SelectVia) => void;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/*
 * Range picker over the normalized calendar. One month in a narrow column,
 * two side by side from 36rem of container width. Keyboard: arrows move a
 * day or a week, PageUp/PageDown a month, Home/End to the week's ends,
 * Enter or Space selects; the focused day doubles as the check-out preview.
 * Every day is a gridcell button with a label like
 * "Tuesday, October 27, $124, available".
 */
export function Calendar({
  days,
  limits,
  windowEnd,
  selection,
  directMarkupPct,
  currency,
  onSelect,
}: CalendarProps) {
  const firstMonth = monthStart(limits.today);
  const lastMonth = monthStart(windowEnd);
  const [month, setMonth] = useState(() =>
    monthStart(selection.checkIn ?? limits.today),
  );
  const [focusDate, setFocusDate] = useState(
    () => selection.checkIn ?? limits.today,
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [focusInside, setFocusInside] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const headingId = useId();

  const nextMonth = addMonths(month, 1);
  const canGoBack = month > firstMonth;
  const canGoForward = nextMonth < lastMonth;

  // After a keyboard move the newly focusable button needs real focus.
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
      ?.focus();
  }, [focusDate, month]);

  const preview =
    selection.checkIn && !selection.checkOut
      ? (hoverDate ?? (focusInside ? focusDate : null))
      : null;

  function moveFocus(date: string) {
    const clamped =
      date < limits.today ? limits.today : date > windowEnd ? windowEnd : date;
    pendingFocus.current = true;
    setFocusDate(clamped);
    const target = monthStart(clamped);
    if (target < month) setMonth(target);
    else if (target > nextMonth || (target === nextMonth && !isWide()))
      setMonth(target);
  }

  function isWide(): boolean {
    return (gridRef.current?.offsetWidth ?? 0) >= 576;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const map: Record<string, () => void> = {
      ArrowLeft: () => moveFocus(addDays(focusDate, -1)),
      ArrowRight: () => moveFocus(addDays(focusDate, 1)),
      ArrowUp: () => moveFocus(addDays(focusDate, -7)),
      ArrowDown: () => moveFocus(addDays(focusDate, 7)),
      PageUp: () => moveFocus(addMonths(focusDate, -1)),
      PageDown: () => moveFocus(addMonths(focusDate, 1)),
      Home: () =>
        moveFocus(
          addDays(focusDate, -new Date(`${focusDate}T00:00:00Z`).getUTCDay()),
        ),
      End: () =>
        moveFocus(
          addDays(
            focusDate,
            6 - new Date(`${focusDate}T00:00:00Z`).getUTCDay(),
          ),
        ),
      Enter: () => choose(focusDate, "keyboard"),
      " ": () => choose(focusDate, "keyboard"),
    };
    const action = map[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  function choose(date: string, via: SelectVia) {
    const next = selectDate(selection, date, days, limits);
    if (next === selection) return;
    setFocusDate(date);
    onSelect(next, via);
  }

  const months = [month, nextMonth].filter((m) => m <= lastMonth);

  return (
    <div
      className="@container"
      onMouseLeave={() => setHoverDate(null)}
      onFocus={() => setFocusInside(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocusInside(false);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <NavButton
          label="Previous month"
          disabled={!canGoBack}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          ←
        </NavButton>
        <p
          id={headingId}
          aria-live="polite"
          className="font-mono text-[0.74rem] tracking-[0.08em] text-ink uppercase"
        >
          {formatMonth(month)}
          <span className="hidden @xl:inline"> – {formatMonth(nextMonth)}</span>
        </p>
        <NavButton
          label="Next month"
          disabled={!canGoForward}
          onClick={() => setMonth(nextMonth)}
        >
          →
        </NavButton>
      </div>

      <div
        ref={gridRef}
        onKeyDown={onKeyDown}
        className="grid gap-6 @xl:grid-cols-2"
      >
        {months.map((m, index) => (
          <div
            key={m}
            role="grid"
            aria-label={formatMonth(m)}
            className={cx(index === 1 && "hidden @xl:block")}
          >
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  role="columnheader"
                  className="pb-2 text-center font-mono text-[0.62rem] tracking-[0.08em] text-muted uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            {monthWeeks(m).map((week, w) => (
              <div key={w} role="row" className="grid grid-cols-7">
                {week.map((date, d) =>
                  date ? (
                    <Day
                      key={date}
                      date={date}
                      view={dayView(date, selection, preview, days, limits)}
                      price={days.get(date)?.price}
                      directMarkupPct={directMarkupPct}
                      currency={currency}
                      today={date === limits.today}
                      tabIndex={date === focusDate ? 0 : -1}
                      onHover={() => setHoverDate(date)}
                      onClick={() => choose(date, "pointer")}
                      onFocus={() => setFocusDate(date)}
                    />
                  ) : (
                    <div key={`pad-${d}`} role="gridcell" aria-hidden="true" />
                  ),
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 cursor-pointer border border-hairline font-mono text-[0.8rem] text-ink transition-colors duration-[120ms] hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Day({
  date,
  view,
  price,
  directMarkupPct,
  currency,
  today,
  tabIndex,
  onHover,
  onClick,
  onFocus,
}: {
  date: string;
  view: DayView;
  price: number | undefined;
  directMarkupPct: number;
  currency: string;
  today: boolean;
  tabIndex: 0 | -1;
  onHover: () => void;
  onClick: () => void;
  onFocus: () => void;
}) {
  const showPrice = view.available && price !== undefined;
  const nightly = showPrice
    ? formatDollars(previewNightlyDollars(price, directMarkupPct), currency)
    : null;
  const selected = view.role === "check-in" || view.role === "check-out";
  const disabled = !view.selectable;

  return (
    <button
      type="button"
      role="gridcell"
      data-date={date}
      aria-label={describe(date, view, nightly)}
      aria-selected={selected || view.role === "between" ? true : undefined}
      aria-disabled={disabled ? true : undefined}
      aria-current={today ? "date" : undefined}
      tabIndex={tabIndex}
      onMouseEnter={onHover}
      onClick={onClick}
      onFocus={onFocus}
      className={cx(
        "flex min-h-[2.9rem] flex-col items-center justify-center gap-[0.1rem] py-1 text-[0.86rem] leading-none tabular-nums transition-colors duration-[120ms]",
        selected && "bg-ink text-paper",
        view.role === "between" && "bg-slot-b text-ink",
        !selected && view.role !== "between" && view.available && "text-ink",
        !selected &&
          view.role !== "between" &&
          !view.available &&
          "text-muted/60 line-through",
        // Still clickable as a fresh check-in, so it must stay readable
        // (muted on paper-2 is 4.8:1; the /60 tint was 2.3:1).
        !selected &&
          view.role !== "between" &&
          view.available &&
          view.blocked &&
          "text-muted",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        !disabled && !selected && "hover:bg-slot-a",
        today && "underline decoration-dotted underline-offset-4",
      )}
    >
      <span>{Number(date.slice(8, 10))}</span>
      <span
        aria-hidden="true"
        className={cx(
          "font-mono text-[0.58rem] tracking-[0.02em]",
          // Each pair clears 4.5:1 in both themes (muted on slot-b did not).
          selected
            ? "text-paper/70"
            : view.role === "between"
              ? "text-ink-soft"
              : "text-muted",
          !nightly && "invisible",
        )}
      >
        {nightly ?? "—"}
      </span>
    </button>
  );
}

function describe(date: string, view: DayView, nightly: string | null): string {
  const parts = [formatLongDate(date)];
  if (nightly) parts.push(nightly);
  if (view.role === "check-in") parts.push("selected as check-in");
  else if (view.role === "check-out") parts.push("selected as check-out");
  else if (view.past) parts.push("past");
  else if (!view.available) parts.push("unavailable");
  else if (view.blocked === "min-stay" && view.minStay)
    parts.push(`minimum ${view.minStay} nights from your check-in`);
  else if (view.blocked === "unavailable")
    parts.push("not reachable without crossing a booked night");
  else if (view.blocked === "max-nights") parts.push("beyond the longest stay");
  else if (view.blocked === "closed-to-departure")
    parts.push("no check-out on this day");
  else parts.push("available");
  return parts.join(", ");
}
