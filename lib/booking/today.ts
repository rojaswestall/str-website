import { cacheLife } from "next/cache";

import { todayInBookingZone } from "./dates";

/*
 * Today's date for a prerendered page: the floor of the home-page search
 * bar's picker and the `min` of its no-JavaScript date inputs.
 *
 * The clock is request-time data under Cache Components, and the booking
 * widget reads it after `connection()` inside a Suspense boundary. The
 * search bar cannot: React reveals a streamed boundary with a script, so a
 * form inside one is never shown without JavaScript, and the home page is
 * otherwise static. Caching the date with the `hours` profile (revalidated
 * in the background after an hour, part of the static shell) keeps the page
 * static and the form in the first HTML. Just after midnight in Austin the
 * floor can trail by up to an hour; `/search` and the house pages judge the
 * dates again against the live calendar, so nothing is sold on it.
 */
export async function cachedToday(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return todayInBookingZone();
}
