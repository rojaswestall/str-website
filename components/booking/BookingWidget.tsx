"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Eyebrow } from "@/components/ui";
import { getJson, postQuote } from "@/lib/booking/api-client";
import { nightsBetween } from "@/lib/booking/dates";
import {
  formatCents,
  formatDollars,
  formatRange,
  plural,
} from "@/lib/booking/format";
import { isTrustedCheckoutUrl } from "@/lib/booking/normalize";
import { normalizePhone } from "@/lib/booking/phone";
import {
  clampGuests,
  DEFAULT_GUESTS,
  EMPTY_SELECTION,
  type Guests,
  previewTotalDollars,
  type Selection,
  toDayMap,
} from "@/lib/booking/rules";
import { fieldErrors, GuestDetailsSchema } from "@/lib/booking/schema";
import type {
  BookingProperty,
  CalendarDay,
  CalendarResponse,
  GuestDetails,
  PropertiesResponse,
} from "@/lib/booking/types";
import { cx } from "@/lib/cx";

import { Calendar, type SelectVia } from "./Calendar";
import { EMPTY_GUEST_FORM, GuestForm, type GuestFormValues } from "./GuestForm";
import { GuestPicker } from "./GuestPicker";
import { PricePanel, type ReserveState } from "./PricePanel";
import { StickySummary } from "./StickySummary";
import { useQuote } from "./useQuote";

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

/** `start` is today in the booking time zone, decided by the server. */
type CalendarData = { start: string; end: string; days: CalendarDay[] };

type FormErrors = Partial<Record<keyof GuestFormValues, string>>;

/*
 * The site's own booking widget. Reads /api/properties once and
 * /api/calendar/:id per house, prices a chosen stay with /api/quote, and on
 * Reserve re-quotes with the guest's details and sends them to Hospitable's
 * hosted checkout; the browser never talks to Hospitable directly and the
 * site never takes payment. Emits `widget_loaded`, `dates_selected`,
 * `quote_shown` and `reserve_clicked` as bubbling DOM CustomEvents for the
 * host page's analytics. Guest details live in component state only.
 */
export function BookingWidget({ propertyId, className }: BookingWidgetProps) {
  const root = useRef<HTMLDivElement>(null);
  const priceHeading = useRef<HTMLParagraphElement>(null);

  const [catalog, setCatalog] = useState<Load<Catalog>>({ status: "loading" });
  const [activeId, setActiveId] = useState<string | undefined>(propertyId);
  const [calendar, setCalendar] = useState<Load<CalendarData>>({
    status: "loading",
  });
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [guests, setGuests] = useState<Guests>(DEFAULT_GUESTS);
  const [reload, setReload] = useState(0);
  const [calendarReload, setCalendarReload] = useState(0);
  const [form, setForm] = useState<GuestFormValues>(EMPTY_GUEST_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [reserve, setReserve] = useState<ReserveState>({ status: "idle" });

  const emit = useCallback((name: string, detail: unknown) => {
    root.current?.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true }),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getJson<PropertiesResponse>("/api/properties", controller.signal)
      .then((body) => {
        if (!body.ok) {
          setCatalog({ status: "error", message: body.message });
          return;
        }
        const data = {
          properties: body.properties,
          maxNights: body.maxNights,
          comparisonEnabled: body.comparisonEnabled,
        };
        setCatalog({ status: "ready", data });
        setActiveId((id) => id ?? data.properties[0]?.id);
        emit("widget_loaded", { properties: data.properties.map((p) => p.id) });
      })
      .catch(() => {
        /* aborted on unmount or retry */
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
        if (!body.ok) {
          setCalendar({ status: "error", message: body.message });
          return;
        }
        setCalendar({
          status: "ready",
          data: { start: body.start, end: body.end, days: body.days },
        });
      })
      .catch(() => {
        /* aborted */
      });
    return () => controller.abort();
  }, [activeId, reload, calendarReload]);

  const property =
    catalog.status === "ready"
      ? catalog.data.properties.find((p) => p.id === activeId)
      : undefined;
  // The browser clock is never consulted: "today" comes with the calendar.
  const limits = useMemo(
    () => ({
      today: calendar.status === "ready" ? calendar.data.start : "",
      maxNights: catalog.status === "ready" ? catalog.data.maxNights : 90,
    }),
    [calendar, catalog],
  );
  const dayMap = useMemo(
    () => toDayMap(calendar.status === "ready" ? calendar.data.days : []),
    [calendar],
  );
  const boundedGuests = property
    ? clampGuests(guests, {
        maxGuests: property.maxGuests,
        petsAllowed: property.petsAllowed,
      })
    : guests;

  const quote = useQuote({
    propertyId: property?.id,
    selection,
    guests: boundedGuests,
  });

  const shownQuoteId = useRef<string | null>(null);
  useEffect(() => {
    if (quote.state.status !== "ready") return;
    const q = quote.state.quote;
    if (shownQuoteId.current === q.quoteId) return;
    shownQuoteId.current = q.quoteId;
    emit("quote_shown", {
      propertyId: q.propertyId,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      total: q.total,
      currency: q.currency,
    });
  }, [quote.state, emit]);

  // Loading states are set where a fetch is triggered (here, in retry, and
  // in the initial state), never inside the effects that run the fetch.
  function switchProperty(id: string) {
    setActiveId(id);
    setCalendar({ status: "loading" });
    changeStay(EMPTY_SELECTION);
  }

  function retry() {
    setCatalog({ status: "loading" });
    setCalendar({ status: "loading" });
    setReload((n) => n + 1);
  }

  function refreshCalendar() {
    setCalendar({ status: "loading" });
    setCalendarReload((n) => n + 1);
  }

  /** Any change to the stay invalidates a pending Reserve. */
  function changeStay(next: Selection) {
    setSelection(next);
    setReserve({ status: "idle" });
  }

  function changeGuests(next: Guests) {
    setGuests(next);
    setReserve({ status: "idle" });
  }

  function onSelect(next: Selection, via: SelectVia) {
    changeStay(next);
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

  function validateForm(
    values: GuestFormValues,
  ): { ok: true; details: GuestDetails } | { ok: false; errors: FormErrors } {
    const parsed = GuestDetailsSchema.safeParse({
      ...values,
      phone: normalizePhone(values.phone) ?? values.phone,
    });
    if (parsed.success) return { ok: true, details: parsed.data };
    return { ok: false, errors: fieldErrors(parsed.error) as FormErrors };
  }

  function onFieldBlur(field: keyof GuestFormValues) {
    const result = validateForm(form);
    setFormErrors((prev) => ({
      ...prev,
      [field]: result.ok ? undefined : result.errors[field],
    }));
  }

  function goToCheckout(url: string) {
    if (!isTrustedCheckoutUrl(url)) {
      setReserve({
        status: "error",
        message:
          "We couldn't open checkout safely. Please try again or contact us.",
      });
      return;
    }
    setReserve({ status: "redirecting" });
    window.location.assign(url);
  }

  async function onReserve() {
    if (quote.state.status !== "ready" || !property) return;
    const shown = quote.state.quote;

    const result = validateForm(form);
    if (!result.ok) {
      setFormErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      root.current
        ?.querySelector<HTMLInputElement>(`input[name="${first}"]`)
        ?.focus();
      return;
    }
    setFormErrors({});

    emit("reserve_clicked", {
      propertyId: property.id,
      checkIn: shown.checkIn,
      checkOut: shown.checkOut,
      total: shown.total,
      currency: shown.currency,
    });

    // Second click after a changed total: the quote on screen already
    // carries the guest's details, so go straight to its checkout.
    if (reserve.status === "confirm") {
      goToCheckout(shown.bookingUrl);
      return;
    }

    setReserve({ status: "loading" });
    const final = await postQuote({
      propertyId: property.id,
      checkIn: shown.checkIn,
      checkOut: shown.checkOut,
      adults: boundedGuests.adults,
      children: boundedGuests.children,
      infants: boundedGuests.infants,
      pets: boundedGuests.pets,
      guestDetails: result.details,
    });

    if (!final.ok) {
      if (final.code === "UNAVAILABLE") {
        // Someone booked a night while the guest was deciding.
        refreshCalendar();
        changeStay(EMPTY_SELECTION);
        setReserve({
          status: "error",
          message:
            "Sorry — those dates were just booked. The calendar has been refreshed; please choose different dates.",
        });
        return;
      }
      setReserve({ status: "error", message: final.message });
      return;
    }

    if (final.quote.total !== shown.total) {
      quote.replace(final.quote);
      setReserve({ status: "confirm", previousTotal: shown.total });
      return;
    }
    goToCheckout(final.quote.bookingUrl);
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
                guests={boundedGuests}
                maxGuests={property.maxGuests}
                petsAllowed={property.petsAllowed}
                onChange={changeGuests}
              />
              <PricePanel
                selection={selection}
                guests={boundedGuests}
                nights={nights}
                currency={property.currency}
                previewTotal={previewTotal}
                quote={quote.state}
                reserve={reserve}
                form={
                  <GuestForm
                    values={form}
                    errors={formErrors}
                    disabled={
                      reserve.status === "loading" ||
                      reserve.status === "redirecting"
                    }
                    onChange={(values) => {
                      setForm(values);
                      if (reserve.status === "error")
                        setReserve({ status: "idle" });
                    }}
                    onBlur={onFieldBlur}
                  />
                }
                headingRef={priceHeading}
                onRetryQuote={quote.refresh}
                onClear={() => changeStay(EMPTY_SELECTION)}
              />
              <StickySummary
                label={
                  selection.checkIn && selection.checkOut
                    ? `${plural(nights, "night")} · ${formatRange(selection.checkIn, selection.checkOut)}`
                    : selection.checkIn
                      ? "Choose a check-out date"
                      : "Select dates to see price"
                }
                amount={
                  quote.state.status === "ready"
                    ? formatCents(quote.state.quote.total, property.currency)
                    : previewTotal !== null
                      ? `${formatDollars(previewTotal, property.currency)} est.`
                      : ""
                }
                reserveLabel={
                  reserve.status === "confirm"
                    ? "Reserve again"
                    : reserve.status === "loading" ||
                        reserve.status === "redirecting"
                      ? "One moment…"
                      : "Reserve"
                }
                reserveDisabled={
                  quote.state.status !== "ready" ||
                  reserve.status === "loading" ||
                  reserve.status === "redirecting"
                }
                reserveHint={
                  !selection.checkIn || !selection.checkOut
                    ? "Choose your dates first"
                    : quote.state.status === "loading"
                      ? "Pricing your stay…"
                      : quote.state.status === "error"
                        ? "We couldn't price these dates"
                        : undefined
                }
                onReserve={() => void onReserve()}
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

/*
 * Placeholder in the calendar's shape while the catalog or calendar loads.
 * It pulses so a slow response reads as loading rather than as a broken
 * widget; the visible line says what is happening. (prefers-reduced-motion
 * switches the pulse off site-wide in globals.css.)
 */
function Skeleton({ calendar = false }: { calendar?: boolean }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase">
        Loading the booking calendar…
      </p>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
        {!calendar ? <div className="h-6 w-44 bg-slot-b" /> : null}
        <div className="flex items-center justify-between gap-2">
          <div className="h-8 w-8 bg-slot-b" />
          <div className="h-4 w-32 bg-slot-b" />
          <div className="h-8 w-8 bg-slot-b" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="min-h-[2.9rem] bg-slot-a" />
          ))}
        </div>
        <div className="h-12 bg-slot-a" />
        <div className="h-16 bg-slot-a" />
      </div>
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
