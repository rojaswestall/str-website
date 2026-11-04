# Changelog

Notable changes to The Austin Collection site. Dates are when the pull
request merged to `main`. The direct-booking widget shipped in five
checkpoints, each its own PR, so a reader can see what each one added.

## Unreleased — native search, checkpoint 2: the home-page search bar

The second of three checkpoints replacing Hospitable's embedded search with
the site's own, in `native` mode only (`docs/search.md`). `stub` and
`hospitable` modes are unchanged; `/search` still mounts the embed until
checkpoint 3.

- **The hero's search bar is the site's own in `native` mode.**
  `components/search/SearchBar.tsx`, mounted by `SearchWidget` in place of
  `<hospitable-direct-mps>`: a real GET form to `/search` in the URL
  contract's parameter names, so it works before hydration and without
  JavaScript (date inputs with `min` set to today, a disclosure of number
  inputs for the guests). Hydrated, the fields open the booking widget's own
  `Calendar` (dates only: no prices, no availability, today-forward and
  `MAX_NIGHTS`) and `GuestPicker` in a non-modal dialog that closes on
  Escape and returns focus, and submit is a client-side navigation to the
  identical URL. One row on a wide container, stacked on a phone, in the
  stub's hairline frame; both themes; axe-clean with the picker open.
- **`search_submitted`** joins the booking events `BookingAnalytics`
  forwards to Vercel, as `booking_search_submitted`, with the six
  parameters and nothing else.
- **Prerendered, not streamed.** The bar's floor, today's date, is a
  `"use cache"` value with the `hours` profile (`lib/booking/today.ts`)
  rather than a `connection()` read: a streamed Suspense boundary is only
  revealed by a script, so the form has to be in the static HTML to work
  without JavaScript. `/` stays static in every mode.
- **Widget pieces grew small options** for the bar: `Calendar`'s
  `showPrices`, `GuestPicker`'s `alwaysOpen`; `CALENDAR_WINDOW_MONTHS` moved
  to `lib/booking/dates.ts` (still exported from `server.ts`).
- **Tests.** `guestSummary`, `searchQueryString`/`searchHref` and `openDays`
  in `search.test.ts`; the bar end to end in `search.native.spec.ts`,
  including a `javaScriptEnabled: false` context.

## Unreleased — checkpoint 1 written up to the documentation pattern

- Docs only. `docs/architecture.md` no longer says the widget's API is
  "three routes", and the `/api/availability` entry now records what a
  result carries and the bounds the query is held to. `docs/development.md`
  gains the search in the `MAX_NIGHTS` row, the right e2e count, and two
  gotchas learned building checkpoint 1 (another worktree's `next start`
  masquerading as your build; the availability limit test and reused
  servers).

## Unreleased — the docs are the brief

- The native-search brief moved out of `docs/prompts/` into
  `docs/search.md`, the feature's doc: decisions, what is built, the
  remaining checkpoints and open questions. The rules for booking code are
  under "Working on the booking code" in `docs/development.md`, and a new
  "Documentation" section there says which file each kind of change is
  written up in. `docs/plan.md` is the original go-live checklist and is
  no longer maintained. There are no prompt files.

## 2026-11-04 — native search, checkpoint 1: availability API and house-page prefill (#46)

The first of three checkpoints replacing Hospitable's embedded search with
the site's own, in `native` mode only (the remaining two are specified in
`docs/search.md`). `stub` and `hospitable` modes are unchanged.

- **`GET /api/availability?checkin&checkout&adults&children&infants&pets`.**
  Which of the three houses are free for a stay, judged from the cached
  calendars by the widget's own rules (`lib/booking/search.ts` imports them
  from `rules.ts`, so search and calendar cannot disagree) plus capacity and
  pets, with an estimate of the nights at the calendar's direct preview,
  labelled as such and never presented as the price. Hospitable has no
  search endpoint and none is called; no quote is created by a search. A
  house whose calendar could not be read is reported `unknown`, never free.
  60 per minute per client, `no-store`.
- **House pages accept the same parameters.** `/stays/<slug>?checkin=…&checkout=…&adults=…`
  prefills the widget: a stay the calendar allows is quoted on arrival, a
  check-out the calendar refuses is dropped and the check-in kept, a bad or
  past value is ignored. In `hospitable` mode nothing changes; the embed
  reads these parameters itself.
- **Test bed.** The stand-in Hospitable API now serves all three houses with
  calendars that differ (a monthly blocked range, a weekend 3-night minimum,
  a no-pets house that sleeps four) plus a property content does not list,
  which the server filters out. `search.native.spec.ts` covers the route and
  the prefill; `search.test.ts` the rules and the URL parsing.

## 2026-10-31 — direct-booking widget, checkpoint 5: hardening and docs (#40, mode rename #45 on 2026-11-04)

- **First paint from the server.** In native mode the house page now reads
  the catalog and the house's calendar on the server and renders the priced
  calendar into the HTML; the widget makes no request until the guest picks
  dates. Before, two round trips ran after hydration.
- **Retries where they are safe.** The Hospitable client retries a GET once
  after a dropped connection, timeout, 429 or 5xx (never a quote POST); the
  browser retries a GET to our own routes once on a network failure.
- **Analytics.** `BookingAnalytics` forwards the widget's DOM events to
  Vercel Web Analytics as `booking_widget_loaded`, `booking_dates_selected`,
  `booking_quote_shown`, `booking_comparison_shown`, `booking_reserve_clicked`.
- **End-to-end coverage.** A third Playwright project builds the site in
  native mode against a stand-in Hospitable API (`e2e/mock-hospitable/`)
  and drives the widget and routes end to end; CI runs it on every PR.
- **Docs.** README section on the widget, `docs/architecture.md` and
  `docs/development.md` brought up to date, go-live steps for switching
  Production to the native widget in `docs/plan.md`.
- **Mode renamed.** `NEXT_PUBLIC_HOSPITABLE_MODE=live` is now `hospitable`,
  so the three values name what renders: `stub`, `hospitable` (the embedded
  widget) or `native` (the site's own). `live` still resolves to
  `hospitable`, so an un-updated Vercel environment is unaffected.

## 2026-10-31 — checkpoint 4: Airbnb price comparison (#39)

- "Book direct and save $X vs. Airbnb" under the quote, from the house's
  configured Airbnb markup (`floor(base × (1 + markup))` per night, verified
  against the real host calendar on three dates), with a "How we estimate
  this" disclosure and a link to the listing. Hidden when the saving is not
  positive or `COMPARISON_ENABLED=false`.
- The footer shows the Airbnb-equivalent total struck through next to the
  real total, with "$X saved vs booking on Airbnb" beneath.
- `GET /api/admin/comparison-check?propertyId&date`, behind
  `BOOKING_ADMIN_TOKEN`, for spot-checking the estimate by eye.

## 2026-10-31 — checkpoint 3: quote and hand-off to checkout (#38)

- Choosing a stay prices it with `POST /api/quote` (debounced, cancelling
  stale requests); the panel shows Hospitable's breakdown and total.
- Guest details form; Reserve re-quotes with the details, asks for a second
  click if the total changed, and sends the guest to Hospitable's hosted
  checkout (`booking.hospitable.com` only) in the same tab. Nights booked
  meanwhile clear the stay and refresh the calendar.
- A permanent footer pins the running total and the one Reserve button to
  the bottom of the widget on every screen size, pulsing while a quote is
  in flight.

## 2026-10-30 — checkpoint 2: widget UI (#37)

- `components/booking/`: calendar range picker with nightly direct prices,
  min-stay and blocked-night rules, keyboard navigation and ARIA grid
  semantics; guest picker; price panel; dark mode; 360px layout.
- `NEXT_PUBLIC_HOSPITABLE_MODE=native` renders it in place of the embedded
  Hospitable widget. Vercel Preview runs native; Production stays `live`.

## 2026-10-25 — checkpoints 0–1: discovery and the booking API (#36)

- `GET /api/properties`, `GET /api/calendar/:propertyId`, `POST /api/quote`
  over the Hospitable Public API v2, with the token held server-side only,
  zod-validated input, a per-address rate limit on quotes, structured
  `{ ok, code, message }` errors, caching, and logging that never includes a
  body.
- Unit tests over recorded Hospitable responses (`lib/booking/__fixtures__/`,
  redacted); findings in `docs/hospitable-discovery.md`.
