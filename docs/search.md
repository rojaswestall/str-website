# Native search

The site's own property search: the bar on the home hero and the `/search`
results page, replacing Hospitable's embedded search in `native` mode only.
`hospitable` and `stub` modes keep the embed and the stub described under
"Hospitable integration" in [`architecture.md`](architecture.md). This file
is the whole story for the feature: the decisions and what was built, in
three checkpoints. All three have shipped; nothing is left to build.

## Why

In `native` mode the house pages render the site's own booking widget, but
the hero mounted Hospitable's `<hospitable-direct-mps>` bar and `/search`
its results view. Both were visually broken inside the layout (fields
wrapped, the Search button clipped) and both were a black box. Search
should match the widget.

## Decisions

- **URL contract.** `/search?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2&children=0&infants=0&pets=0`,
  and the same parameters on `/stays/<slug>`. They are Hospitable's own
  parameter names, so links keep working in `hospitable` mode, where the
  loader reads them from the page URL. Dates are ISO in `America/Chicago`
  (`BOOKING_TIME_ZONE`). Missing guest counts default to two adults and none
  of the rest. A page ignores an unknown or invalid value; the route answers
  `INVALID` with field errors.
- **One set of rules.** A house is free for a stay when `canCheckIn` holds
  and `checkOutVerdict` is `ok` under the same `StayLimits` the quote route
  uses, plus `adults + children ≤ maxGuests` and `pets === 0 || petsAllowed`.
  `lib/booking/search.ts` imports these from `rules.ts`; nothing
  re-implements them, so search and the calendar cannot disagree.
- **Estimates, not prices.** A result's figure is the calendar's direct
  preview folded over the nights (`round(base × (1 + direct markup))` per
  night, nights only, before cleaning fee and taxes), always labelled as an
  estimate. No quote is created by a search; the quote on the house page is
  the only number presented as the price, and the Airbnb comparison stays
  there too.
- **Server-rendered results.** `/search` reads the URL and renders results
  on the server inside `Suspense` after `await connection()`, the
  `BookingPanel` pattern; the route exists for in-page updates and tests,
  not for the first paint.
- **Rate limit.** The availability route reads cached calendars only and
  never reaches Hospitable more than the calendar route would, so it shares
  `lib/rateLimit.ts` with a looser budget than `/api/quote` (60 a minute per
  client) and is `no-store`.
- **Mode switch.** `SearchWidget` (the server wrapper in
  `components/hospitable/`) picks the native bar or results, the embed, or
  the stub by mode; the embed and stub components and their tests stay as
  they are.
- **Hospitable's search is never called.** There is no search endpoint in
  the Public API v2; availability comes from the three cached calendars.
- **Three checkpoints, three PRs**, each stacked on the previous branch and
  reviewed before the next starts; the checkpoint number goes in the PR
  title and every PR adds to `CHANGELOG.md` under "Unreleased". The rules
  for booking code in [`development.md`](development.md) apply throughout.

Open questions, with the defaults that apply unless a host decides
otherwise:

- Results show calendar estimates and the house page quotes (default), or
  every search creates a real quote per free house (three POSTs, each a
  quote record in Hospitable, slower, exact)?
- A "next available dates" suggestion when a house is not free: default no;
  a follow-up.
- Linking the no-dates `/search` from the site nav: default no; it stays
  reachable from the hero and `noindex`.

## Built

**Checkpoint 1 (#46).** `GET /api/availability` and `lib/booking/search.ts`
(`evaluateStay`, `parseSearchQuery`), `searchAvailability` in
`lib/booking/server.ts`, the house-page prefill from the URL contract
(`BookingPanel` → `BookingWidget`), the stand-in Hospitable API serving all
three houses with calendars that differ, `search.test.ts` and
`search.native.spec.ts`. The route and the prefill are described under
"Booking widget and API" in [`architecture.md`](architecture.md); the
stand-in and the specs under "End-to-end" in
[`development.md`](development.md).

**Checkpoint 2 (#49).** The home-page search bar: `components/search/SearchBar.tsx`
(client) and `index.ts`, mounted by `SearchWidget` for the bar variant in
`native` mode inside `BookingAnalytics`, in the prerendered HTML. Today's
date comes from `cachedToday` (`lib/booking/today.ts`, a `"use cache"`
function with the `hours` profile) rather than `connection()`: a streamed
Suspense boundary is only revealed by a script, so a form inside one would
never show without JavaScript, and the cached date keeps `/` static (the
floor can trail by up to an hour after midnight in Austin; `/search` and the
house pages judge the dates again). It is a real
`<form role="search" method="get" action="/search">`
with Hospitable's parameter names, so it works before hydration and without
JavaScript: `<input type="date">` fields with `min` set to today, and a
`<details>` of number inputs for the guests. Hydrated, the same form swaps
those for hidden inputs behind three fields that open the widget's own
`Calendar` (no prices and no availability, `showPrices={false}` over
`openDays`, only today-forward and `MAX_NIGHTS`) and `GuestPicker`
(`alwaysOpen`) in a non-modal dialog: Escape or picking the check-out closes
it and returns focus to the field, a click or Tab outside closes it in
place; submit is a client-side navigation to the identical URL
(`searchHref`), after a bubbling `search_submitted` event that
`BookingAnalytics` forwards as `booking_search_submitted`. One row from
32rem of container width, two columns from 24rem, stacked below, in the
stub's hairline frame; the popovers are grid children, inline on a narrow
container and floated under the row on a wide one. `guestSummary`,
`searchQueryString`/`searchHref` and `openDays` in `lib/booking/search.ts`
are unit-tested; the bar's e2e tests are the "home-page search bar" block of
`search.native.spec.ts` (no request to Hospitable's hosts, the hydrated and
the no-JavaScript submit landing on the same URL, axe in both themes with
the picker open). `visual.spec.ts` runs in the stub project only, so `/` in
native mode was not added to it. `Hero.tsx` is unchanged.

**Checkpoint 3.** The `/search` page: in `native` mode `SearchWidget`'s
results variant renders the bar prefilled from the URL over `SearchResults`
(`components/search/SearchResults.tsx`, with `ResultCard.tsx`), an async
Server Component that awaits `connection()`, reads the URL with
`parseSearchPage` and calls `searchAvailability` directly, each half in its
own `Suspense` boundary with the empty bar and `ResultsSkeleton` prerendered
as fallbacks. Free houses come first with the estimate and "See the price
and book" (the whole stay to the house page), the rest with the reason
(`refusalText`) and "See the calendar"; anything short of a whole, future
stay within `MAX_NIGHTS` is an invitation over three plain cards, and when
nothing could be checked the houses are listed with no claim. A new search
from the bar is a transition that shows the skeleton while pending
(`data-pending` on the form), and the bar adopts the URL when it changes
under it, so back and forward restore both. Two things differ from the
checklist this replaced: the headline's dates are month-first ("Fri, Mar 12
→ Mon, Mar 15 · 3 nights"), as the bar and the widget write them, and
without JavaScript `/search` shows no results (a streamed boundary needs a
script), only a `noscript` line pointing at the house links. The page is
described under "Search" in [`architecture.md`](architecture.md); its tests
are the "/search results page" block of `search.native.spec.ts` and
`search.test.ts`. The "couldn't check" state is not covered end to end (the
stand-in cannot fail once its calendars are cached); it was checked by hand
against a dead upstream and with no token.

Before Production switches to `native`, the bar and `/search` need checking
on the Preview alongside the house pages.
