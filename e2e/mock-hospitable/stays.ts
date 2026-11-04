/*
 * Date helpers for the native-mode specs, matched to the stand-in's
 * generated calendars (server.mjs): South Austin has the 10th–12th of each
 * month reserved and the 20th closed to check-in, Oak Hill needs three
 * nights from a Friday or Saturday check-in. Everything is computed from
 * today in Austin so the specs never age.
 */

export const OAK_HILL = "2bfb62de-2f47-409f-b276-a47d5b405043";
export const DAN_JEAN_A = "02f700e5-a510-4c4f-b9f6-9d4bebdf499a";
export const FIRE_SIDE = "cb8bcbdd-75f6-49f4-b9a5-cea0b8df861d";
/** Served by the stand-in, unknown to content, so it must never appear. */
export const STRANGER = "9d1f5b1e-6c2a-4b8e-9a3f-0d6c1e2f3a4b";

export function todayInAustin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** True when no night of the stay, nor the check-out morning, touches the 10th–12th or a check-in on the 20th. */
function clearOfSouthAustinBlocks(checkIn: string, nights: number): boolean {
  for (let i = 0; i <= nights; i++) {
    const dom = dayOfMonth(addDays(checkIn, i));
    if (dom >= 10 && dom <= 12) return false;
  }
  return dayOfMonth(checkIn) !== 20;
}

/** Monday → Thursday, all clear of the stand-in's reserved and closed days. */
export function pickWeekdayStay(today: string): {
  checkIn: string;
  checkOut: string;
} {
  let date = addDays(today, 2);
  for (let i = 0; i < 60; i++, date = addDays(date, 1)) {
    if (weekday(date) !== 1) continue;
    if (clearOfSouthAustinBlocks(date, 3)) {
      return { checkIn: date, checkOut: addDays(date, 3) };
    }
  }
  throw new Error("no clear weekday stay found");
}

/** Friday → Sunday, two nights, clear of the reserved and closed days. */
export function pickWeekendStay(today: string): {
  checkIn: string;
  checkOut: string;
} {
  let date = addDays(today, 2);
  for (let i = 0; i < 60; i++, date = addDays(date, 1)) {
    if (weekday(date) !== 5) continue;
    if (clearOfSouthAustinBlocks(date, 2)) {
      return { checkIn: date, checkOut: addDays(date, 2) };
    }
  }
  throw new Error("no clear weekend stay found");
}

/** The first of the 10th–12th run that is still ahead of today. */
export function nextReservedDay(today: string): string {
  let date = addDays(today, 1);
  for (let i = 0; i < 40; i++, date = addDays(date, 1)) {
    if (dayOfMonth(date) === 11) return date;
  }
  throw new Error("unreachable");
}

/** The next `dom`-th of a month strictly after today. */
export function nextDayOfMonth(today: string, dom: number): string {
  let date = addDays(today, 1);
  for (let i = 0; i < 40; i++, date = addDays(date, 1)) {
    if (dayOfMonth(date) === dom) return date;
  }
  throw new Error("unreachable");
}
