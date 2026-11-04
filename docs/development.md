# Development

How to run, check, and test the site locally, how CI works, and how to edit
content. For how the code is organised, see
[`architecture.md`](architecture.md).

## Requirements

- **Node 24 LTS** (`.nvmrc`; run `nvm use`). If pnpm fails to launch with
  `ENOEXEC`, your shell is on another Node.
- **pnpm 12** (exact version pinned in `package.json` under
  `packageManager`). `corepack enable` picks it up, or
  `npm i -g pnpm@<pinned version>` under Node 24.
- **Chromium for Playwright**, once: `pnpm exec playwright install chromium`.

## Run locally

```bash
nvm use
pnpm install
pnpm dev            # http://localhost:3000
```

Nothing needs to be configured: no environment variable is required locally.
To check a production build the way the tests and Vercel see it:

```bash
pnpm build && pnpm start
```

`/kitchen-sink` renders every UI primitive in light and dark side by side,
under `pnpm dev` only (404 in production).

Expected locally: `/_vercel/insights/script.js` 404s outside Vercel, and in
`next dev` the console logs report-only CSP violations for `'unsafe-eval'`
from React's dev tooling (production does not use eval).

### Environment variables

Copy `.env.example` to `.env.local` if you want to change anything; every
variable is optional locally.

| Variable                                 | Default / unset                 | Effect                                                                                                                                              |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                   | `http://localhost:3000`         | Origin for canonical, sitemap, OG, and JSON-LD URLs. Empty counts as unset.                                                                         |
| `NEXT_PUBLIC_HOSPITABLE_MODE`            | `site.hospitable.mode` (`stub`) | `stub` shows placeholder panels; `hospitable` embeds Hospitable's widget (`live` is its old name and still works); `native` renders the site's own. |
| `RESEND_API_KEY`                         | unset → dry run                 | Without it, `/api/contact` logs the message and returns success.                                                                                    |
| `CONTACT_FROM`                           | —                               | Sender on the Resend-verified domain. Required once a key is set.                                                                                   |
| `CONTACT_TO`                             | —                               | Comma-separated recipients. Required once a key is set.                                                                                             |
| `NEXT_DIST_DIR`                          | `.next`                         | Build directory; Playwright uses `.next-live` and `.next-native` for its other two builds.                                                          |
| `HOSPITABLE_PERSONAL_ACCESS_TOKEN`       | unset → booking routes 503      | Public API v2 token (read access). Server-only; never prefix it `NEXT_PUBLIC_`. Alias `HOSPITABLE_PAT`.                                             |
| `HOSPITABLE_CUSTOM_SITE_ID`              | `site.hospitable.siteUuid`      | Sent with every quote so checkout is attributed to this site.                                                                                       |
| `AIRBNB_MARKUP_PCT`, `DIRECT_MARKUP_PCT` | `15.5`, `11`                    | Fallback markups for a house whose Hospitable markups are missing.                                                                                  |
| `AIRBNB_LISTING_URLS`                    | `airbnbUrl` from content        | JSON map of property id → Airbnb URL for the price comparison link.                                                                                 |
| `COMPARISON_ENABLED`                     | `true`                          | `false` hides the Airbnb price comparison.                                                                                                          |
| `MAX_NIGHTS`                             | `90`                            | Longest stay `/api/quote` will price.                                                                                                               |
| `BOOKING_ADMIN_TOKEN`                    | unset → route is a 404          | Bearer token (16+ chars) for `GET /api/admin/comparison-check`.                                                                                     |
| `HOSPITABLE_API_BASE_URL`                | the real Public API             | Only the e2e suite sets it, to the stand-in in `e2e/mock-hospitable/`.                                                                              |
| `NEXT_PUBLIC_MAPKIT_TOKEN`               | unset → drawn SVG map           | Apple MapKit JS token (domain-restricted, public by design). Set: the city map is a live Apple map.                                                 |

`NEXT_PUBLIC_*` values are inlined at build time; restart `pnpm dev` or
rebuild after changing them.

**Seeing Hospitable's embedded widgets locally:** set
`NEXT_PUBLIC_HOSPITABLE_MODE=hospitable` in `.env.local` and open any
`/stays/<slug>` (all three houses have property ids) or the home hero search.
The widgets talk to Hospitable's production services.

**Running the site's own booking widget locally:** set
`NEXT_PUBLIC_HOSPITABLE_MODE=native` and `HOSPITABLE_PERSONAL_ACCESS_TOKEN`
in `.env.local` (`HOSPITABLE_CUSTOM_SITE_ID` too if it differs from
`content/site.ts`), run `pnpm dev`, and open any `/stays/<slug>` (all three
houses have markups set in Hospitable). The routes hit the real Hospitable
account: every quote creates a quote record there (no reservation, no
charge), and Reserve really does go to Hospitable's checkout. Without the
token the widget says online booking is unavailable.

## Scripts

| Script               | What it does                                                            |
| -------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`           | Development server on port 3000                                         |
| `pnpm build`         | Production build                                                        |
| `pnpm start`         | Serve the production build                                              |
| `pnpm lint`          | ESLint                                                                  |
| `pnpm typecheck`     | `next typegen` then `tsc --noEmit`                                      |
| `pnpm check:content` | Parse `content/*.ts` through zod and run the content rules              |
| `pnpm check:colors`  | Fail on raw colours under `components/` and `app/`                      |
| `pnpm format`        | Prettier, write mode                                                    |
| `pnpm format:check`  | Prettier, check only (CI)                                               |
| `pnpm test:unit`     | `node:test` over `lib/**/*.test.ts`; no server, no network              |
| `pnpm test`          | Playwright against two fresh production builds (alias: `pnpm test:e2e`) |

Before pushing, run what CI runs:

```bash
pnpm check:content && pnpm check:colors && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:unit && pnpm test
```

`docs/plan.md` and `design/artifact.html` are in `.prettierignore`; every
other file, including these docs, is formatted by Prettier.

## Tests

Two kinds, plus the content rules in `pnpm check:content`:

- **Unit tests** (`pnpm test:unit`, 101 tests, about a second): Node's built-in
  test runner via `tsx` over `lib/**/*.test.ts`. They cover the booking
  code (`lib/booking/*.test.ts`: cache, config, dates, normalizers, calendar
  rules, search, quote state, the Airbnb comparison, phone normalisation,
  retry)
  against recorded Hospitable responses in `lib/booking/__fixtures__/`
  (addresses, coordinates, and host names redacted; the repo is public). No
  server, no network, no token.
- **End-to-end tests** (`pnpm test`): Playwright specs in `e2e/`, run against
  **production builds**, never `next dev` (Cache Components behave
  differently in dev; see the 404 note in
  [`architecture.md`](architecture.md)).

### End-to-end

`pnpm test` starts four servers (all defined in `playwright.config.ts`):
three production builds of the site, one per booking mode, and a stand-in
Hospitable API for the native one.

| Project           | Port | Build                                                  | Runs                                      |
| ----------------- | ---- | ------------------------------------------------------ | ----------------------------------------- |
| `chromium`        | 3000 | `.next`, `NEXT_PUBLIC_HOSPITABLE_MODE=stub`            | every spec except `*.live.*`/`*.native.*` |
| `chromium-live`   | 3001 | `.next-live`, `NEXT_PUBLIC_HOSPITABLE_MODE=hospitable` | `hospitable.live.spec.ts`, `mapkit.live…` |
| `chromium-native` | 3002 | `.next-native`, `NEXT_PUBLIC_HOSPITABLE_MODE=native`   | `booking.native…`, `search.native…`       |
| (stand-in)        | 3999 | `node e2e/mock-hospitable/server.mjs`                  | —                                         |

Every server pins `NEXT_PUBLIC_SITE_URL=""` so a `.env.local` cannot change
the URLs the SEO spec checks, and each pins its mode. The live build pins a
dummy `NEXT_PUBLIC_MAPKIT_TOKEN` (so `mapkit.live.spec.ts` sees the Apple map,
with MapKit JS replaced by a stand-in) and the other two pin it empty (so
every other spec sees the drawn SVG). The native build also
pins every booking variable — a throwaway token, `HOSPITABLE_API_BASE_URL`
pointing at the stand-in, the admin token — so a developer's real token in
`.env.local` is never used by the suite and nothing reaches Hospitable. The
extra builds type-check with `tsconfig.live.json` / `tsconfig.native.json`,
so a stale `.next-live` or `.next-native` cannot break `pnpm typecheck`.

The stand-in (`e2e/mock-hospitable/server.mjs`, plain Node) serves all
three houses, each built from the recorded Dan Jean Unit A property with
its own id and rules, plus a fourth property content does not list (which
the server must filter out), and generates calendars so the tests never
age. South Austin: weekdays $112 base, Fridays and Saturdays $150, a
2-night minimum, the 10th–12th of each month reserved, the 20th closed to
check-in. Oak Hill: $130 / $175, a 2-night minimum that is 3 from a Friday
or Saturday check-in, no markups set (so the configured fallbacks apply).
Fire Side: $98 / $140, no minimum, pets not allowed, sleeps 4. Quotes are
priced the way Hospitable prices them. The guest's last name on the final
quote drives the paths the calendar cannot (`Unavailable`, `Changed`,
`Upstream`), and the first calendar read of each run answers 503 so the
server's retry is exercised for real. The header comment lists all of it;
`e2e/mock-hospitable/stays.ts` has the date helpers the native specs share.

90 tests (75 + 3 + 12); about two minutes locally including the builds.

| Spec                      | Covers                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.spec.ts`            | Title and hero, anchored sections, band links, search stub, both TikTok fallbacks, CityMap pins and recolour, guest reviews and slideshow under reduced motion, hosts, direct section; site shell (header, nav, footer, STR licenses, skip link)                                                                                                                                         |
| `stays.spec.ts`           | Each of the three houses (title, h1, booking panel, stub naming the house, Airbnb link attributes, other houses), gallery carousel and pop-up, spec strip, practicals and FAQ, highlighted map, sticky panel by viewport, "Near this house", 404 status for `/stays/nope` and `/does-not-exist`                                                                                          |
| `area.spec.ts`            | Every pick with the drive time from each house; linked from the header and home page                                                                                                                                                                                                                                                                                                     |
| `theme.spec.ts`           | System preference, live preference flip, toggle cycle and persistence, Newsreader on `font-display`                                                                                                                                                                                                                                                                                      |
| `contact-api.spec.ts`     | `POST /api/contact`: 200, honeypot, invalid email, checkout before check-in, unknown slug, non-JSON, 429 with `Retry-After`, GET 405                                                                                                                                                                                                                                                     |
| `contact-form.spec.ts`    | Mount and honeypot, full submit against the real route, inline 400 errors, pending + 429, 500, aborted request                                                                                                                                                                                                                                                                           |
| `hospitable.spec.ts`      | Stub mode makes no Hospitable request; report-only CSP header on `/`, a stay, and the 404                                                                                                                                                                                                                                                                                                |
| `hospitable.live.spec.ts` | Live mode with the loaders intercepted: one script and marker, remount across client-side navigation, no missing-id warnings, search bar → `/search`                                                                                                                                                                                                                                     |
| `booking.native.spec.ts`  | Native mode against the stand-in: server-rendered calendar with no client fetch, min-stay and blocked nights, quote + Airbnb saving in the footer, hand-off to checkout (intercepted), changed total, just-booked nights, axe in both themes; `/api/properties` (three houses, the stranger filtered out), `/api/calendar`, `/api/quote` validation and mapped refusals, the admin check |
| `search.native.spec.ts`   | `GET /api/availability`: three results with calendar estimates and `no-store`, every refusal reason over the three generated calendars, field errors, 405, the 60-a-minute limit; a house page prefilled from the URL quotes the stay without a click, drops a check-out it cannot use (bad format, or refused by the calendar), ignores a past check-in, clamps the guests              |
| `seo.spec.ts`             | Sitemap, robots, OG and icon PNG routes, `VacationRental` per stay, `Organization`, canonical and OG tags                                                                                                                                                                                                                                                                                |
| `kitchen-sink.spec.ts`    | `/kitchen-sink` is a 404 in production                                                                                                                                                                                                                                                                                                                                                   |
| `a11y.spec.ts`            | axe on `/`, `/stays/oak-hill`, `/area`, `/search`, `/does-not-exist` in light and dark; serious/critical fail, moderate/minor are attached to the report                                                                                                                                                                                                                                 |
| `visual.spec.ts`          | Full-page screenshots of `/`, `/stays/oak-hill`, `/search` in both themes into `e2e/__screenshots__/` (review aids, gitignored, no pixel comparison)                                                                                                                                                                                                                                     |

No test ever loads a real third party: TikTok requests are aborted, the
Hospitable loaders are intercepted with stand-ins, the native build talks to
the local stand-in API and its checkout redirect is answered by a route
handler, and the contact route runs dry.

### Running a subset

```bash
node --import tsx --test lib/booking/normalize.test.ts   # one unit test file
```

```bash
pnpm test e2e/stays.spec.ts                         # one file
pnpm test e2e/a11y.spec.ts --project=chromium       # one project
pnpm exec playwright test -g "booking panel"       # by test title
pnpm exec playwright test --list                    # list without running
```

### Testing gotchas

- **Stale servers.** Outside CI, Playwright reuses whatever is already
  listening on ports 3000, 3001, 3002 and 3999, including another worktree's
  `next dev` (then `/kitchen-sink` answers 200 and the suite fails) or an
  old stand-in whose one-time 503 has already been spent. Before a run that
  must prove anything: `lsof -iTCP:3000 -sTCP:LISTEN` and
  `pkill -f next-server` (`next-server` outlives a pkill of the pnpm
  wrapper).
- **Quote rate limit.** `/api/quote` allows 20 per minute per address and
  `next start` adds no `x-forwarded-for`, so every browser quote in the
  native project shares one bucket. The route tests send their own
  addresses; keep browser-driven quotes in a spec to a handful.
- **Rate limiter addresses.** `next start` adds no `x-forwarded-for`, so
  browser posts would share one limiter bucket (5 per 10 minutes per server
  process). `contact-api.spec.ts` uses per-process IPv6 documentation
  addresses (`2001:db8:…`) that also change on retry; `contact-form.spec.ts`
  uses `203.0.113.${50 + pid % 200}` for the file and makes one real post per
  run. A new spec that submits the form for real must pick an address outside
  both ranges.
- **Honeypot visibility.** Playwright treats the off-screen honeypot as
  visible; assert `not.toBeInViewport()` instead of `toBeHidden()`.
- **TikTok.** Specs that render the area row abort `tiktok.com` and
  `tiktokcdn-us.com` so the styled fallback stays put; do the same in any new
  spec that loads `/`.
- When adding a spec, update the comment at the top of `playwright.config.ts`
  that lists which spec runs in which project.

## CI

`.github/workflows/ci.yml` runs one job on `ubuntu-latest` for every pull
request and every push to `main`: install (frozen lockfile, pnpm store
cached), `check:content`, `check:colors`, `lint`, `format:check`,
`typecheck`, `test:unit`, `playwright install --with-deps chromium`, then
`pnpm test`.
There is no separate build step: the Playwright web servers build the
stub, live and native copies and pipe the build logs, so a build error fails
the e2e step with the Next output under `[WebServer]`. The native build
needs no secret in CI; it talks only to the stand-in. In CI, Playwright uses
one worker, one retry, and a trace on the first retry.

Every run uploads two artifacts, kept 7 days: `playwright-report` (the HTML
report, with traces for retried tests) and `screenshots`
(`e2e/__screenshots__/`). The job takes about three minutes.

## Editing content

All copy, photos, and ids live in `content/`; components never hardcode
property copy. After any edit run `pnpm check:content` (and `pnpm test` if
you changed something a spec asserts, such as a name or a count).

- **A house's text, specs, amenities, rate, minimum nights, quotes, Airbnb
  URL, license, or Hospitable id:** `content/properties.ts`. Set `rateFrom`
  (USD per night) and `minNights` from `null` to a number and the "t.b.c."
  gaps become "from $X / night" and "N nights min".
- **Photos:** put the file under `public/photos/<slug>/` (or `area/`,
  `home/`), resized as described in [`architecture.md`](architecture.md),
  and list it with alt text and its real pixel width and height in
  `content/photos.ts` (area and host photos are set in their own files).
  Outdoor shots go after indoor ones; `check:content` fails otherwise.
- **Policies and FAQ:** `content/policies.ts`; set `tbc: false` once a row is
  confirmed and replace any `[TBC]` answer.
- **Hosts:** `content/hosts.ts`. **Area picks:** `content/area.ts`
  (`driveMinutes` needs every house slug). **Site-wide copy, TikToks,
  Hospitable site ids, domain:** `content/site.ts` (an empty `tiktoks` list
  removes the row).
- Anything still unknown stays a `[TBC] …` string or `null`; never invent a
  real-looking value. The text after `[TBC]` is the brief for the real copy.
- Changing a slug changes the URL; update `content/properties.ts`, the
  property URL in the Hospitable dashboard, and any inbound links.

## Working on the booking code

These hold for every change under `lib/booking/`, `app/api/`,
`components/booking/`, `components/search/`, and `components/hospitable/`.
The code keeps them today and a change must not loosen them.

- **The Hospitable token never reaches the browser, logs, or git.** Every
  Hospitable call goes through `lib/booking/client.ts` on the server.
- **Read and quote only.** Nothing writes a reservation, calendar, or
  message to Hospitable. A change that seems to need a write stops and is
  raised with the hosts first.
- **The quote is the source of truth for anything the guest pays.**
  Anything else, the calendar's nightly preview or a search estimate, is
  labelled as an estimate.
- **Never state an Airbnb price as fact.** The comparison is the
  config-driven formula, labelled as an estimate, with a link to the listing.
- **Hospitable's response wins over these docs.** If the API contradicts
  something written here, fix the docs.
- **Hospitable's own search is never called.** There is no search endpoint
  in the Public API v2; availability comes from the cached calendars.
- **Never change a Vercel environment variable as part of a code change.**
  Production's switch to the native widget is the hosts' step in
  [`plan.md`](plan.md) §1b.
- **`stub` and `hospitable` modes keep behaving exactly as they do.** New
  booking work is the `native` branch of the mode switch.
- Tailwind token utilities only (`check:colors` enforces it), the existing
  hairline / paper / ink / muted / mono-eyebrow vocabulary, both themes,
  axe-clean, no new runtime dependencies.
- Before every commit, run what CI runs (above). If Chromium crashes under
  Playwright's default worker count on a small machine, add `--workers=1`.

## Documentation

The docs are the brief. Work is specified, tracked, and recorded in `docs/`
and never in prompt files: whoever picks up a piece of work, a person or a
coding agent, reads the docs, and the pull request that ships the work
updates them. There is no `docs/prompts/`; do not create one. A brief for a
session is a pointer at the sections below, not a copy of them.

Where each kind of change is written up:

- [`plan.md`](plan.md) — what is not done yet, including the spec for work
  that is scoped but not started: steps, decisions already made, open
  questions with their defaults. The PR that ships an item removes it here
  and describes the result in the files below.
- [`architecture.md`](architecture.md) — what is built and why: routes,
  components, data flow, the decisions behind them. New behaviour is
  described here in the PR that adds it.
- `development.md` (this file) — how to run, check, and test. A new
  environment variable, script, spec, or gotcha goes in its table or list.
- `README.md` — the short version: the route list, the events list, the
  rules the code keeps.
- `CHANGELOG.md` — one entry per PR under "Unreleased", dated when it merges.
- [`hospitable-discovery.md`](hospitable-discovery.md) — what the Public
  API actually returns; add to it when a new call or field is used.

A PR is not finished while a doc still describes the old behaviour. When
reviewing one, read the docs diff against the code diff.

## Agent notes

`AGENTS.md` (written by `next dev`, committed) points coding agents at the
Next 16 docs in `node_modules/next/dist/docs/`; read them before relying on
remembered Next.js APIs. In this version `params` and `searchParams` are
Promises everywhere and must be awaited; `PageProps<'/stays/[slug]'>` and
friends are global types from `next typegen`; `next/image` uses `preload`
instead of `priority`; and with Cache Components, uncached dynamic data
(`cookies()`, `headers()`, un-awaited fetches) outside a `<Suspense>`
boundary fails the build.
