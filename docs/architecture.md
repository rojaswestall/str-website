# Architecture and current state

What the site is and how it is built, as of October 2026. For running and
testing it, see [`development.md`](development.md); for what is left to do,
see [`plan.md`](plan.md).

## What the site does

A direct-booking site for three short-term rental houses in Austin (An Oak
Hill Home, South Austin Stay, Fire Side Home) run by Alexis, Gabe, and Aaron.
Booking on Airbnb adds roughly 15% in guest fees; here guests book the same
calendar through Hospitable's embeddable widgets, with Airbnb kept as a
secondary link. The look is ported from the "Keep Austin Staying" artifact
(`design/artifact.html`): warm paper palette, Newsreader headlines, IBM Plex
Sans body, IBM Plex Mono labels, plus a dark mode.

**Status:** feature-complete and green in CI; the Vercel project and custom
domain are set up. Not yet live for guests: Resend is not set up (the contact
form runs dry and delivers nothing), the CSP is still report-only, and some
copy is still `[TBC]` (rates, policies, host bios, area picks). The repo
default for Hospitable is `stub` mode; production turns on `live` through
`NEXT_PUBLIC_HOSPITABLE_MODE`. See [`plan.md`](plan.md).

## Stack and key decisions

| Area      | Choice                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16.4 App Router (Turbopack), React 19.3, `cacheComponents` and `partialPrefetching` on             |
| Language  | TypeScript 6 strict with `noUncheckedIndexedAccess` (stays on 6.x until typescript-eslint supports 7)      |
| Styling   | Tailwind v4 through the `@tailwindcss/turbopack` loader (not PostCSS); tokens in `app/globals.css`         |
| Tooling   | pnpm 12 (exact pin), Node 24 LTS, ESLint 10 flat config, Prettier with the Tailwind plugin                 |
| Content   | Typed data files in `content/`, parsed through zod 4 at import; photos in `public/photos/`                 |
| Booking   | Own widget over the Hospitable Public API, paying on Hospitable's checkout; Hospitable's embed as fallback |
| Contact   | `POST /api/contact` sends via Resend; dry run without a key                                                |
| Theme     | `next-themes` on `data-theme`, system preference plus a light / dark / system toggle                       |
| Analytics | Vercel Web Analytics (`@vercel/analytics`, cookieless)                                                     |
| Hosting   | Vercel, on the custom domain                                                                               |
| Tests     | Playwright against production builds, axe-core for accessibility                                           |

Dependencies are kept on the latest stable releases their peers support.
pnpm's default one-day `minimumReleaseAge` means a version published in the
last 24 hours resolves to the previous one; that is intended.
`pnpm-workspace.yaml` holds the build-script policy (`allowBuilds`).

## Routes

| Path                                 | File                                                  | Render     | Notes                                                                  |
| ------------------------------------ | ----------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `/`                                  | `app/page.tsx`                                        | static     | Hero, stays, area (TikToks), why book direct + form, reviews, hosts    |
| `/stays/[slug]`                      | `app/stays/[slug]/page.tsx`                           | static × 3 | `oak-hill`, `south-austin`, `fire-side`; unknown slugs 404 via proxy   |
| `/area`                              | `app/area/page.tsx`                                   | static     | Area picks with drive times from every house                           |
| `/search`                            | `app/search/page.tsx`                                 | partial    | "Check dates" results across the houses; `noindex`, not in the sitemap |
| `/api/contact`                       | `app/api/contact/route.ts`                            | dynamic    | POST only (other methods 405)                                          |
| `/api/properties`                    | `app/api/properties/route.ts`                         | dynamic    | Booking API: the bookable houses (see Booking API)                     |
| `/api/calendar/[propertyId]`         | `app/api/calendar/[propertyId]/route.ts`              | dynamic    | Booking API: availability and nightly prices                           |
| `/api/quote`                         | `app/api/quote/route.ts`                              | dynamic    | Booking API: POST, prices a stay and returns the checkout URL          |
| `/sitemap.xml`                       | `app/sitemap.ts`                                      | static     | `/`, the three stays, `/area`                                          |
| `/robots.txt`                        | `app/robots.ts`                                       | static     | Disallows `/kitchen-sink`, `/api/`, `/_404/`                           |
| `/opengraph-image`                   | `app/opengraph-image.tsx`                             | static     | Placeholder share card                                                 |
| `/stays/[slug]/opengraph-image`      | `app/stays/[slug]/opengraph-image.tsx`                | static     | Per-house share card                                                   |
| `/icon.svg`, `/icon1`, `/apple-icon` | `app/icon.svg`, `app/icon1.tsx`, `app/apple-icon.tsx` | static     | Placeholder "AC" monogram                                              |
| `/kitchen-sink`                      | `app/(dev)/kitchen-sink/`                             | dev only   | Every primitive in forced light and dark; 404 in production            |
| 404                                  | `app/not-found.tsx`                                   | —          | Branded 404 inside the site shell                                      |

`app/layout.tsx` composes `SkipLink`, `SiteHeader`, `<main id="main">`, and
`SiteFooter` inside `ThemeProvider`, with `<Analytics />` last. Pages never
render their own `<main>`. Root metadata uses the title template
`%s · The Austin Collection` and `metadataBase` from `getSiteUrl()`.

Header nav: Stays (`/#stays`), The area (`/area`), Book direct (`/#direct`),
then the theme toggle. The footer carries the colophon, a link to the
contact form (`/#direct`; there is no public email or Instagram), and the
three STR license numbers.

### Home page sections, in order

1. `components/home/Hero.tsx` — h1 from `site.tagline`, lede naming the
   hosts, 21:9 hero collage, the "check dates" search form, and `CityMap`.
2. `components/home/Stays.tsx` (`#stays`) — one `PropertyBand` per house
   (rooms only; rate, minimum nights, and amenities are on the house page).
3. `components/area/AreaGuide.tsx` (`#area`) — the TikTok row from
   `site.tiktoks` (an empty list drops it) and a link to `/area`.
4. `components/home/WhyBookDirect.tsx` (`#direct`) — pitch from
   `site.directPitch`, the "What direct booking changes" ledger, and the
   `ContactForm`.
5. `components/home/GuestReviews.tsx` (`#reviews`) — weighted average rating,
   each house's record and Airbnb link, and a timed `ReviewCarousel` of two
   quotes per house (starts paused under reduced motion).
6. `components/home/HostsStrip.tsx` — the three hosts.

### House page

`app/stays/[slug]/page.tsx`: back link, `PropertyHeader`, a phone-only "Book
direct" button, the `Gallery` carousel with an all-photos pop-up, then a
two-column grid: the copy column (description and spec strip, amenities,
guest quotes slideshow, `section#practicals` with every policy row plus the
direct-booking FAQ, `CityMap` with this house highlighted, "Near this house"
with its three closest area picks) beside a sticky `BookingPanel`
(`#book`: the Hospitable widget, "Same calendar as Airbnb, no platform fee",
and an external Airbnb link). `OtherHouses` follows. Per-house metadata,
Open Graph, canonical, and `VacationRental` JSON-LD come from
`generateMetadata` and `lib/seo.ts`.

**404 status.** With Cache Components the route keeps a fallback shell that
Next sends with status 200 before `notFound()` can run. `proxy.ts` (matcher
`/stays/:slug`) checks the slug against content and rewrites unknown ones to
`/_404/stays/<slug>`, a private path no route can own, so Next answers with a
real 404. The page still exports `instant = false` and calls `notFound()` as
the dev-mode path. Keep the `stays.spec.ts` status assertion.

## Code layout

- `app/` — routes (above) and `globals.css`.
- `components/` — grouped by area. Import UI primitives from
  `@/components/ui`; most folders have a barrel `index.ts`.
  - `ui/` — `Container`, `Section`, `SectionHead`, `Eyebrow`, `Button`,
    `Tag`/`TagList`, `SpecRow`, `Credential`, `PhotoFrame`, `Ledger`,
    `Prose`, `Tbc`, `TbcText`/`stripTbc`. Server Components styled only with
    token utilities.
  - `layout/` — `SkipLink`, `SiteHeader`, `SiteFooter`.
  - `theme/` — `ThemeProvider`, `ThemeToggle` (`data-theme-toggle`,
    `data-mode` for tests).
  - `home/`, `area/`, `practicals/`, `map/` (`CityMap`: the Apple map in
    `AppleCityMap` with its custom callout in `callout.ts` when
    `NEXT_PUBLIC_MAPKIT_TOKEN` is set, else the drawn SVG in `CitySketch`),
    `property/`
    (`PropertyBand`, `PropertyHeader`, `Gallery`, `AmenityList`, `Quotes`,
    `BookingPanel`, `PropertyCard`, `OtherHouses`, `MonoHeading`).
  - `booking/` — the site's own widget: `BookingWidget` (client; state,
    fetching, Reserve), `Calendar`, `GuestPicker`, `PricePanel`,
    `GuestForm`, `StickySummary` (the pinned total and Reserve footer),
    `useQuote` (debounced quoting), `BookingAnalytics` (DOM events →
    Vercel). See "Booking widget and API".
  - `search/` — the "check dates" search: `CheckDates` (Server Component;
    the form, or `SearchFallback` without a booking token), `SearchForm`
    (client), `SearchResults` (Server Component). See "Check dates search".
  - `hospitable/` — `PropertyWidget` (Server Component to mount) and its
    client core `HospitableWidget`, plus the stub.
  - `embeds/TikTokEmbed.tsx`, `contact/ContactForm.tsx`, `seo/`
    (`JsonLd`, `MonogramIcon`).
- `content/` — typed site content (below).
- `lib/` — non-component code: `fonts.ts` (`next/font`, self-hosted),
  `site-url.ts`, `seo.ts`, `og-font.ts`, `cx.ts`, `csp.ts`, `hospitable.ts`,
  `hooks/useInjectedScript.ts`, `rateLimit.ts` (shared by the contact and
  quote routes), `contact/` (schema, email), `booking/` (the Hospitable
  Public API client behind the booking routes, with `*.test.ts` unit tests
  and recorded responses in `__fixtures__/`).
- `proxy.ts` — the unknown-slug 404 rewrite.
- `scripts/` — `check-content.ts`, `check-colors.ts`.
- `public/photos/` — one folder per house plus `area/` and `home/`.
- `assets/fonts/` — Newsreader TTFs for the share cards (with `OFL.txt`).
- `e2e/` — Playwright specs.
- `design/artifact.html` — static visual reference; do not edit.

Conventions: Server Components by default, `"use client"` only where needed;
class names are always literal strings (Tailwind must see them; `lib/cx.ts`
joins them); property copy is never hardcoded in components.

## Content model

`content/types.ts` holds the zod schemas; the data files (`properties.ts`,
`photos.ts`, `hosts.ts`, `area.ts`, `policies.ts`, `site.ts`) are plain typed
objects; `content/index.ts` parses all of them at import, so a bad value
fails `next build` and `pnpm check:content`. **Always import from
`@/content`**, never from a data file. Accessors: `getAllProperties()`,
`getProperty(slug)` (undefined for unknown slugs), `getPropertySlugs()`,
`getHosts()`, `getAreaPicks()`, `getAreaPicksNear(slug)`, `getPolicies()`,
`getFaqs()`, `getLicenses()` (derived from the properties), `getSite()`.

- **Unconfirmed values** are `null` (rates, minimum nights, drive times) or
  strings starting with `[TBC]`. `isTbc()` detects them; `TbcText` renders
  them as a dashed "to confirm" gap with the marker stripped. Policy and FAQ
  rows carry `tbc: true` until confirmed. A `[TBC]` value never becomes a
  live link and is kept out of JSON-LD.
- **Photos**: `content/photos.ts` lists every house photo with alt text and
  real pixel sizes. Each house has `hero.jpg` (its listing cover) and
  `gallery-NN.jpg` in walk-through order with outdoor shots last
  (`check:content` enforces that from the alt text). Resized from the hosts'
  originals: 2400 px long edge for heroes, 1600 px for the gallery, JPEG q80,
  metadata stripped; frames crop to 3:2. `home/hero-collage.jpg` is the real
  21:9 collage. The 1:1 area photos are still striped placeholders.
- **Guest quotes**: three per house from Airbnb reviews in
  `content/properties.ts` (author and month optional). Ratings and review
  counts were refreshed from the listings on 2026-10-12.
- **Hospitable ids**: `site.hospitable` holds `mode` (default `stub`),
  `siteUuid`, and `theme` (`boutique`). Each property has
  `hospitable.propertyId`: Oak Hill `2338067` ("Parkwood A" in Hospitable),
  South Austin `2338069` ("Dan Jean Unit A"), Fire Side `2338068` ("Dan Jean
  B"), and `hospitable.uuid`, its Public API id used by the booking routes
  (null keeps a house out of them).
- **Map pins** are `mapPin: { x, y }` in `CitySketch`'s 400×400 viewBox, and
  `mapArea: { latitude, longitude }` on the Apple map: a neighbourhood-level
  point, never the street address (the map also caps zoom at about 2.5 km).
- **Area picks** carry an `id` (for `/area#<id>` anchors) and `driveMinutes`
  keyed by every house slug; `content/index.ts` checks ids are unique and
  every house has a time.

`pnpm check:content` additionally asserts unique slugs, a hero photo per
house, outdoor-last gallery order, that every image file exists under
`public/`, and one STR license per house.

## Design tokens and theming

`app/globals.css` defines raw light values on `:root, [data-theme="light"]`
and dark values on `[data-theme="dark"]`, mapped into Tailwind with
`@theme inline` (`bg-paper`, `text-ink-soft`, `border-hairline`,
`fill-map-water`, `font-display`, `font-mono`, `max-w-maxw`, `px-gutter`,
`max-w-measure`, ...). `dark:` is a custom variant on `[data-theme="dark"]`,
not `prefers-color-scheme`. A wrapper with either `data-theme` forces that
theme for its subtree (the kitchen sink relies on this).

Never use raw colours in `components/` or `app/`; `pnpm check:colors` fails
on hex, `rgb(`/`hsl(`/`oklch(`, and bare `white`/`black`. Exempt:
`app/globals.css` and the four files rendered outside the page's CSS that
copy the light values by hand (`app/opengraph-image.tsx`,
`app/stays/[slug]/opengraph-image.tsx`, `components/seo/MonogramIcon.tsx`,
`app/icon.svg`).

Accessibility baseline: one h1 per route, landmarks (`banner`, named
`navigation`s, `main`, `contentinfo`), alt text from content, a global
`:focus-visible` ring (2 px ink, 3 px offset), `prefers-reduced-motion`
zeroes transitions and pauses the slideshows, `PhotoFrame` dims photos with
`dark:brightness-90`. `accent` (3.3:1 on light paper) is decoration only. The dark palette is
approved as is.
axe reports zero violations on every audited page in both themes.

## Hospitable integration

`NEXT_PUBLIC_HOSPITABLE_MODE` (`stub` | `live`) overrides `site.hospitable.mode`
(`resolveHospitableMode` in `lib/hospitable.ts`). It is inlined at build time.

The dashboard snippets the code is built against (ids are in `content/`):

```html
<!-- Direct → self-hosted site: booking widget, one per house -->
<script
  src="https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js"
  data-site-uuid="a2dd8e69-2e7b-4a23-a07e-718ab1e46afb"
  data-property-id="2338068"
  data-theme="boutique"
></script>
```

**Booking widget** (house pages). The loader pings
`api.hospitable.com` (it checks the property's name is in the page text),
then inserts `<iframe id="booking-iframe">` from `booking.hospitable.com`
right after the script. Because that id is fixed, a mount must clear the old
one first. `lib/hooks/useInjectedScript.ts` appends the script into a leaf
`div` React never renders children into, defers insertion to a microtask so
strict-mode double mounts add exactly one script, and on cleanup removes the
script and empties the container, so client-side navigation between houses
remounts cleanly. Do not use `next/script` for it (it dedupes by src). The
iframe is light-only and styled only from the Hospitable dashboard.

The booking loader reads `checkin`, `checkout`, guest counts, locale, and
`utm_*` from the page URL itself, so a stay chosen in the "check dates"
search carries into the booking iframe with no extra code.

Hospitable's property search widget (`<hospitable-direct-mps>`) is no
longer used: its pickers were not keyboard-operable, it could not follow the
site theme, and its results linked back to `/search`. The site's own search
replaced it (below).

**Stubs.** In stub mode, or in live mode when an id is null, the booking
widget renders `HospitableStub` (disabled fields and an Airbnb link) and, in
live mode, `console.warn` once.

## Check dates search

The search on the home hero and `/search` is the site's own
(`components/search/`, `lib/booking/search.ts`, `lib/booking/search-server.ts`).
It needs only `HOSPITABLE_PERSONAL_ACCESS_TOKEN`, not native booking mode, so
Production can run it while the house pages still embed Hospitable's widget.
Without the token `CheckDates` renders `SearchFallback`: links to each
house's calendar.

- **Form** (`SearchForm`, client). A GET form to `/search` (`next/form`),
  with the stay in the query string under the names Hospitable's loader
  reads: `checkin`, `checkout`, `adults`, `children`, `infants`, `pets`.
  Dates and Guests are buttons with `aria-expanded` that open non-modal
  panels: the booking widget's `Calendar` over every house's calendar merged,
  and the shared `GuestRows` steppers. Escape closes a panel and returns
  focus to its field; a click outside or tabbing away closes it. Searching
  without dates says so and opens the calendar. Everything uses the theme
  tokens, so it follows the site's light/dark setting.
- **Merged calendar** (`GET /api/search/calendar`, `mergeCalendars`). A
  night is open when any house has it open; arrival and departure follow the
  most permissive open house; the minimum stay is the shortest; the price is
  the lowest direct nightly rate with the markup applied (so the calendar
  shows it with a 0% markup). Built from the same 5-minute calendar cache.
- **Results** (`SearchResults`, Server Component in a Suspense boundary on
  `/search`). `parseSearchParams` validates the query; `searchHouses` runs
  `evaluateStay` per house (capacity, pets, arrival, every night free,
  minimum stay, departure, stay cap). Free houses are cards (short name,
  Airbnb title, rooms, preview total) linking to
  `/stays/<slug>?<stay>#book`; the rest are listed with the reason. After a
  submit the results heading takes focus (`results-focus.ts`) so screen
  readers announce it.
- **House page.** The native `BookingWidget` seeds its selection and guests
  from the same parameters once its calendar is in, if the calendar still
  allows the stay; the embed's loader reads them itself.

## Contact

`POST /api/contact` (`app/api/contact/route.ts`, with `lib/contact/`):

- `schema.ts` — zod: `name` (2–80), `email`, `message` (10–2000), optional
  `property` (a known slug; `""` means General), `checkIn` / `checkOut`
  (`YYYY-MM-DD`, checkout after check-in), honeypot `website`. Strings are
  trimmed; `""` counts as absent for optional fields.
- Responses: `200 { ok: true }` (sent, dry run, or honeypot — deliberately
  indistinguishable); `400 { ok: false, message, errors }` with one message
  per field; `429` with `Retry-After`; `500` with a generic message (the
  cause is only logged). Non-JSON bodies are 400.
- `lib/rateLimit.ts` — in-memory sliding window, 5 valid inquiries per address
  per 10 minutes, keyed on the first `x-forwarded-for` entry (shared
  `unknown` bucket without it). Per instance on Vercel; Upstash is the
  documented drop-in.
- `email.ts` — Resend from `CONTACT_FROM` to `CONTACT_TO`, Reply-To the
  guest, subject `Inquiry: <house or General> — <name>`, text and simple HTML
  bodies. Without `RESEND_API_KEY` it logs
  `[contact] RESEND_API_KEY is not set; dry run` and succeeds. A key without
  the two addresses returns 500.

`components/contact/ContactForm.tsx` posts every field as-is, shows a
pending state, maps 400 errors inline (focusing the first), shows the API's
message for 429/500, and replaces itself with a thank-you on success. The
honeypot sits off-screen with `tabindex="-1"` (deliberately not
`display:none`).

## Booking widget and API

In `native` mode (`NEXT_PUBLIC_HOSPITABLE_MODE`, or `site.hospitable.mode`)
the house pages render the site's own widget instead of Hospitable's embed.
It talks only to three routes on this site, which put the Hospitable Public
API v2 behind the server so the browser never sees the access token. They
only read and quote; nothing writes reservations, calendars, or messages.

### Routes

- `GET /api/properties` — houses listed in `content/` that Hospitable also
  lists, with capacity, hero image, check-in/out times, and Hospitable's
  per-channel markups. Cached an hour per instance.
- `GET /api/calendar/:propertyId?start&end` — per day: `available`, `price`
  (Hospitable's base rate, cents), `minStay`, `closedToArrival`,
  `closedToDeparture`. The 18-month window is fetched once per house and
  cached five minutes; requests are slices of it.
- `POST /api/quote` — zod-validated, 20 per minute per client address
  (`lib/rateLimit.ts`), never cached. Returns Hospitable's totals, a nightly
  breakdown derived from the calendar and reconciled against `sub_total`,
  the hosted checkout URL, and, when the comparison is on and direct is
  cheaper, the Airbnb estimate. Errors carry a `code` (`INVALID`,
  `NOT_FOUND`, `UNAVAILABLE`, `MIN_STAY`, `MAX_NIGHTS`, `MAX_GUESTS`,
  `RATE_LIMITED`, `UPSTREAM`, `NOT_CONFIGURED`) and a message a guest can
  be shown. Guest details are forwarded, never logged or stored.
- `GET /api/admin/comparison-check?propertyId&date` — `Bearer
BOOKING_ADMIN_TOKEN`, compared in constant time; a 404 while the token is
  unset. Returns the base rate, the Airbnb estimate and the direct preview
  for one night, for checking the formula against the real host calendar.

Code is in `lib/booking/`: `config.ts` reads the environment, `client.ts`
holds the token (`server-only`), builds URLs from `HOSPITABLE_API_BASE_URL`,
times out at 12 s, and retries a GET once on a network failure, timeout,
429 or 5xx (a quote POST is never retried); `normalize.ts` maps Hospitable
payloads and the checkout-URL allow-list; `comparison.ts` is the Airbnb
formula; `rules.ts` the calendar rules; `quote-state.ts` the quote reducer;
`server.ts` ties it together, including `loadInitialBookingData` for the
first paint. Without `HOSPITABLE_PERSONAL_ACCESS_TOKEN` every route answers
`503 NOT_CONFIGURED`. Upstream calls log method, path, status, and duration
only. What the Public API actually returns (prices in integer cents,
check-in-day `min_stay`, no nightly breakdown or expiry on quotes, markups
per house) is recorded in [`hospitable-discovery.md`](hospitable-discovery.md).

### The widget

`BookingPanel` (a Server Component) wraps `<Suspense>` around an async
child that awaits `connection()`, reads the catalog and this house's
calendar in parallel through the same cached loaders the routes use, and
renders `BookingWidget` with them as `initial`. The prerendered page carries
the skeleton; the boundary streams in with the priced calendar; the widget
makes no request until the guest picks dates. If that read fails, `initial`
is omitted and the widget fetches on the client and shows its own error
states, so the server read is an optimisation, never a dependency.

Inside the widget: `Calendar` is an ARIA grid with a roving tabindex, one
month on narrow containers and two from `@xl`; every day knows whether it
can be a check-in (available, not closed to arrival, not past) and, once a
check-in is chosen, whether it is a reachable check-out (minimum stay from
the check-in day's `minStay`, no booked night crossed, within `MAX_NIGHTS`,
not closed to departure). Each day shows the direct nightly preview,
`round(base × (1 + direct markup))`. `useQuote` posts to `/api/quote` 400 ms
after the last change, cancels stale requests, and never shows a quote
against dates it was not asked for. `PricePanel` shows Hospitable's
breakdown and total (the only numbers the guest pays), the comparison line
with its disclosure, and the `GuestForm`. `StickySummary` is a permanent
footer pinned to the bottom of whatever scrolls (the page on a phone, the
booking column itself on wide screens, which is `sticky` and scrolls inside
`max-h-[calc(100vh-4rem)]`) with the running total, the struck-through
Airbnb-equivalent total when there is a saving, and the one Reserve button.

Reserve validates the form, re-quotes with `guestDetails` so Hospitable's
checkout is pre-filled, and if the total differs from the one on screen
replaces it and asks for one more click ("Reserve again"). `UNAVAILABLE`
on that final quote clears the stay and refreshes the calendar. The
redirect uses `window.location.assign` in the same tab and only to
`https://booking.hospitable.com` (`isTrustedCheckoutUrl`). The widget emits
`widget_loaded`, `dates_selected`, `quote_shown`, `comparison_shown`, and
`reserve_clicked` as bubbling `CustomEvent`s without guest details;
`BookingAnalytics` forwards them to Vercel Web Analytics as
`booking_<event>`.

### Airbnb comparison

Airbnb shows `floor(base × (1 + Airbnb markup))` per night in whole dollars
(verified against the real host calendar on three dates). The saving is
that nightly total minus Hospitable's `sub_total`; cleaning fee and taxes
are the same on both channels, so the struck-through footer figure is the
quoted total plus the saving. The line is shown only when the saving is
positive and `COMPARISON_ENABLED` is not `false`; it never states an Airbnb
price as fact, and it links to the listing. Only Dan Jean Unit A (South
Austin) has markups set in Hospitable today, so it is the only house the
comparison is right for (see [`plan.md`](plan.md)).

## SEO

`lib/seo.ts` builds every absolute URL from `getSiteUrl()` (which reads
`NEXT_PUBLIC_SITE_URL`, treats empty as unset, and falls back to
`http://localhost:3000`). It also holds the Open Graph defaults and the
`VacationRental` (per house) and `Organization` (home) JSON-LD that
`components/seo/JsonLd.tsx` renders with `<` escaped. Stay pages list their
OG images explicitly (generated card, then hero photo). Share cards use
`ImageResponse` with the vendored Newsreader TTFs read at module scope
(`lib/og-font.ts`); a network fetch does not work under Cache Components.
The ★ on the card is inline SVG because Newsreader has no star glyph.

## Content Security Policy

`lib/csp.ts` defines the policy; `next.config.ts` sends it on every path as
`Content-Security-Policy-Report-Only`. It allows the Hospitable loader and
iframes, Vercel Analytics, and TikTok's embed and CDN.
`script-src` keeps `'unsafe-inline'` because Next's static pages and
next-themes' pre-paint script are inline and a nonce would force dynamic
rendering. Switching to enforcing is a go-live item in [`plan.md`](plan.md).

## Third-party embeds

`components/embeds/TikTokEmbed.tsx` builds the `blockquote.tiktok-embed`
imperatively in a leaf container and injects `tiktok.com/embed.js` through
`useInjectedScript`, showing a styled fallback until the player appears.
Rule for any embed: the element a third-party script mutates must be a React
leaf, or React throws on unmount.
