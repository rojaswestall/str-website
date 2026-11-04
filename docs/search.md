# Native search

The site's own property search: the bar on the home hero and the `/search`
results page, replacing Hospitable's embedded search in `native` mode only.
`hospitable` and `stub` modes keep the embed and the stub described under
"Hospitable integration" in [`architecture.md`](architecture.md). This file
is the whole story for the feature: the decisions, what is built, and what
is left. The PR that ships a checkpoint updates it.

## Why

In `native` mode the house pages render the site's own booking widget, but
the hero still mounts Hospitable's `<hospitable-direct-mps>` bar and
`/search` its results view. Both are visually broken inside the layout
(fields wrap, the Search button clips) and both are a black box. Search
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

The hero bar and `/search` still mount the embed in every mode until the
checkpoints below ship.

## Checkpoint 2 — the home-page search bar

Goal: replace the embedded bar in the hero (the "Check dates across all
three" block) with the site's own, in `native` mode only.

- [ ] `components/search/SearchBar.tsx` (client) and `components/search/index.ts`.
      A real `<form method="get" action="/search">` so it works before
      hydration and without JavaScript: `checkin` and `checkout` as
      `<input type="date">` with `min` set to today and `checkout`'s `min`
      following `checkin`; guests as the existing `GuestPicker` (adults,
      children, infants, pets) collapsed into one field that reads
      "2 adults" / "2 adults, 1 child" with the picker in a popover; a Search
      button. After hydration, enhance the date inputs with the existing
      `Calendar` in a popover, with no prices (prices are per house) and no
      availability (that is what the search answers), only today-forward
      and the `MAX_NIGHTS` cap. Keyboard and screen-reader complete:
      `role="search"` on the form, visible labels (the mono eyebrow style),
      the popover is a dialog that returns focus, Escape closes.
- [ ] Layout: one row on wide screens (dates, guests, button), stacked on
      phones, inside the same hairline frame as the stub so the hero's grid
      does not move. Nothing may wrap mid-field; the button never clips its
      label. Both themes. Match the house-page widget's type and spacing and
      reuse its primitives rather than inventing new ones.
- [ ] Behaviour: submit navigates to `/search?…` with the URL contract
      (client-side navigation when hydrated, a normal GET otherwise). Emit a
      bubbling `search_submitted` DOM event (`{ checkin, checkout, adults,
    children, infants, pets }`) and add it to `BookingAnalytics`'s event
      list so it reaches Vercel as `booking_search_submitted`; wrap the bar
      in `BookingAnalytics` where it mounts.
- [ ] Mount: `SearchWidget` picks `SearchBar` in `native` mode for the bar
      variant; `Hero.tsx` keeps its mount and labels and its copy as it is.
- [ ] Tests. Unit for any pure helpers (query building, guest summary
      text). E2E in `chromium-native`: the hero shows the bar and makes no
      request to Hospitable's search hosts; submitting with dates and 3
      adults navigates to `/search` with exactly those parameters; the
      no-JS path (`javaScriptEnabled: false` context) submits the same URL;
      axe on `/` in both themes. Add `/` in native mode to `visual.spec.ts`
      only if that spec already runs per project (check first; do not add
      a new build).
- [ ] Docs, in the same PR: this file (move the checkpoint to "Built"), the
      home-page section and components list in `architecture.md`, the
      events list in `README.md`, the tests table in `development.md`,
      `CHANGELOG.md`.

## Checkpoint 3 — the `/search` page

Goal: `/search` becomes a server-rendered results page in `native` mode,
with the bar on top prefilled from the URL.

- [ ] `app/search/page.tsx` keeps its heading, lede, `noindex`, and the
      "Or go straight to a house" nav. In `native` mode it renders the
      results variant of `SearchBar` prefilled from `searchParams`, then
      `<Suspense fallback={<ResultsSkeleton />}><SearchResults … /></Suspense>`
      where `SearchResults` is an async Server Component that does
      `await connection()`, parses the URL, calls `searchAvailability`, and
      renders. Without dates it renders an invitation to pick them and all
      three houses as plain cards (no availability claim). In `hospitable`
      and `stub` modes the page is unchanged.
- [ ] `components/search/SearchResults.tsx` and `ResultCard.tsx`: one card
      per house, in content order, each with the hero photo (`next/image`,
      `sizes` set), name, "N bed · N bath · up to N guests", and either
  - free: "from $Y / night", "about $X for N nights, before fees and
    taxes", and a primary button "See the price and book" →
    `/stays/<slug>?checkin&checkout&adults&children&infants&pets`; or
  - not free: a one-line plain-English reason from `reason` ("Booked for
    some of those nights", "Needs a 3-night minimum on those dates",
    "Sleeps up to 4", "No pets at this house", "Those dates are in the
    past", "Couldn't check this house just now") and a ghost button
    "See the calendar" → `/stays/<slug>` with the guest parameters only.

  Free houses first, then the rest; a heading line says "2 of 3 houses are
  free for Fri 12 Mar → Mon 15 Mar · 3 nights". The estimate copy must
  make clear it is not the price: the quote on the house page is.

- [ ] Changing the bar on `/search` navigates to the new URL (router push
      with the new query) and the results stream again; show the skeleton
      while pending (`useTransition` or the Suspense boundary; no spinner
      library). Back/forward restore results because the URL is the state.
- [ ] Edge cases handled explicitly: `checkout <= checkin` or past dates
      (treat as "no dates", keep whatever is valid in the bar); more than
      `MAX_NIGHTS`; every house unavailable (say so, offer the house
      calendars); every calendar failed (`UPSTREAM`-style message, houses
      listed without claims); a house Hospitable does not list (simply not
      in the results, same as the booking routes).
- [ ] Tests. E2E in `chromium-native` (`search.native.spec.ts`): the full
      path home → bar → `/search` → card → house page with the footer total
      already shown; a stay that crosses the stand-in's blocked range lists
      that house as not free with the right reason; a 1-night Friday stay
      trips the min-stay house; 6 adults trips the small house; `pets=1`
      trips the no-pets house; `/search` with no parameters shows the
      invitation and three cards; `/search?checkin=bad` shows the
      invitation with the bar empty; the page makes no client fetch for
      the first paint and no request to Hospitable's hosts; axe in both
      themes. `hospitable.spec.ts`'s stub-mode `/search` test and the
      `hospitable.live.spec.ts` test keep passing untouched.
- [ ] Docs, in the same PR: this file (move the checkpoint to "Built" and
      drop the "still mount the embed" line), `architecture.md` (the
      `/search` row in the routes table, the components list), the tests
      table in `development.md`, the "Search" paragraph in `README.md`,
      `CHANGELOG.md`. Before Production switches to `native`, the bar and
      `/search` need checking on the Preview alongside the house pages.
