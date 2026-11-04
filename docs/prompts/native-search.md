# Prompt: native property search (home bar + /search)

Paste everything below the line into a fresh session in `rojaswestall/str-website`.

---

You are building the site's own property search for The Austin Collection
(`rojaswestall/str-website`, Next.js 16 App Router, three Austin houses) so
that `native` mode no longer depends on Hospitable's embedded search widget.
Today the home hero mounts Hospitable's `<hospitable-direct-mps>` bar and
`/search` mounts its results view. Both are visually broken inside our layout
(fields wrap, the Search button clips) and both are a black box. In `native`
mode we already render our own booking widget on each house page; search
should match it.

Read these before writing code; they are the ground truth for how the site
works and are more current than this prompt:

- `README.md` ("The booking widget"), `docs/architecture.md` ("Booking widget
  and API", "Hospitable integration"), `docs/development.md` (env table,
  tests table, gotchas), `docs/plan.md` §1b, `CHANGELOG.md`.
- `lib/hospitable.ts` (`resolveHospitableMode`: `stub` | `hospitable` |
  `native`; `live` is an accepted alias of `hospitable`).
- `lib/booking/` — `server.ts` (`listBookingProperties`, `getCalendarWindow`
  cached 5 min, `createQuote`), `rules.ts` (`canCheckIn`, `checkOutVerdict`,
  `latestCheckOut`, `clampGuests`, `previewTotalDollars`), `dates.ts`
  (`todayInBookingZone`, `nightsOf`), `types.ts`, `config.ts`, `http.ts`,
  `client.ts`, `normalize.ts`.
- `components/booking/` (`BookingWidget`, `Calendar`, `GuestPicker`,
  `StickySummary`, `BookingAnalytics`), `components/property/BookingPanel.tsx`
  (the `connection()` + `Suspense` pattern a request-time Server Component
  needs under `cacheComponents`).
- `components/hospitable/` (`SearchWidget` server wrapper, `HospitableSearch`
  embed, `HospitableSearchStub`), `components/home/Hero.tsx` (where the bar
  mounts), `app/search/page.tsx`.
- `e2e/booking.native.spec.ts`, `e2e/mock-hospitable/server.mjs`,
  `playwright.config.ts` (the `chromium-native` project, port 3002, pinned
  env, stand-in Hospitable API on 3999).

## Rules that do not bend

These carry over from the booking-widget brief and the repo's CLAUDE.md.

- **The Hospitable token never reaches the browser, logs, or git.** Every
  Hospitable call goes through `lib/booking/client.ts` on the server.
- **Read + quote only.** No reservation, calendar, or message writes to
  Hospitable. If you think a write is needed, stop and ask.
- **The quote is the source of truth for anything the guest pays.** A search
  result may show an estimate derived from the calendar, labelled as such;
  the house page's quote is the only number presented as the price.
- **Never claim an Airbnb price as fact.** Search results do not show an
  Airbnb comparison at all; that stays in the quote on the house page.
- **If a Hospitable response contradicts this prompt, the response wins.**
- **Never change a Vercel environment variable.** Production is
  `NEXT_PUBLIC_HOSPITABLE_MODE=live` (= `hospitable`); Preview is `native`.
  The Production flip is the owner's step in `docs/plan.md` §1b.
- **Hospitable's own search is not to be called.** There is no search
  endpoint in the Public API v2; availability is computed from the three
  property calendars we already cache.
- Run every pnpm command as `npx -y pnpm@12.10.1 …`. Before every commit:
  `lint`, `typecheck`, `format:check`, `check:colors`, `check:content`,
  `test:unit`, and the relevant Playwright project(s) with `--workers=1`
  (the full suite with default workers crashes Chromium on the VPS).
- Commit as Gabe with `-c user.name="Gabe Rojas-Westall" -c user.email="rojaswestall@gmail.com"`
  on every `git commit`; never `git config`, never borrow an author. End
  commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
  and PR bodies with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Tailwind v4 token utilities only (`check:colors` enforces it); the
  existing hairline / paper / ink / muted / mono-eyebrow vocabulary; both
  themes; axe-clean. No new runtime dependencies.
- Keep `stub` and `hospitable` modes behaving exactly as today. Everything
  here is the `native` branch of the mode switch.

## Decisions already made (do not re-ask)

- **URL contract** (Hospitable's own parameter names, so links keep working
  in `hospitable` mode, where the loader reads them from the page URL):
  `/search?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2&children=0&infants=0&pets=0`.
  House pages accept the same parameters:
  `/stays/<slug>?checkin=…&checkout=…&adults=…`. Dates are ISO in
  `America/Chicago` (`BOOKING_TIME_ZONE`). Missing guest counts default to
  2 adults, 0 of everything else; unknown or invalid values are ignored, not
  errors, on the pages (the route returns `INVALID` with field errors).
- **Availability rules are the widget's rules.** A house is free for a stay
  when `canCheckIn(checkin)` holds and `checkOutVerdict(checkin, checkout)`
  is `ok`, with the same `StayLimits` (today, `MAX_NIGHTS`) the quote route
  uses, plus `adults + children <= maxGuests` and `pets === 0 ||
petsAllowed`. Do not re-implement these; import them from `rules.ts` so
  search and the calendar can never disagree.
- **Prices on results are estimates from the calendar**, computed the way
  the widget's price preview is (`previewTotalDollars`: base nightly rates ×
  direct markup, nights only, before cleaning fee and taxes), shown as
  "about $X for N nights, before fees and taxes" and "from $Y / night". No
  quote is created by a search. The real quote runs on the house page once
  the guest lands with the dates prefilled.
- **The search page server-renders its results.** No client fetch for the
  first paint: read the URL, compute, stream inside `Suspense` after
  `await connection()`, exactly like `BookingPanel`. The route exists for
  the bar's "update results without a reload" interaction and for tests.
- **Rate limits.** The availability route reads only cached calendars and
  never hits Hospitable more than the calendar route would, so it uses the
  same `lib/rateLimit.ts` key but a looser budget than `/api/quote`
  (say 60/min per client). `Cache-Control: no-store`, like the other
  booking routes.
- **Mode switch.** `SearchWidget` (server wrapper) decides: `native` →
  the new bar / results; `hospitable` → the existing embed, untouched;
  `stub` → the existing stub, untouched. The `HospitableSearchStub` and
  its tests stay as they are.
- **Three checkpoints, three PRs**, each a draft stacked on the previous
  branch, each stopping for review before the next starts. Put the
  checkpoint number in the PR title. Update `CHANGELOG.md` under
  "Unreleased" in every PR.

## Checkpoint 1 — the availability API and its test bed

Goal: one route and one pure module that answer "which houses are free for
these dates and guests, and roughly what would the nights cost", with the
stand-in Hospitable API able to serve all three houses.

1. `lib/booking/search.ts` (pure, unit-tested in `search.test.ts`):
   - `type SearchQuery = { checkIn; checkOut; adults; children; infants; pets }`.
   - `evaluateStay(property: BookingProperty, days: CalendarDay[], query, limits): StayEvaluation`
     returning `{ available: true, nights, nightly: { min, max }, estimatedNightlyTotal }`
     (all `Cents`, direct markup applied per night the way `previewTotalDollars`
     does) or `{ available: false, reason, minStay?, nights }` with `reason`
     one of `unavailable | min-stay | max-nights | closed-to-arrival |
closed-to-departure | max-guests | pets | past`. Reuse `rules.ts`;
     the only new logic is the guest and pet checks and the price fold.
   - `parseSearchQuery(params: URLSearchParams | Record<string, string | string[] | undefined>)`
     → `{ ok: true, query } | { ok: false, errors }` with zod v4, same
     style as the quote route's validation (`checkout` after `checkin`,
     `checkin` not before today, `MAX_NIGHTS`, `MAX_GUESTS` from config,
     `MAX_INFANTS`, `MAX_PETS`).
2. `lib/booking/server.ts`: `searchAvailability(query)` that reads
   `listBookingProperties()` and every house's `getCalendarWindow()` with
   `Promise.allSettled`, evaluates each, and returns
   `{ checkIn, checkOut, nights, results: SearchResult[] }` where a result
   is the public `BookingProperty` fields the card needs (`id`, `slug`,
   `name`, `bedrooms`, `bathrooms`, `maxGuests`, `petsAllowed`,
   `heroImage`, `currency`) plus the `StayEvaluation`. A house whose
   calendar failed to load is returned as `{ available: false, reason:
"unknown" }` with a `console.warn`, never as free. Add the response type
   to `types.ts` (`SearchResponse`).
3. `app/api/availability/route.ts`: `GET` only (405 otherwise), validates
   with `parseSearchQuery` → `INVALID` body with `errors`, `NOT_CONFIGURED`
   when the token is missing, `UPSTREAM` when every calendar failed,
   rate-limited, `no-store`. Reuse `lib/booking/http.ts` helpers.
4. House-page prefill, because the search hand-off needs it and it is
   server-side work: `BookingPanel` reads `checkin`, `checkout`, `adults`,
   `children`, `infants`, `pets` from the page's `searchParams` (inside the
   existing Suspense boundary; under `cacheComponents` reading them is
   request-time work, same as `connection()`), validates them leniently,
   and passes `initialSelection` / `initialGuests` to `BookingWidget`. The
   widget seeds its state from them, scrolls nothing, and if the selection
   is valid against the calendar it quotes immediately (the existing
   `useQuote` path), otherwise it drops the invalid part and shows the
   calendar with the rest. In `hospitable` mode nothing changes: Hospitable's
   loader already reads these parameters itself.
5. Stand-in API (`e2e/mock-hospitable/server.mjs`): serve **all three**
   houses on the custom site, with generated calendars that differ so the
   search has something to show: one house blocked for a fixed range each
   month, one with a 3-night minimum on Fridays and Saturdays, one with
   `pets_allowed: false` and a lower `max` guests. Keep the existing Dan
   Jean Unit A behaviour that `booking.native.spec.ts` depends on (check
   its helpers before touching day generation; the 503-on-first-calendar
   retry fixture must keep working).
6. Tests. Unit: `search.test.ts` for every `reason`, the price fold, and
   the parser. E2E, in `booking.native.spec.ts` or a new
   `search.native.spec.ts` in the `chromium-native` project: the route's
   contract (200 with three results and the expected reasons, `INVALID`
   with field errors, 405, `no-store`), and the house-page prefill (land on
   `/stays/south-austin?checkin=…&checkout=…&adults=3`, the footer shows a
   total without a click, the guest picker shows 3 adults; an invalid
   `checkout` is dropped and the calendar shows check-in selected only).
7. Docs: routes table in `docs/architecture.md`, `README.md` route list,
   `CHANGELOG.md`.

Stop here, open the draft PR, and wait for review.

## Checkpoint 2 — the home-page search bar

Goal: replace the embedded bar in the hero (the "Check dates across all
three" block) with our own, in `native` mode only.

1. `components/search/SearchBar.tsx` (client) and `components/search/index.ts`.
   It is a real `<form method="get" action="/search">` so it works before
   hydration and without JavaScript: `checkin`, `checkout` as
   `<input type="date">` with `min` set to today and `checkout`'s `min`
   following `checkin`; guests as the existing `GuestPicker` (adults,
   children, infants, pets) collapsed into one field that reads
   "2 adults" / "2 adults, 1 child" with the picker in a popover; a Search
   button. After hydration, enhance the date inputs with the existing
   `Calendar` in a popover, with no prices (prices are per house) and no
   availability (that is what the search answers), only today-forward and
   the `MAX_NIGHTS` cap. Keyboard and screen-reader complete: `role="search"`
   on the form, visible labels (the mono eyebrow style), the popover is a
   dialog that returns focus, Escape closes.
2. Layout: one row on wide screens (dates, guests, button), stacked on
   phones, inside the same hairline frame as the stub so the hero's grid
   does not move. Nothing may wrap mid-field; the button never clips its
   label. Both themes. Match the house page widget's type and spacing;
   reuse its primitives rather than inventing new ones.
3. Behaviour: submit navigates to `/search?…` with the URL contract above
   (client-side navigation when hydrated, a normal GET otherwise). Emit a
   bubbling `search_submitted` DOM event (`{ checkin, checkout, adults,
children, infants, pets }`) and add it to `BookingAnalytics`'s event
   list so it reaches Vercel as `booking_search_submitted`; wrap the bar
   in `BookingAnalytics` where it mounts.
4. Mount: `SearchWidget` picks `SearchBar` in `native` mode for
   `variant="bar"`; `Hero.tsx` keeps its mount and labels. The existing
   "Or go straight to a house" links are not on the hero; leave the hero's
   copy as it is.
5. Tests. Unit for any pure helpers (query building, guest summary text).
   E2E in `chromium-native`: the hero shows the bar and makes no request
   to Hospitable's search hosts; submitting with dates and 3 adults
   navigates to `/search` with exactly those parameters; the no-JS path
   (`javaScriptEnabled: false` context) submits the same URL; axe on `/` in
   both themes; add `/` in native mode to `visual.spec.ts`'s screenshots
   only if that spec already runs per project (check first; do not add a
   new build).
6. Docs: `docs/architecture.md` home-page section and components list,
   `README.md` events list, `CHANGELOG.md`.

Stop, draft PR, wait.

## Checkpoint 3 — the /search page

Goal: `/search` becomes a server-rendered results page in `native` mode,
with the bar on top prefilled from the URL.

1. `app/search/page.tsx` keeps its heading, lede, `noindex`, and the
   "Or go straight to a house" nav. In `native` mode it renders
   `<SearchBar variant="results" />` prefilled from `searchParams`, then
   `<Suspense fallback={<ResultsSkeleton />}><SearchResults params… /></Suspense>`
   where `SearchResults` is an async Server Component that does
   `await connection()`, parses the URL, calls `searchAvailability`, and
   renders. Without dates it renders an invitation to pick them and all
   three houses as plain cards (no availability claim). In `hospitable`
   and `stub` modes the page is unchanged.
2. `components/search/SearchResults.tsx` + `ResultCard.tsx`: one card per
   house, in content order, each with the hero photo (`next/image`, sizes
   set), name, "N bed · N bath · up to N guests", and either
   - free: "from $Y / night", "about $X for N nights, before fees and
     taxes", and a primary button "See the price and book" →
     `/stays/<slug>?checkin&checkout&adults&children&infants&pets`; or
   - not free: a one-line plain-English reason from `reason` ("Booked for
     some of those nights", "Needs a 3-night minimum on those dates",
     "Sleeps up to 4", "No pets at this house", "Those dates are in the
     past", "Couldn't check this house just now") and a ghost button
     "See the calendar" → `/stays/<slug>` with the guest parameters only.
     Free houses are listed first, then the rest; a heading line says
     "2 of 3 houses are free for Fri 12 Mar → Mon 15 Mar · 3 nights". The
     estimate copy must make clear it is not the price: the quote on the
     house page is.
3. Changing the bar on `/search` navigates to the new URL (router push
   with the new query) and the results stream again; show the skeleton
   while pending (`useTransition` or the Suspense boundary; no spinner
   library). Back/forward restore results because the URL is the state.
4. Edge cases to handle explicitly: `checkout <= checkin` or past dates
   (treat as "no dates", keep whatever is valid in the bar); more than
   `MAX_NIGHTS`; every house unavailable (say so, offer the house
   calendars); every calendar failed (`UPSTREAM`-style message, houses
   listed without claims); a house Hospitable does not list (it simply is
   not in the results, same as the booking routes).
5. Tests. E2E in `chromium-native` (`search.native.spec.ts`): the full
   path home → bar → `/search` → card → house page with the footer total
   already shown; a stay that crosses the mock's blocked range lists that
   house as not free with the right reason; a 1-night Friday stay trips
   the min-stay house; 6 adults trips the small house; `pets=1` trips the
   no-pets house; `/search` with no parameters shows the invitation and
   three cards; `/search?checkin=bad` shows the invitation with the bar
   empty; the page makes no client fetch for the first paint and no
   request to Hospitable's hosts; axe in both themes. Keep
   `hospitable.spec.ts`'s stub-mode `/search` test and the hospitable-mode
   `hospitable.live.spec.ts` test passing untouched.
6. Docs: `docs/architecture.md` (routes table row for `/search` and a
   "Search" subsection under "Booking widget and API" describing the URL
   contract, the rules reuse, and the estimate-vs-quote distinction),
   `docs/development.md` (tests table), `README.md` ("The booking widget":
   a short "Search" paragraph), `docs/plan.md` §1b (add "search bar and
   /search checked on the Preview" to the pre-flip list; the existing
   "set each house's property URL in Hospitable" item stays, it is for
   `hospitable` mode), `CHANGELOG.md`.

Stop, draft PR, wait.

## Open questions (answer before starting; defaults apply if you don't)

1. Results show calendar estimates and quote on the house page (default),
   or create a real quote per free house on every search (three POSTs,
   each a quote record in Hospitable, slower, exact)?
2. Any "next available dates" suggestion when a house is not free
   (default: no; it is a follow-up).
3. Should the no-dates `/search` also be linked from the site nav
   (default: no; it stays reachable from the hero and `noindex`).
