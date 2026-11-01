# Changelog

Notable changes to The Austin Collection site. Dates are when the pull
request merged to `main`. The direct-booking widget shipped in five
checkpoints, each its own PR, so a reader can see what each one added.

## Unreleased — the site's own "check dates" search

- **Replaces Hospitable's property search widget** on the home hero and
  `/search`. The embed's location, date and guest pickers could not be
  operated by keyboard, it had no labels for screen readers, failed colour
  contrast, stayed white in dark mode, showed the street addresses, and its
  results linked back to `/search` instead of the house pages.
- **The new search** is site markup in theme colours: Dates and Guests
  buttons open panels with the booking widget's accessible calendar (every
  house's calendar merged, `GET /api/search/calendar`) and guest steppers.
  Escape and click-outside close them and focus returns to the field;
  searching without dates explains what is missing.
- **Results on `/search`** are read on the server: a card per free house
  with a preview total and "Book these dates", which opens the house page on
  that stay (the native widget seeds it from the URL; the embed's loader
  reads the same parameters). Houses that don't fit say why (booked, minimum
  stay, too many guests, no pets). The results heading takes focus after a
  search.
- **Airbnb listing titles** appear as a subtitle under each house name on
  the home cards, house bands, house pages and search results.
- Needs only `HOSPITABLE_PERSONAL_ACCESS_TOKEN`; without it the search
  shows links to the three houses. The `hospitable.b-cdn.net` entries are
  gone from the CSP and `site.hospitable.searchWidgetId` from content.

## Unreleased — direct-booking widget, checkpoint 5: hardening and docs

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
