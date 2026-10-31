# The Austin Collection

Direct-booking website for three short-term rental houses in Austin, Texas,
run by Alexis, Gabe, and Aaron. Guests pick dates and see a price on the
site's own booking widget, then pay on Hospitable's hosted checkout; Airbnb
stays available as a secondary link.

**Status:** built and green in CI, with the Vercel project and domain set
up. The native widget runs on Vercel Preview; Production still embeds
Hospitable's widget until the go-live steps in [`docs/plan.md`](docs/plan.md)
are done. Resend (contact email), the enforcing CSP, and the content still to
confirm are there too. Changes are listed in [`CHANGELOG.md`](CHANGELOG.md).

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript strict,
Tailwind v4, zod content, pnpm, ESLint, Prettier, Playwright with axe-core.
Deploys to Vercel with Vercel Web Analytics.

## Quick start

Requires Node 24 (`nvm use`) and pnpm 12 (pinned in `package.json`).

```bash
pnpm install
pnpm dev                                   # http://localhost:3000
```

No environment variables are needed locally: the Hospitable widgets render
placeholder panels and the contact form runs dry. To run the full test suite:

```bash
pnpm exec playwright install chromium     # once
pnpm test:unit                             # 76 unit tests, no server
pnpm test                                  # builds three times, runs 90 e2e tests
```

What CI runs, in order:

```bash
pnpm check:content && pnpm check:colors && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:unit && pnpm test
```

## The booking widget

`components/booking/` is a self-hosted booking widget over the Hospitable
Public API v2. Hospitable still takes the payment: the widget prices a stay
and hands the guest to `booking.hospitable.com`.

**How pricing flows.** `GET /api/calendar/:propertyId` returns Hospitable's
base nightly rates; the calendar shows each night at the _direct_ price,
`round(base × (1 + direct markup))`, so the guest sees what they would pay
before choosing. Once check-in and check-out are set, `POST /api/quote`
asks Hospitable for a quote; **that quote is the only source of truth for
anything the guest pays** — nights, cleaning fee, taxes, total, and the
checkout URL all come from it, and the widget never adds or adjusts an
amount. Reserve re-quotes with the guest's details (so checkout is
pre-filled), asks for a second click if the total moved, and then redirects.
The Airbnb line is an estimate from the same base rates and the house's
_Airbnb_ markup, `floor(base × (1 + airbnb markup))` per night as Airbnb
displays it; it is shown only when direct is cheaper, labelled as an
estimate, and linked to the listing so a guest can check.

**Markups** come from Hospitable (each property's `listing_markups`, per
channel). To change what guests pay, change the direct markup in
Hospitable; to change the comparison, change the Airbnb markup there.
`DIRECT_MARKUP_PCT` / `AIRBNB_MARKUP_PCT` are only fallbacks for a house
whose markups Hospitable has not set. Verify the Airbnb estimate against the
real host calendar for a date with:

```bash
curl -H "Authorization: Bearer $BOOKING_ADMIN_TOKEN" "https://<domain>/api/admin/comparison-check?propertyId=<uuid>&date=2027-03-12"
```

**Mounting.** `NEXT_PUBLIC_HOSPITABLE_MODE=native` makes `BookingPanel`
render `<BookingWidget propertyId={uuid} />` on each house page, seeded with
the catalog and calendar read on the server so the first HTML already holds
the priced calendar. `<BookingWidget />` with no `propertyId` renders a
switcher over every bookable house. It emits bubbling DOM `CustomEvent`s
(`widget_loaded`, `dates_selected`, `quote_shown`, `comparison_shown`,
`reserve_clicked`) that `BookingAnalytics` forwards to Vercel Web Analytics.

**Rules the code keeps.** The access token is read in `lib/booking/client.ts`
only (`server-only`), never logged, never sent to the browser, never in git
(`.env*` is ignored). The routes read and quote only: no reservation,
calendar, or message is ever written. Redirects go only to
`https://booking.hospitable.com`. Guest details are forwarded to Hospitable
in the quote and never logged or stored. Environment variables are listed
in [`.env.example`](.env.example) and explained in
[`docs/development.md`](docs/development.md).

## Documentation

- [`docs/development.md`](docs/development.md) — setup, environment
  variables, scripts, the test suite and its gotchas, CI, and how to edit
  content.
- [`docs/architecture.md`](docs/architecture.md) — what is built: routes,
  components, the content model, theming, the Hospitable integration, the
  contact API, the booking widget and API, SEO, and the CSP.
- [`docs/hospitable-discovery.md`](docs/hospitable-discovery.md) — what the
  Hospitable Public API returns, verified against the live account.
- [`docs/plan.md`](docs/plan.md) — remaining work only: go-live checklist,
  `[TBC]` content, open decisions, engineering follow-ups.
- `design/artifact.html` — the static visual reference. Open it in a
  browser; do not edit it.
- `AGENTS.md` — pointer for coding agents to the Next 16 docs bundled in
  `node_modules/next/dist/docs/`.
