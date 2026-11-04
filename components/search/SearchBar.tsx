"use client";

import { useRouter } from "next/navigation";
import {
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Calendar, GuestPicker } from "@/components/booking";
import { Button, Eyebrow } from "@/components/ui";
import {
  addDays,
  addMonths,
  CALENDAR_WINDOW_MONTHS,
} from "@/lib/booking/dates";
import { formatShortDate } from "@/lib/booking/format";
import {
  DEFAULT_GUESTS,
  EMPTY_SELECTION,
  type Guests,
  MAX_GUESTS,
  MAX_INFANTS,
  MAX_PETS,
  type Selection,
  type StayLimits,
  toDayMap,
} from "@/lib/booking/rules";
import { guestSummary, openDays, searchHref } from "@/lib/booking/search";
import { SEARCH_RESULTS_PATH } from "@/lib/hospitable";
import { cx } from "@/lib/cx";

export type SearchBarProps = {
  /** Today in the booking time zone, decided by the server; nothing earlier is selectable. */
  today: string;
  /** `MAX_NIGHTS`: the longest stay the picker lets a guest choose. */
  maxNights: number;
  /** For the "Search all N houses" line. */
  propertyCount: number;
  /** A stay already in the URL (the `/search` page); empty on the home page. */
  defaultSelection?: Selection;
  defaultGuests?: Guests;
  className?: string;
};

type Popover = "dates" | "guests";

/** The frame: the stub's hairline card, as a container for the row's breakpoints. */
const FRAME_CLASS =
  "@container flex flex-col gap-[1.1rem] border border-hairline bg-paper-2 p-[clamp(1.25rem,3vw,1.75rem)]";

/**
 * One row from 32rem of container width (dates, guests, button; the hero
 * gives the bar about 36rem on a desktop), two columns from 24rem, stacked
 * below. The popovers are grid children too: inline on narrow widths,
 * floated below the row on wide ones.
 */
const ROW_CLASS =
  "relative grid gap-[0.75rem] @sm:grid-cols-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]";

const LABEL_CLASS =
  "font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase";

/** The same height as the primary Button: equal padding and type size. */
const FIELD_CLASS =
  "flex w-full items-center border border-hairline bg-paper px-[0.75rem] py-[0.68rem] font-mono text-[0.78rem] leading-normal tracking-[0.04em] text-ink";

const NOTE_CLASS =
  "max-w-[48ch] font-mono text-[0.72rem] leading-[1.5] tracking-[0.04em] text-muted";

const subscribeNoop = () => () => {};

/** False on the server and during hydration, true once React runs here. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/*
 * The site's own property search bar, mounted on the home hero in native
 * mode (and, next, on /search), in the prerendered HTML: `today` is the
 * cached date from lib/booking/today.ts, never the browser clock. A real
 * GET form to /search with Hospitable's parameter names, so it works
 * before hydration and without JavaScript:
 * two `<input type="date">` fields and, in a `<details>`, a number input per
 * guest kind. Once hydrated the same form swaps those for hidden inputs
 * behind three buttons that open the widget's own `Calendar` (no prices,
 * no availability: the search answers that) and `GuestPicker` in a
 * non-modal dialog, submits with a client-side navigation to the identical
 * URL, and emits `search_submitted` for `BookingAnalytics`.
 *
 * The popovers are grid children of the row: inline below their field on a
 * narrow container, floated under the row from 32rem. Escape closes one and
 * returns focus to the field that opened it; so does picking the check-out
 * date; a click or Tab outside closes it in place.
 */
export function SearchBar({
  today,
  maxNights,
  propertyCount,
  defaultSelection = EMPTY_SELECTION,
  defaultGuests = DEFAULT_GUESTS,
  className,
}: SearchBarProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const checkInField = useRef<HTMLButtonElement>(null);
  const checkOutField = useRef<HTMLButtonElement>(null);
  const guestsField = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<Selection>(defaultSelection);
  const [guests, setGuests] = useState<Guests>(defaultGuests);
  const [open, setOpen] = useState<Popover | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const windowEnd = useMemo(
    () => addMonths(today, CALENDAR_WINDOW_MONTHS),
    [today],
  );
  const days = useMemo(
    () => toDayMap(openDays(today, windowEnd)),
    [today, windowEnd],
  );
  const limits = useMemo<StayLimits>(
    () => ({ today, maxNights }),
    [today, maxNights],
  );

  // Focus moves into a popover as it opens: the calendar's focusable day,
  // or the first stepper. The trigger keeps the focus when nothing opened.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const panel = dialog.current;
      if (!panel) return;
      (
        panel.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]') ??
        panel.querySelector<HTMLElement>("button:not([disabled])")
      )?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // A pointer down anywhere outside the bar closes an open popover in place.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show(which: Popover, trigger: HTMLElement | null) {
    opener.current = trigger;
    setOpen(which);
  }

  function dismiss(returnFocus: boolean) {
    setOpen(null);
    if (returnFocus) opener.current?.focus();
  }

  function toggle(which: Popover, trigger: HTMLElement | null) {
    if (open === which) dismiss(false);
    else show(which, trigger);
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    dismiss(true);
  }

  function onBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) setOpen(null);
  }

  function onSelect(next: Selection) {
    setSelection(next);
    setHint(null);
    // The stay is complete: hand focus back so the guest can carry on.
    if (next.checkIn && next.checkOut) dismiss(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Only ever runs hydrated; before that the browser submits the GET itself.
    event.preventDefault();
    const { checkIn, checkOut } = selection;
    if (!checkIn || !checkOut) {
      setHint(checkIn ? "Choose a check-out date" : "Choose your dates first");
      show("dates", (checkIn ? checkOutField : checkInField).current ?? null);
      return;
    }
    const query = { checkIn, checkOut, ...guests };
    root.current?.dispatchEvent(
      new CustomEvent("search_submitted", {
        bubbles: true,
        detail: {
          checkin: checkIn,
          checkout: checkOut,
          adults: guests.adults,
          children: guests.children,
          infants: guests.infants,
          pets: guests.pets,
        },
      }),
    );
    router.push(searchHref(query));
  }

  const checkInLabel = `${id}-checkin-label`;
  const checkOutLabel = `${id}-checkout-label`;
  const guestsLabel = `${id}-guests-label`;
  const datesDialog = `${id}-dates`;
  const guestsDialog = `${id}-guests`;

  return (
    <form
      ref={root}
      role="search"
      aria-label="Search the houses"
      method="get"
      action={SEARCH_RESULTS_PATH}
      data-testid="search-bar"
      data-hydrated={hydrated ? "true" : undefined}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={cx(FRAME_CLASS, className)}
    >
      <div className="flex flex-col gap-[0.35rem]">
        <Eyebrow>Check dates</Eyebrow>
        <p className="font-display text-[1.35rem] leading-[1.25] text-ink">
          Search all {propertyCount} houses
        </p>
      </div>

      {hydrated ? (
        <>
          {/* The values the GET carries, in the URL contract's order. */}
          <input type="hidden" name="checkin" value={selection.checkIn ?? ""} />
          <input
            type="hidden"
            name="checkout"
            value={selection.checkOut ?? ""}
          />
          <input type="hidden" name="adults" value={guests.adults} />
          <input type="hidden" name="children" value={guests.children} />
          <input type="hidden" name="infants" value={guests.infants} />
          <input type="hidden" name="pets" value={guests.pets} />
        </>
      ) : null}

      <div className={ROW_CLASS}>
        {hydrated ? (
          <>
            <Field
              label="Check-in"
              labelId={checkInLabel}
              value={
                selection.checkIn
                  ? formatShortDate(selection.checkIn)
                  : "Add date"
              }
              placeholder={!selection.checkIn}
              expanded={open === "dates"}
              controls={datesDialog}
              fieldRef={checkInField}
              onClick={() => show("dates", checkInField.current)}
            />
            <Field
              label="Checkout"
              labelId={checkOutLabel}
              value={
                selection.checkOut
                  ? formatShortDate(selection.checkOut)
                  : "Add date"
              }
              placeholder={!selection.checkOut}
              expanded={open === "dates"}
              controls={datesDialog}
              fieldRef={checkOutField}
              onClick={() => show("dates", checkOutField.current)}
            />
            {open === "dates" ? (
              <Dialog
                id={datesDialog}
                label="Choose your dates"
                placement="row"
                dialogRef={dialog}
              >
                <Calendar
                  days={days}
                  limits={limits}
                  windowEnd={windowEnd}
                  selection={selection}
                  directMarkupPct={0}
                  currency="USD"
                  showPrices={false}
                  onSelect={onSelect}
                />
              </Dialog>
            ) : null}
            <Field
              label="Guests"
              labelId={guestsLabel}
              value={guestSummary(guests)}
              expanded={open === "guests"}
              controls={guestsDialog}
              fieldRef={guestsField}
              onClick={() => toggle("guests", guestsField.current)}
            />
            {open === "guests" ? (
              <Dialog
                id={guestsDialog}
                label="Guests"
                placement="end"
                dialogRef={dialog}
              >
                <GuestPicker
                  guests={guests}
                  maxGuests={MAX_GUESTS}
                  petsAllowed
                  alwaysOpen
                  onChange={setGuests}
                />
              </Dialog>
            ) : null}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-[0.35rem]">
              <span className={LABEL_CLASS}>Check-in</span>
              <input
                type="date"
                name="checkin"
                required
                min={today}
                max={windowEnd}
                defaultValue={selection.checkIn ?? ""}
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-[0.35rem]">
              <span className={LABEL_CLASS}>Checkout</span>
              <input
                type="date"
                name="checkout"
                required
                min={addDays(today, 1)}
                max={windowEnd}
                defaultValue={selection.checkOut ?? ""}
                className={FIELD_CLASS}
              />
            </label>
            <details className="flex flex-col gap-[0.35rem]">
              <summary className="flex cursor-pointer list-none flex-col gap-[0.35rem] [&::-webkit-details-marker]:hidden">
                <span className={LABEL_CLASS}>Guests</span>
                <span className={FIELD_CLASS}>{guestSummary(guests)}</span>
              </summary>
              <div className="mt-[0.75rem] grid grid-cols-2 gap-[0.75rem] border border-hairline bg-paper p-[0.75rem]">
                {(
                  [
                    ["adults", "Adults", 1, MAX_GUESTS],
                    ["children", "Children", 0, MAX_GUESTS],
                    ["infants", "Infants", 0, MAX_INFANTS],
                    ["pets", "Pets", 0, MAX_PETS],
                  ] as const
                ).map(([name, label, min, max]) => (
                  <label key={name} className="flex flex-col gap-[0.35rem]">
                    <span className={LABEL_CLASS}>{label}</span>
                    <input
                      type="number"
                      name={name}
                      min={min}
                      max={max}
                      step={1}
                      inputMode="numeric"
                      defaultValue={guests[name]}
                      className={FIELD_CLASS}
                    />
                  </label>
                ))}
              </div>
            </details>
          </>
        )}
        <Button type="submit" className="self-end whitespace-nowrap">
          Search
        </Button>
      </div>

      {/* A live region from the start, so a hint replacing the note is announced. */}
      <p role="status" className={cx(NOTE_CLASS, hint && "text-ink")}>
        {hint ??
          "The same calendars as the house pages; the price is quoted there."}
      </p>
    </form>
  );
}

/** A labelled field that opens a popover: the hydrated form's check-in, check-out and guests. */
function Field({
  label,
  labelId,
  value,
  placeholder = false,
  expanded,
  controls,
  fieldRef,
  onClick,
}: {
  label: string;
  labelId: string;
  value: string;
  /** The value is a prompt ("Add date"), shown muted. */
  placeholder?: boolean;
  expanded: boolean;
  controls: string;
  fieldRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.35rem]">
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      <button
        ref={fieldRef}
        type="button"
        aria-labelledby={`${labelId} ${labelId}-value`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={expanded ? controls : undefined}
        onClick={onClick}
        className={cx(
          FIELD_CLASS,
          "cursor-pointer text-left transition-colors duration-[120ms] hover:border-muted",
          expanded && "border-muted",
        )}
      >
        <span
          id={`${labelId}-value`}
          className={cx("truncate", placeholder && "text-muted")}
        >
          {value}
        </span>
      </button>
    </div>
  );
}

/*
 * A non-modal dialog under the row. As a grid child it reads inline on a
 * narrow container, directly below the field that opened it (the DOM order
 * is the field order), and floats over whatever follows from 32rem: the
 * calendar across the whole row, the guest picker under the row's end.
 */
function Dialog({
  id,
  label,
  placement,
  dialogRef,
  children,
}: {
  id: string;
  label: string;
  placement: "row" | "end";
  dialogRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-label={label}
      className={cx(
        "border border-hairline bg-paper-2 p-[clamp(0.9rem,2vw,1.25rem)] @sm:col-span-2 @lg:absolute @lg:top-full @lg:z-20 @lg:mt-[0.75rem] @lg:shadow-[0_10px_30px_-14px_var(--scrim)]",
        placement === "row"
          ? "@lg:left-0 @lg:w-full"
          : "@lg:right-0 @lg:w-[24rem]",
      )}
    >
      {children}
    </div>
  );
}
