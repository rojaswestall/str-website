import type { Cents } from "./types";

/*
 * Display formatting for the widget. Dates are YYYY-MM-DD strings with no
 * time zone, so they are read as UTC noon and formatted in UTC to keep the
 * calendar day from shifting on a guest's device.
 */

function at(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function formatCents(amount: Cents, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatDollars(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "Tuesday, October 27" */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(at(date));
}

/** "Oct 27" */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(at(date));
}

/** "October 2026" */
export function formatMonth(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(at(date));
}

/** "Oct 27 – Oct 29" */
export function formatRange(checkIn: string, checkOut: string): string {
  return `${formatShortDate(checkIn)} – ${formatShortDate(checkOut)}`;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
