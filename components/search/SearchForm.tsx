"use client";

import Form from "next/form";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Calendar } from "@/components/booking/Calendar";
import { GuestRows } from "@/components/booking/GuestPicker";
import { getJson } from "@/lib/booking/api-client";
import { nightsBetween } from "@/lib/booking/dates";
import { formatShortDate, plural } from "@/lib/booking/format";
import {
  DEFAULT_GUESTS,
  type Guests,
  type Selection,
  toDayMap,
} from "@/lib/booking/rules";
import type { SearchQuery } from "@/lib/booking/search";
import type { SearchCalendarResponse } from "@/lib/booking/types";
import { cx } from "@/lib/cx";

import { requestResultsFocus } from "./results-focus";

export type SearchFormVariant = "bar" | "page";

export type SearchFormProps = {
  /** The stay already in the URL (on /search), to start from. */
  initial: SearchQuery | null;
  /** Largest house, the most guests worth offering. */
  maxGuests: number;
  /** Any house takes pets. */
  petsAllowed: boolean;
  variant: SearchFormVariant;
};

type Panel = "dates" | "guests" | null;

type CalendarLoad =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      start: string;
      end: string;
      days: ReturnType<typeof toDayMap>;
      maxNights: number;
    };

/*
 * The "check dates" search across every house, on the home hero and on
 * /search. A plain GET form to /search (next/form, so it navigates on the
 * client) whose two fields open small non-modal panels: the booking
 * widget's own range calendar over every house's calendar merged
 * (/api/search/calendar), and the guest steppers. Everything is site markup
 * in site colours, so it follows the theme and is reachable by keyboard:
 * each field is a real button with aria-expanded, Escape closes a panel and
 * returns focus to its field, and leaving a panel by Tab or a click closes it.
 */
export function SearchForm({
  initial,
  maxGuests,
  petsAllowed,
  variant,
}: SearchFormProps) {
  const id = useId();
  const datesPanelId = `${id}-dates`;
  const guestsPanelId = `${id}-guests`;
  const errorId = `${id}-error`;

  const [selection, setSelection] = useState<Selection>(() => ({
    checkIn: initial?.checkIn ?? null,
    checkOut: initial?.checkOut ?? null,
  }));
  const [guests, setGuests] = useState<Guests>(
    () => initial?.guests ?? DEFAULT_GUESTS,
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [calendar, setCalendar] = useState<CalendarLoad>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const datesButton = useRef<HTMLButtonElement>(null);
  const guestsButton = useRef<HTMLButtonElement>(null);
  const datesPanel = useRef<HTMLDivElement>(null);
  const loadAttempt = useRef(0);

  function loadCalendar() {
    if (calendar.status === "loading" || calendar.status === "ready") return;
    const attempt = ++loadAttempt.current;
    setCalendar({ status: "loading" });
    getJson<SearchCalendarResponse>("/api/search/calendar").then((body) => {
      if (attempt !== loadAttempt.current) return;
      setCalendar(
        body.ok
          ? {
              status: "ready",
              start: body.start,
              end: body.end,
              days: toDayMap(body.days),
              maxNights: body.maxNights,
            }
          : { status: "error", message: body.message },
      );
    });
  }

  function open(next: Panel) {
    if (next === "dates") loadCalendar();
    setPanel((current) => (current === next ? null : next));
  }

  function close(returnFocus: boolean) {
    const was = panel;
    setPanel(null);
    if (!returnFocus) return;
    (was === "guests" ? guestsButton : datesButton).current?.focus();
  }

  // A click anywhere outside the form closes an open panel.
  useEffect(() => {
    if (!panel) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setPanel(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [panel]);

  // Opening the dates panel puts focus on the calendar's focusable day.
  useEffect(() => {
    if (panel !== "dates" || calendar.status !== "ready") return;
    datesPanel.current
      ?.querySelector<HTMLButtonElement>('[role="gridcell"][tabindex="0"]')
      ?.focus();
  }, [panel, calendar.status]);

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  function onPanelBlur(event: React.FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) {
      // Moving to the panel's own field keeps the toggle working.
      const field = panel === "guests" ? guestsButton : datesButton;
      if (field.current !== next) setPanel(null);
    }
  }

  function onSelect(next: Selection) {
    setSelection(next);
    if (next.checkIn && next.checkOut) {
      setError(null);
      setPanel(null);
      guestsButton.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!selection.checkIn || !selection.checkOut) {
      event.preventDefault();
      setError("Choose your check-in and checkout dates first.");
      open("dates");
      return;
    }
    setPanel(null);
    requestResultsFocus();
  }

  const nights =
    selection.checkIn && selection.checkOut
      ? nightsBetween(selection.checkIn, selection.checkOut)
      : 0;
  const datesValue =
    selection.checkIn && selection.checkOut
      ? `${formatShortDate(selection.checkIn)} – ${formatShortDate(selection.checkOut)}`
      : selection.checkIn
        ? `${formatShortDate(selection.checkIn)} – add checkout`
        : "Add dates";
  const occupancy = guests.adults + guests.children;
  const guestsValue = [
    plural(occupancy, "guest"),
    guests.infants ? plural(guests.infants, "infant") : null,
    guests.pets ? plural(guests.pets, "pet") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const limits = useMemo(
    () =>
      calendar.status === "ready"
        ? { today: calendar.start, maxNights: calendar.maxNights }
        : null,
    [calendar],
  );

  return (
    <div
      ref={root}
      data-testid="check-dates"
      data-variant={variant}
      className="@container relative border border-hairline bg-paper-2 p-[clamp(1rem,2.5vw,1.25rem)]"
    >
      <Form
        action="/search"
        onSubmit={onSubmit}
        className="grid gap-[0.75rem] @[34rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] @[34rem]:items-end"
      >
        <Field
          label="Dates"
          value={datesValue}
          hint={nights ? plural(nights, "night") : undefined}
          placeholder={!selection.checkIn}
          buttonRef={datesButton}
          expanded={panel === "dates"}
          controls={datesPanelId}
          describedBy={error ? errorId : undefined}
          invalid={error !== null}
          onClick={() => open("dates")}
          onFocus={loadCalendar}
          onPointerEnter={loadCalendar}
        />
        <Field
          label="Guests"
          value={guestsValue}
          buttonRef={guestsButton}
          expanded={panel === "guests"}
          controls={guestsPanelId}
          onClick={() => open("guests")}
        />
        <button
          type="submit"
          className="min-h-[3.25rem] cursor-pointer border border-ink bg-ink px-[1.4rem] font-mono text-[0.78rem] tracking-[0.06em] text-paper uppercase transition-colors duration-[120ms] hover:border-ink-soft hover:bg-ink-soft"
        >
          Search
        </button>

        {selection.checkIn ? (
          <input type="hidden" name="checkin" value={selection.checkIn} />
        ) : null}
        {selection.checkOut ? (
          <input type="hidden" name="checkout" value={selection.checkOut} />
        ) : null}
        <input type="hidden" name="adults" value={guests.adults} />
        <input type="hidden" name="children" value={guests.children} />
        <input type="hidden" name="infants" value={guests.infants} />
        <input type="hidden" name="pets" value={guests.pets} />
      </Form>

      <p
        id={errorId}
        role="alert"
        className={cx(
          "font-mono text-[0.74rem] tracking-[0.04em] text-ink",
          error ? "mt-[0.75rem]" : "sr-only",
        )}
      >
        {error}
      </p>

      <PanelShell
        id={datesPanelId}
        label="Choose your dates"
        hidden={panel !== "dates"}
        panelRef={datesPanel}
        onKeyDown={onPanelKeyDown}
        onBlur={onPanelBlur}
      >
        {calendar.status === "ready" && limits ? (
          <>
            <Calendar
              days={calendar.days}
              limits={limits}
              windowEnd={calendar.end}
              selection={selection}
              directMarkupPct={0}
              currency="USD"
              onSelect={onSelect}
            />
            <div className="mt-[1rem] flex flex-wrap items-center justify-between gap-[0.75rem] border-t border-hairline pt-[0.85rem]">
              <p className="max-w-[36ch] font-mono text-[0.68rem] leading-[1.5] tracking-[0.04em] text-muted">
                Nightly prices are the lowest of the three houses, before fees
                and taxes.
              </p>
              <div className="flex gap-[0.5rem]">
                <PanelButton
                  onClick={() =>
                    setSelection({ checkIn: null, checkOut: null })
                  }
                  disabled={!selection.checkIn}
                >
                  Clear
                </PanelButton>
                <PanelButton onClick={() => close(true)}>Done</PanelButton>
              </div>
            </div>
          </>
        ) : calendar.status === "error" ? (
          <div className="flex flex-col items-start gap-[0.75rem]">
            <p role="alert" className="text-[0.95rem] text-ink">
              {calendar.message}
            </p>
            <PanelButton
              onClick={() => {
                setCalendar({ status: "idle" });
                queueMicrotask(loadCalendar);
              }}
            >
              Try again
            </PanelButton>
          </div>
        ) : (
          <p
            role="status"
            className="py-[2rem] text-center font-mono text-[0.74rem] tracking-[0.08em] text-muted uppercase"
          >
            Loading the calendar…
          </p>
        )}
      </PanelShell>

      <PanelShell
        id={guestsPanelId}
        label="Guests"
        hidden={panel !== "guests"}
        onKeyDown={onPanelKeyDown}
        onBlur={onPanelBlur}
        narrow
      >
        <p className="mb-[0.5rem] font-mono text-[0.68rem] tracking-[0.04em] text-muted">
          Each house sleeps up to {maxGuests}.
        </p>
        <GuestRows
          guests={guests}
          maxGuests={maxGuests}
          petsAllowed={petsAllowed}
          onChange={setGuests}
        />
        <div className="mt-[0.75rem] flex justify-end border-t border-hairline pt-[0.75rem]">
          <PanelButton onClick={() => close(true)}>Done</PanelButton>
        </div>
      </PanelShell>
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  placeholder,
  buttonRef,
  expanded,
  controls,
  describedBy,
  invalid,
  onClick,
  onFocus,
  onPointerEnter,
}: {
  label: string;
  value: string;
  hint?: string;
  placeholder?: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  controls: string;
  describedBy?: string;
  invalid?: boolean;
  onClick: () => void;
  onFocus?: () => void;
  onPointerEnter?: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-describedby={describedBy}
      onClick={onClick}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      className={cx(
        "flex min-h-[3.25rem] w-full min-w-0 cursor-pointer flex-col items-start justify-center gap-[0.2rem] border bg-paper px-[0.9rem] py-[0.55rem] text-left transition-colors duration-[120ms] hover:border-muted",
        expanded ? "border-ink" : invalid ? "border-ink" : "border-hairline",
      )}
    >
      <span className="font-mono text-[0.68rem] tracking-[0.1em] text-muted uppercase">
        {label}
        {hint ? (
          <span className="tracking-[0.04em] normal-case"> · {hint}</span>
        ) : null}
      </span>
      <span
        className={cx(
          "w-full truncate text-[0.98rem]",
          placeholder ? "text-ink-soft" : "text-ink",
        )}
      >
        {value}
      </span>
    </button>
  );
}

function PanelShell({
  id,
  label,
  hidden,
  narrow,
  panelRef,
  onKeyDown,
  onBlur,
  children,
}: {
  id: string;
  label: string;
  hidden: boolean;
  narrow?: boolean;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      id={id}
      role="group"
      aria-label={label}
      hidden={hidden}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={cx(
        "@container absolute top-[calc(100%_+_0.5rem)] left-0 z-30 w-full border border-hairline bg-paper p-[clamp(1rem,2.5vw,1.25rem)] shadow-[0_12px_32px_rgb(0_0_0_/_0.12)]",
        narrow
          ? "max-w-[22rem] @[34rem]:right-[clamp(1rem,2.5vw,1.25rem)] @[34rem]:left-auto"
          : "max-w-[44rem] min-w-full @[34rem]:w-[min(44rem,calc(100vw_-_2rem))]",
      )}
    >
      {children}
    </div>
  );
}

function PanelButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer border border-hairline px-[0.9rem] py-[0.5rem] font-mono text-[0.72rem] tracking-[0.06em] text-ink uppercase transition-colors duration-[120ms] hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
