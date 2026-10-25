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

**Status:** feature-complete for launch and green in CI; not deployed yet.
The site still builds in Hospitable `stub` mode by default and the CSP is
report-only. Some copy is still `[TBC]` (rates, policies, host bios, area
picks). See [`plan.md`](plan.md).

## Stack and key decisions

| Area      | Choice                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16.4 App Router (Turbopack), React 19.3, `cacheComponents` and `partialPrefetching` on        |
| Language  | TypeScript 6 strict with `noUncheckedIndexedAccess` (stays on 6.x until typescript-eslint supports 7) |
| Styling   | Tailwind v4 through the `@tailwindcss/turbopack` loader (not PostCSS); tokens in `app/globals.css`    |
| Tooling   | pnpm 12 (exact pin), Node 24 LTS, ESLint 10 flat config, Prettier with the Tailwind plugin            |
| Content   | Typed data files in `content/`, parsed through zod 4 at import; photos in `public/photos/`            |
| Booking   | Hospitable Direct: per-house booking loader and the property search widget                            |
| Contact   | `POST /api/contact` sends via Resend; dry run without a key                                           |
| Theme     | `next-themes` on `data-theme`, system preference plus a light / dark / system toggle                  |
| Analytics | Vercel Web Analytics (`@vercel/analytics`, cookieless)                                                |
| Hosting   | Vercel (not set up yet)                                                                               |
| Tests     | Playwright against production builds, axe-core for accessibility                                      |

Dependencies are kept on the latest stable releases their peers support.
pnpm's default one-day `minimumReleaseAge` means a version published in the
last 24 hours resolves to the previous one; that is intended.
`pnpm-workspace.yaml` holds the build-script policy (`allowBuilds`).

## Routes

| Path                                 | File                                                  | Render     | Notes                                                                |
| ------------------------------------ | ----------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `/`                                  | `app/page.tsx`                                        | static     | Hero, stays, area (TikToks), why book direct + form, reviews, hosts  |
| `/stays/[slug]`                      | `app/stays/[slug]/page.tsx`                           | static × 3 | `oak-hill`, `south-austin`, `fire-side`; unknown slugs 404 via proxy |
| `/area`                              | `app/area/page.tsx`                                   | static     | Area picks with drive times from every house                         |
| `/search`                            | `app/search/page.tsx`                                 | static     | Hospitable search results; `noindex`, not in the sitemap             |
| `/api/contact`                       | `app/api/contact/route.ts`                            | dynamic    | POST only (other methods 405)                                        |
| `/sitemap.xml`                       | `app/sitemap.ts`                                      | static     | `/`, the three stays, `/area`                                        |
| `/robots.txt`                        | `app/robots.ts`                                       | static     | Disallows `/kitchen-sink`, `/api/`, `/_404/`                         |
| `/opengraph-image`                   | `app/opengraph-image.tsx`                             | static     | Placeholder share card                                               |
| `/stays/[slug]/opengraph-image`      | `app/stays/[slug]/opengraph-image.tsx`                | static     | Per-house share card                                                 |
| `/icon.svg`, `/icon1`, `/apple-icon` | `app/icon.svg`, `app/icon1.tsx`, `app/apple-icon.tsx` | static     | Placeholder "AC" monogram                                            |
| `/kitchen-sink`                      | `app/(dev)/kitchen-sink/`                             | dev only   | Every primitive in forced light and dark; 404 in production          |
| 404                                  | `app/not-found.tsx`                                   | —          | Branded 404 inside the site shell                                    |

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
   hosts, 21:9 hero collage, the Hospitable search bar, and `CityMap`.
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
  - `home/`, `area/`, `practicals/`, `map/` (`CityMap` SVG), `property/`
    (`PropertyBand`, `PropertyHeader`, `Gallery`, `AmenityList`, `Quotes`,
    `BookingPanel`, `PropertyCard`, `OtherHouses`, `MonoHeading`).
  - `hospitable/` — `PropertyWidget` and `SearchWidget` (Server Components to
    mount) and their client cores `HospitableWidget` / `HospitableSearch`,
    plus the stubs.
  - `embeds/TikTokEmbed.tsx`, `contact/ContactForm.tsx`, `seo/`
    (`JsonLd`, `MonogramIcon`).
- `content/` — typed site content (below).
- `lib/` — non-component code: `fonts.ts` (`next/font`, self-hosted),
  `site-url.ts`, `seo.ts`, `og-font.ts`, `cx.ts`, `csp.ts`, `hospitable.ts`,
  `hooks/useInjectedScript.ts`, `contact/` (schema, rate limit, email).
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
  `siteUuid`, `theme` (`boutique`), and `searchWidgetId`. Each property has
  `hospitable.propertyId`: Oak Hill `2338067` ("Parkwood A" in Hospitable),
  South Austin `2338069` ("Dan Jean Unit A"), Fire Side `2338068` ("Dan Jean
  B").
- **Map pins** are `mapPin: { x, y }` in `CityMap`'s 400×400 viewBox.
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
`dark:brightness-90`. `accent` (3.3:1 on light paper) is decoration only.
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

<!-- Direct → Property Search: library script plus the custom element -->
<script src="https://hospitable.b-cdn.net/direct-property-search-widget/hospitable-search-widget.prod.js"></script>
<hospitable-direct-mps
  identifier="178e46fc-3dbb-4433-ac2d-3ebe9d9cca07"
  type="custom"
></hospitable-direct-mps>
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

**Search widget** (home hero bar and `/search`). A library from
`hospitable.b-cdn.net` registers `<hospitable-direct-mps identifier="…"
type="custom">`. The hero carries `results-url="/search"`; `/search` renders
the results variant. It loads once per page through `next/script` (dedupe is
correct here). `HospitableSearch.tsx` appends a small stylesheet into the
widget's shadow root so it fits the hairline frame and uses the site font.
The booking loader reads `checkin`, `checkout`, guest counts, locale, and
`utm_*` from the page URL itself, so search terms carry into the booking
iframe with no extra code.

**Stubs.** In stub mode, or in live mode when an id is null, the widgets
render `HospitableStub` / `HospitableSearchStub` (disabled fields and an
Airbnb link) and, in live mode, `console.warn` once.

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
- `rateLimit.ts` — in-memory sliding window, 5 valid inquiries per address
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
`Content-Security-Policy-Report-Only`. It allows the Hospitable loader,
search library, and iframes, Vercel Analytics, and TikTok's embed and CDN.
`script-src` keeps `'unsafe-inline'` because Next's static pages and
next-themes' pre-paint script are inline and a nonce would force dynamic
rendering. Switching to enforcing is a go-live item in [`plan.md`](plan.md).

## Third-party embeds

`components/embeds/TikTokEmbed.tsx` builds the `blockquote.tiktok-embed`
imperatively in a leaf container and injects `tiktok.com/embed.js` through
`useInjectedScript`, showing a styled fallback until the player appears.
Rule for any embed: the element a third-party script mutates must be a React
leaf, or React throws on unmount.
