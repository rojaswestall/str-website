# The Austin Collection — remaining work

Steps 1–13 of the original plan (scaffold through test suite and CI) are
merged, as are the code parts of step 14 that did not need a live domain: all
three Hospitable property ids, the property search widget on the home hero and
`/search`, real house photos, guest quotes, and the `/area` guide. What the
site looks like today is in [`architecture.md`](architecture.md); how to run
and test it is in [`development.md`](development.md).

This file now lists only what is **not done yet**, including the spec for
work that is scoped but not started (§1c). It is the brief: a session or a
person picking up an item reads it here and in the docs it points at, not in
a prompt file. Remove an item when it ships, in the same PR, and describe
what shipped in [`architecture.md`](architecture.md) and `CHANGELOG.md`
(see "Documentation" in [`development.md`](development.md)).

Design reference: `design/artifact.html` (static, do not edit). Original
artifact: https://claude.ai/artifact/8bKWdaGXgFA41g5RrFBa32.

## 1. Go live (needs a human with Vercel, Hospitable, and Resend access)

Done: the Vercel project and the custom domain. Do the rest in order; each
later item depends on the earlier ones.

- [ ] **Resend.** Create the account, verify the sending domain, pick the
      `from` address (it must be on that domain), and decide the recipients
      (all three hosts or one shared inbox).
- [ ] **Vercel environment variables.** Add the three Resend values, and
      confirm the rest are set as below (and Web Analytics is enabled):

  | Variable                      | Production              | Preview                    |
  | ----------------------------- | ----------------------- | -------------------------- |
  | `NEXT_PUBLIC_SITE_URL`        | `https://<domain>`      | the preview origin or prod |
  | `NEXT_PUBLIC_HOSPITABLE_MODE` | `hospitable` → `native` (1b)  | `native`                   |
  | `RESEND_API_KEY`              | Resend key              | optional (dry run without) |
  | `CONTACT_FROM`                | `Name <addr@<domain>>`  | same as prod if key set    |
  | `CONTACT_TO`                  | comma-separated inboxes | same as prod if key set    |

  | `HOSPITABLE_PERSONAL_ACCESS_TOKEN` | Public API token | same (the native widget needs it) |
  | `HOSPITABLE_CUSTOM_SITE_ID`   | the widget's site uuid  | same                       |
  | `BOOKING_ADMIN_TOKEN`         | `openssl rand -hex 24`  | same or unset              |

  `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing
  them. Without `NEXT_PUBLIC_SITE_URL` every canonical, sitemap, OG, and
  JSON-LD URL says `http://localhost:3000`. Set all three Resend values
  together; a key without the two addresses makes `/api/contact` answer 500.
  Until then the form answers success but only logs each inquiry
  (`[contact] RESEND_API_KEY is not set; dry run` in the function log), so
  messages sent through the live site are not delivered.

- [ ] **Hospitable dashboard.**
  - [ ] Confirm the plan includes Direct with self-hosted widgets, and that
        Stripe/payments are set up in Hospitable Direct.
  - [ ] Set each house's property URL (where a search result links) to
        `https://<domain>/stays/oak-hill`, `/stays/south-austin`, and
        `/stays/fire-side`.
  - [ ] Style the widgets to match the paper palette (the booking iframe is
        styled only from the dashboard).
  - [ ] The loader's ping checks that the property's Hospitable name appears
        in the page text. If the live widget refuses to load on a house,
        compare its Hospitable listing name with `name` in
        `content/properties.ts`.
- [ ] **Apple Maps token.** Once the Apple Developer membership is active:
      Certificates, Identifiers & Profiles → Services → Maps → Tokens → (+),
      type **MapKit JS**, restriction **Domain** (the production domain,
      the Vercel preview domain, and `localhost` if wanted). Set it as
      `NEXT_PUBLIC_MAPKIT_TOKEN` for Production (and Preview) and redeploy.
      Until then the city map is the drawn SVG. Check the three `mapArea`
      positions in `content/properties.ts` look right on the real map.
- [ ] **CSP to enforcing.** Deploy with the current report-only header, open
      `/`, `/search`, `/area`, each `/stays/<slug>`, and a 404 on the
      production domain with the live widgets, and collect console
      violations. Add any missing origins to `lib/csp.ts`, drop the Google
      Fonts entries if nothing reports them (fonts are self-hosted), then
      change the header key in `next.config.ts` from
      `CSP_REPORT_ONLY_HEADER` to `Content-Security-Policy`. Update
      `e2e/hospitable.spec.ts`, which asserts the report-only header and no
      enforcing one.
- [ ] **Verify on the production domain.**
  - [ ] A test booking reaches Hospitable checkout on all three house pages
        (with the native widget, see 1b; with the embed, through the iframe).
  - [ ] The hero search bar submits to `/search` and results link to the
        right house pages.
  - [ ] One real inquiry through the contact form arrives with the guest as
        Reply-To and subject `Inquiry: <house> — <name>`
        (`[contact] send failed:` in the function log names a Resend error).
  - [ ] No CSP violations in the console on any page.
  - [ ] Sitemap `<loc>`s, canonical, `og:image`, and JSON-LD `url`/`image`
        all carry the real `https://` origin.
  - [ ] Theme toggle persists; analytics events appear in Vercel.
  - [ ] Run axe (browser extension) on a stay page with the real booking
        iframe and confirm the iframe has a title; confirm the TikTok
        fallback hides once the player loads and the player does not trap
        keyboard focus. CI never loads either third party.
  - [ ] Re-scrape `/` and the three stay pages in the Facebook Sharing
        Debugger, X card validator, and Slack once the final share cards
        exist (stay OG image URLs carry no cache-busting hash).

## 1b. Switch Production to the native booking widget

The widget, routes, comparison, admin check, e2e coverage and docs are all
merged (#36–#39 and the hardening PR; see "Booking widget and API" in
[`architecture.md`](architecture.md) and `CHANGELOG.md`). Vercel Preview
already runs `NEXT_PUBLIC_HOSPITABLE_MODE=native`. Production still embeds
Hospitable's widget; flipping it is a deliberate step, in this order, and
only with a go from the hosts.

- [x] **Hospitable markups.** All three houses are listed on the Direct
      site with direct 11% / Airbnb 15.5% markups (checked 2026-11-03), so
      the price comparison is right for every house.
- [ ] **Hospitable (human).**
      Check the Direct site's booking settings: the checkout currently says
      "This booking is non-refundable once accepted" while the API reports
      a refund-within-24-hours policy, and bookings are "Request to book"
      (the host must accept each one) rather than instant — decide both.
- [ ] **One real test booking on the Preview.** Pick Dan Jean Unit A,
      reserve with a real card, accept the request in Hospitable, confirm
      the reservation, the confirmation email, the lock code and the
      cleaner task all fire, then cancel and refund it in Hospitable.
- [ ] **Spot-check the comparison.** With `BOOKING_ADMIN_TOKEN` set on the
      Preview, call `/api/admin/comparison-check?propertyId=<uuid>&date=…`
      for two or three dates and compare `airbnbEstimate` with the Airbnb
      host calendar. A mismatch means the Airbnb markup in Hospitable has
      changed; the formula itself was verified on Nov 2 2026, Dec 31 2026
      and Feb 25 2027.
- [ ] **Vercel Production env.** `HOSPITABLE_PERSONAL_ACCESS_TOKEN`,
      `HOSPITABLE_CUSTOM_SITE_ID` and `BOOKING_ADMIN_TOKEN` present;
      `COMPARISON_ENABLED` unset or `true`. Production's
      `NEXT_PUBLIC_HOSPITABLE_MODE` is still the old value `live`, which the
      code treats as `hospitable`; change it to `hospitable` whenever
      convenient (no behaviour change). Then set
      `NEXT_PUBLIC_HOSPITABLE_MODE=native` for Production and redeploy
      (`NEXT_PUBLIC_*` is inlined at build time).
- [ ] **After the deploy.** On the production domain: pick dates on each
      house page and confirm a total appears; Reserve on Dan Jean A reaches
      the Hospitable checkout pre-filled; `booking_*` events appear in
      Vercel Web Analytics; the function log shows `[hospitable] GET …`
      lines and no `[booking:*]` errors. Keep the Airbnb link under the
      widget.
- [ ] **Rollback.** Set `NEXT_PUBLIC_HOSPITABLE_MODE=hospitable` on Production and
      redeploy; the embedded widget returns and nothing else changes. The
      routes keep working either way.
- [ ] CSP: add `public.api.hospitable.com` only if the browser ever calls it
      directly (the routes are server-side, so it should not; the e2e suite
      asserts the browser makes no off-site request).
- [ ] Later, if latency on cold starts matters: the calendar and property
      caches are per function instance; a shared cache (Upstash, like the
      rate limiter note below) would make the first request on a new
      instance as fast as the rest.

## 1c. Native search: the home-page bar and `/search`

In `native` mode the house pages already render the site's own booking
widget, but the home hero still mounts Hospitable's `<hospitable-direct-mps>`
bar and `/search` its results view. Both are visually broken inside the
layout (fields wrap, the Search button clips) and both are a black box.
Search should match the widget. Three checkpoints, three PRs, each stacked
on the previous branch and stopping for review before the next starts; the
checkpoint number goes in the PR title and every PR adds to `CHANGELOG.md`
under "Unreleased".

**Done (#46, checkpoint 1):** `GET /api/availability`, `lib/booking/search.ts`,
`searchAvailability` in `server.ts`, the house-page prefill, the stand-in
API serving all three houses, `search.test.ts` and `search.native.spec.ts`.
Described under "Search" in [`architecture.md`](architecture.md); read that
section first, it holds the decisions every checkpoint shares (URL contract,
rules reuse, estimates vs. the quote, server-rendered results, rate limit,
mode switch). The rules for booking code are under "Working on the booking
code" in [`development.md`](development.md). `stub` and `hospitable` modes
stay exactly as they are throughout.

Open questions, with the defaults that apply unless a host decides
otherwise:

- Results show calendar estimates and the house page quotes (default), or
  every search creates a real quote per free house (three POSTs, each a
  quote record in Hospitable, slower, exact)?
- A "next available dates" suggestion when a house is not free: default no;
  a follow-up.
- Linking the no-dates `/search` from the site nav: default no; it stays
  reachable from the hero and `noindex`.

### Checkpoint 2 — the home-page search bar

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
- [ ] Docs, in the same PR: the home-page section and components list in
      `architecture.md` (and the "Search" subsection's "what is built"
      line), the events list in `README.md`, the tests table here in
      `development.md`, `CHANGELOG.md`; tick these boxes off or delete the
      checkpoint.

### Checkpoint 3 — the `/search` page

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
- [ ] Docs, in the same PR: `architecture.md` (the `/search` row in the
      routes table, the "Search" subsection's "what is built" line, the
      components list), the tests table in `development.md`, the "Search"
      paragraph in `README.md`, `CHANGELOG.md`, and here: add "search bar
      and `/search` checked on the Preview" to the pre-flip list in §1b
      (the "set each house's property URL in Hospitable" item stays; it is
      for `hospitable` mode) and delete this section.

## 2. Content still marked `[TBC]` (hosts to supply)

Everything below renders today as a dashed "to confirm" gap. Edit the file
named, then run `pnpm check:content`. See "Editing content" in
[`development.md`](development.md).

- [ ] Final names for the houses, if "An Oak Hill Home", "South Austin
      Stay", and "Fire Side Home" are not final (`name` in
      `content/properties.ts`; keep the Hospitable ping note above in mind).
- [ ] Nightly rate ("from $X / night") and minimum nights per house
      (`rateFrom`, `minNights` in `content/properties.ts`, currently `null`).
- [ ] Policies: confirm 4 pm check-in, 11 am checkout, late checkout to 1 pm,
      cleaning fee wording, the pet fee per stay, 14-day / 7-day
      cancellation, and the response-time line. Set each row's `tbc: false`
      in `content/policies.ts` (the Pets row has a comment on how to reword
      it).
- [ ] Direct-booking FAQ answers: payment, deposit/damage, cancellation for
      direct bookings (`faqs` in `content/policies.ts`; depends on the
      Hospitable Direct payment setup).
- [ ] Host bios: one line each for Alexis, Gabe, and Aaron, and whether to
      show photos (`content/hosts.ts`).
- [ ] Area-guide picks: name, one or two sentences, a 1:1 photo you own, and
      drive minutes from **each** house (`content/area.ts`, `driveMinutes`
      keyed by slug; `null` renders t.b.c.). More than three is fine. The
      three photos under `public/photos/area/` are still striped
      placeholders.
- [ ] The live domain in `site.domain` (`content/site.ts`; still `[TBC]`).
- [ ] Confirm you hold the rights to every photo in `public/photos/`.
- [ ] Brand assets: wordmark (text-only is fine), favicon, default OG image.
      Placeholders today: the "AC" monogram (`app/icon.svg`,
      `components/seo/MonogramIcon.tsx` behind `/icon1` and `/apple-icon`)
      and the generated share cards (`app/opengraph-image.tsx`,
      `app/stays/[slug]/opengraph-image.tsx`). There is no
      `app/favicon.ico`, so `/favicon.ico` is a 404 until one is added.
      These files hard-code the light palette (they render outside the
      page's CSS); update the literals if a token changes.

## 3. Decisions still open

- [ ] Whether a privacy policy page is needed (the contact form collects a
      name and email; analytics is cookieless).
- [ ] Whether to move the repo to a GitHub org (nothing depends on it).
- [ ] Shared rate limiting: the contact limiter is in memory per function
      instance. Swap in Upstash (see the comment in `lib/rateLimit.ts`)
      only if spam gets through.

## 4. Engineering follow-ups (no human input needed)

- [ ] **Theme toggle announcement.** Its `aria-label` changes on click while
      it keeps focus, which most screen readers do not re-announce. Add a
      visually hidden `aria-live="polite"` status beside it
      (`components/theme/ThemeToggle.tsx`).
- [ ] **New-tab hint.** `Button` with `external` and the TikTok handle link
      open new tabs with no "(opens in a new tab)" hint. Adding an `sr-only`
      span changes those links' accessible names, so update the specs that
      match them by name in the same PR.
- [ ] **Required fields.** The contact form's required inputs have no
      `required` / `aria-required` (`components/contact/ContactForm.tsx`).
- [ ] **Booking widget live region.** The `aria-live` on the widget's
      "Loading the booking calendar…" line never announces anything (the
      text exists at mount and leaves via `display:none`;
      `components/hospitable/HospitableWidget.tsx`).
- [ ] **Tailwind default palette.** `pnpm check:colors` does not catch
      utilities like `bg-gray-100`. Now that the palette is approved, add
      `--color-*: initial;` to `@theme` in `app/globals.css` (or a second
      pattern in `scripts/check-colors.ts`).
- [ ] **Photo dimming in dark mode.** `PhotoFrame` applies
      `dark:brightness-90`, tuned on the old placeholders. Check it on the
      real photos and adjust the one value in `components/ui/PhotoFrame.tsx`.
- [ ] **CI speed (optional).** The ~20 s Playwright browser download is not
      cached; cache `~/.cache/ms-playwright` keyed on the Playwright version
      if the budget tightens.
- [ ] **Known edge, not worked around.** Navigating between two houses while
      the booking loader's first ping is still in flight leaves the second
      house's widget empty until a reload (the loader keeps a global
      in-flight promise). Only the very first navigation is affected; the
      ping result is cached in `sessionStorage` after that.
