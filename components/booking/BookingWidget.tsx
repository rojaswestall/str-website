"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Eyebrow } from "@/components/ui";
import { nightsBetween, todayInBookingZone } from "@/lib/booking/dates";
import { formatDollars, formatRange, plural } from "@/lib/booking/format";
import {
  clampGuests,
  DEFAULT_GUESTS,
  EMPTY_SELECTION,
  type Guests,
  previewTotalDollars,
  type Selection,
  toDayMap,
} from "@/lib/booking/rules";
import type {
  BookingProperty,
  CalendarDay,
  CalendarResponse,
  PropertiesResponse,
} from "@/lib/booking/types";
import { cx } from "@/lib/cx";

import { Calendar, type SelectVia } from "./Calendar";
import { GuestPicker } from "./GuestPicker";
import { PricePanel } from "./PricePanel";
import { StickySummary } from "./StickySummary";

export type BookingWidgetProps = {
  /** Hospitable property id. Omit for a switcher over every bookable house. */
  propertyId?: string;
  className?: string;
};

type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

type Catalog = {
  properties: BookingProperty[];
  maxNights: number;
  comparisonEnabled: boolean;
};

type CalendarData = { end: string; days: CalendarDay[] };

/*
 * The site's own booking widget. Reads /api/properties once and
 * /api/calendar/:id per house; the browser never talks to Hospitable. Emits
 * `widget_loaded` and `dates_selected` as bubbling DOM CustomEvents for the
 * host page's analytics. All amounts shown here are calendar previews; the
 * quote (Phase 3) is the only price a guest acts on.
 */
export function BookingWidget({ propertyId, className }: BookingWidgetProps) {
  const root = useRef<HTMLDivElement>(null);
  const priceHeading = useRef<HTMLParagraphElement>(null);
  const pricePanel = useRef<HTMLDivElement>(null);
  const today = useMemo(() => todayInBookingZone(), []);

  const [catalog, setCatalog] = useState<Load<Catalog>>({ status: "loading" });
  const [activeId, setActiveId] = useState<string | undefined>(propertyId);
  const [calendar, setCalendar] = useState<Load<CalendarData>>({
    status: "loading",
  });
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [guests, setGuests] = useState<Guests>(DEFAULT_GUESTS);
  const [reload, setReload] = useState(0);

  const emit = useCallback((name: string, detail: unknown) => {
    root.current?.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true }),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getJson<PropertiesResponse>("/api/properties", controller.signal)
      .then((body) => {
        if (!body.ok) throw new Error(body.message);
        const data = {
          properties: body.properties,
          maxNights: body.maxNights,
          comparisonEnabled: body.comparisonEnabled,
        };
        setCatalog({ status: "ready", data });
        setActiveId((id) => id ?? data.properties[0]?.id);
        emit("widget_loaded", { properties: data.properties.map((p) => p.id) });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCatalog({ status: "error", message: describe(error) });
      });
    return () => controller.abort();
  }, [emit, reload]);

  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    getJson<CalendarResponse>(
      `/api/calendar/${encodeURIComponent(activeId)}`,
      controller.signal,
    )
      .then((body) => {
        if (!body.ok) throw new Error(body.message);
        setCalendar({
          status: "ready",
          data: { end: body.end, days: body.days },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCalendar({ status: "error", message: describe(error) });
      });
    return () => controller.abort();
  }, [activeId, reload]);

  const property =
    catalog.status === "ready"
      ? catalog.data.properties.find((p) => p.id === activeId)
      : undefined;
  const limits = useMemo(
    () => ({
      today,
      maxNights: catalog.status === "ready" ? catalog.data.maxNights : 90,
    }),
    [today, catalog],
  );
  const dayMap = useMemo(
    () => toDayMap(calendar.status === "ready" ? calendar.data.days : []),
    [calendar],
  );

  // Loading states are set where a fetch is triggered (here, in retry, and
  // in the initial state), never inside the effects that run the fetch.
  function switchProperty(id: string) {
    setActiveId(id);
    setCalendar({ status: "loading" });
    setSelection(EMPTY_SELECTION);
  }

  function retry() {
    setCatalog({ status: "loading" });
    setCalendar({ status: "loading" });
    setReload((n) => n + 1);
  }

  function onSelect(next: Selection, via: SelectVia) {
    setSelection(next);
    if (next.checkIn && next.checkOut) {
      emit("dates_selected", {
        propertyId: activeId,
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        nights: nightsBetween(next.checkIn, next.checkOut),
      });
      if (via === "keyboard") {
        requestAnimationFrame(() => priceHeading.current?.focus());
      }
    }
  }

  const nights =
    selection.checkIn && selection.checkOut
      ? nightsBetween(selection.checkIn, selection.checkOut)
      : 0;
  const previewTotal =
    property && selection.checkIn && selection.checkOut
      ? previewTotalDollars(
          selection.checkIn,
          selection.checkOut,
          dayMap,
          property.markups.directPct,
        )
      : null;

  return (
    <div
      ref={root}
      data-testid="booking-widget"
      data-property-id={activeId}
      className={cx(
        "flex flex-col gap-5 border border-hairline bg-paper-2 p-[clamp(1rem,3vw,1.75rem)]",
        className,
      )}
    >
      {catalog.status === "loading" ? (
        <Skeleton />
      ) : catalog.status === "error" ? (
        <Failure message={catalog.message} onRetry={retry} />
      ) : (
        <>
          <div className="flex flex-col gap-[0.35rem]">
            <Eyebrow>Book direct</Eyebrow>
            {propertyId === undefined && catalog.data.properties.length > 1 ? (
              <PropertySwitcher
                properties={catalog.data.properties}
                activeId={activeId}
                onChange={switchProperty}
              />
            ) : (
              <p className="font-display text-[1.35rem] leading-[1.25] text-ink">
                {property?.name}
              </p>
            )}
          </div>

          {property === undefined ? (
            <Failure
              message="This house isn't available to book online."
              onRetry={null}
            />
          ) : calendar.status === "loading" ? (
            <Skeleton calendar />
          ) : calendar.status === "error" ? (
            <Failure message={calendar.message} onRetry={retry} />
          ) : (
            <>
              <Calendar
                key={property.id}
                days={dayMap}
                limits={limits}
                windowEnd={calendar.data.end}
                selection={selection}
                directMarkupPct={property.markups.directPct}
                currency={property.currency}
                onSelect={onSelect}
              />
              <GuestPicker
                guests={clampGuests(guests, {
                  maxGuests: property.maxGuests,
                  petsAllowed: property.petsAllowed,
                })}
                maxGuests={property.maxGuests}
                petsAllowed={property.petsAllowed}
                onChange={setGuests}
              />
              <PricePanel
                selection={selection}
                guests={guests}
                previewTotal={previewTotal}
                nights={nights}
                currency={property.currency}
                headingRef={priceHeading}
                panelRef={pricePanel}
                onClear={() => setSelection(EMPTY_SELECTION)}
              />
              <StickySummary
                active={selection.checkIn !== null}
                label={
                  selection.checkIn && selection.checkOut
                    ? `${plural(nights, "night")} · ${formatRange(selection.checkIn, selection.checkOut)}`
                    : "Choose a check-out date"
                }
                amount={
                  previewTotal !== null
                    ? `${formatDollars(previewTotal, property.currency)} est.`
                    : ""
                }
                reserveDisabled
                panelRef={pricePanel}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function PropertySwitcher({
  properties,
  activeId,
  onChange,
}: {
  properties: BookingProperty[];
  activeId: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Choose a house"
      className="flex flex-wrap gap-2"
    >
      {properties.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p.id)}
            className={cx(
              "cursor-pointer border px-3 py-[0.45rem] font-mono text-[0.72rem] tracking-[0.06em] uppercase transition-colors duration-[120ms]",
              active
                ? "border-ink bg-ink text-paper"
                : "border-hairline text-ink hover:border-muted",
            )}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

function Skeleton({ calendar = false }: { calendar?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading the booking calendar"
      className="flex flex-col gap-4"
    >
      {!calendar ? <div className="h-5 w-40 bg-slot-b" /> : null}
      <div className="h-8 bg-slot-a" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="min-h-[2.9rem] bg-slot-a" />
        ))}
      </div>
      <div className="h-24 bg-slot-a" />
    </div>
  );
}

function Failure({
  message,
  onRetry,
}: {
  message: string;
  onRetry: (() => void) | null;
}) {
  return (
    <div role="alert" className="flex flex-col gap-3">
      <p className="text-[0.92rem] text-ink-soft">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer self-start font-mono text-[0.72rem] tracking-[0.06em] text-ink underline underline-offset-4"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    throw new Error("We couldn't load the booking calendar. Please try again.");
  }
  if (
    !response.ok &&
    !(body && typeof body === "object" && "message" in body)
  ) {
    throw new Error("We couldn't load the booking calendar. Please try again.");
  }
  return body as T;
}

function describe(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong loading the booking calendar.";
}
