/*
 * Calendar dates as `YYYY-MM-DD` strings. A stay is a check-in date and a
 * check-out date; the nights are the dates from check-in up to, not
 * including, check-out. "Today" is the hosts' local date in Austin.
 */

export const BOOKING_TIME_ZONE = "America/Chicago";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** The current date in the booking time zone. */
export function todayInBookingZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Same day-of-month `months` later, clamped to the last day of that month. */
export function addMonths(iso: string, months: number): string {
  const date = toUtc(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return fromUtc(date);
}

/** Nights between two dates; negative when `checkOut` is before `checkIn`. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (toUtc(checkOut).getTime() - toUtc(checkIn).getTime()) / 86_400_000,
  );
}

/** The dates of each night of a stay: check-in through the day before check-out. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const count = nightsBetween(checkIn, checkOut);
  const nights: string[] = [];
  for (let i = 0; i < count; i++) nights.push(addDays(checkIn, i));
  return nights;
}
