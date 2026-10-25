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

| Variable                                 | Default / unset                 | Effect                                                                                                  |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                   | `http://localhost:3000`         | Origin for canonical, sitemap, OG, and JSON-LD URLs. Empty counts as unset.                             |
| `NEXT_PUBLIC_HOSPITABLE_MODE`            | `site.hospitable.mode` (`stub`) | `stub` shows placeholder panels; `live` loads the real Hospitable widgets.                              |
| `RESEND_API_KEY`                         | unset → dry run                 | Without it, `/api/contact` logs the message and returns success.                                        |
| `CONTACT_FROM`                           | —                               | Sender on the Resend-verified domain. Required once a key is set.                                       |
| `CONTACT_TO`                             | —                               | Comma-separated recipients. Required once a key is set.                                                 |
| `NEXT_DIST_DIR`                          | `.next`                         | Build directory; Playwright uses `.next-live` for the live-mode build.                                  |
| `HOSPITABLE_PERSONAL_ACCESS_TOKEN`       | unset → booking routes 503      | Public API v2 token (read access). Server-only; never prefix it `NEXT_PUBLIC_`. Alias `HOSPITABLE_PAT`. |
| `HOSPITABLE_CUSTOM_SITE_ID`              | `site.hospitable.siteUuid`      | Sent with every quote so checkout is attributed to this site.                                           |
| `AIRBNB_MARKUP_PCT`, `DIRECT_MARKUP_PCT` | `15.5`, `11`                    | Fallback markups for a house whose Hospitable markups are missing.                                      |
| `AIRBNB_LISTING_URLS`                    | `airbnbUrl` from content        | JSON map of property id → Airbnb URL for the price comparison link.                                     |
| `COMPARISON_ENABLED`                     | `true`                          | `false` hides the Airbnb price comparison.                                                              |
| `MAX_NIGHTS`                             | `90`                            | Longest stay `/api/quote` will price.                                                                   |
| `BOOKING_ADMIN_TOKEN`                    | unset → disabled                | Token for a planned admin comparison check (16+ chars).                                                 |

`NEXT_PUBLIC_*` values are inlined at build time; restart `pnpm dev` or
rebuild after changing them.

**Seeing the real Hospitable widgets locally:** set
`NEXT_PUBLIC_HOSPITABLE_MODE=live` in `.env.local` and open any
`/stays/<slug>` (all three houses have property ids) or the home hero search.
The widgets talk to Hospitable's production services.

**Trying the booking API locally:** set `HOSPITABLE_PERSONAL_ACCESS_TOKEN`
in `.env.local`, run `pnpm dev`, and call `/api/properties`,
`/api/calendar/<uuid>`, or `POST /api/quote`. These hit the live Hospitable
account; a quote creates a quote record there (no reservation).

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

- **Unit tests** (`pnpm test:unit`, 32 tests, about a second): Node's built-in
  test runner via `tsx` over `lib/**/*.test.ts`. Today they cover the booking
  code (`lib/booking/{cache,config,dates,normalize}.test.ts`) against
  recorded Hospitable responses in `lib/booking/__fixtures__/` (addresses,
  coordinates, and host names redacted; the repo is public). No server, no
  network, no token.
- **End-to-end tests** (`pnpm test`): Playwright specs in `e2e/`, run against
  **production builds**, never `next dev` (Cache Components behave
  differently in dev; see the 404 note in
  [`architecture.md`](architecture.md)). The booking API routes have no e2e
  coverage yet; without a token they would only answer 503.

### End-to-end

`pnpm test` starts two web servers (both defined in `playwright.config.ts`):

| Project         | Port | Build                                            | Runs                         |
| --------------- | ---- | ------------------------------------------------ | ---------------------------- |
| `chromium`      | 3000 | `.next`, `NEXT_PUBLIC_HOSPITABLE_MODE=stub`      | every spec except `*.live.*` |
| `chromium-live` | 3001 | `.next-live`, `NEXT_PUBLIC_HOSPITABLE_MODE=live` | `hospitable.live.spec.ts`    |

Both servers pin `NEXT_PUBLIC_SITE_URL=""` so a `.env.local` cannot change
the URLs the SEO spec checks, and the default server pins stub mode. The live
build type-checks with `tsconfig.live.json`, so a stale `.next-live` cannot
break `pnpm typecheck`.

78 tests (75 + 3); about 70 seconds locally including both builds.

| Spec                      | Covers                                                                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.spec.ts`            | Title and hero, anchored sections, band links, search stub, both TikTok fallbacks, CityMap pins and recolour, guest reviews and slideshow under reduced motion, hosts, direct section; site shell (header, nav, footer, STR licenses, skip link)                                                |
| `stays.spec.ts`           | Each of the three houses (title, h1, booking panel, stub naming the house, Airbnb link attributes, other houses), gallery carousel and pop-up, spec strip, practicals and FAQ, highlighted map, sticky panel by viewport, "Near this house", 404 status for `/stays/nope` and `/does-not-exist` |
| `area.spec.ts`            | Every pick with the drive time from each house; linked from the header and home page                                                                                                                                                                                                            |
| `theme.spec.ts`           | System preference, live preference flip, toggle cycle and persistence, Newsreader on `font-display`                                                                                                                                                                                             |
| `contact-api.spec.ts`     | `POST /api/contact`: 200, honeypot, invalid email, checkout before check-in, unknown slug, non-JSON, 429 with `Retry-After`, GET 405                                                                                                                                                            |
| `contact-form.spec.ts`    | Mount and honeypot, full submit against the real route, inline 400 errors, pending + 429, 500, aborted request                                                                                                                                                                                  |
| `hospitable.spec.ts`      | Stub mode makes no Hospitable request; report-only CSP header on `/`, a stay, and the 404                                                                                                                                                                                                       |
| `hospitable.live.spec.ts` | Live mode with the loaders intercepted: one script and marker, remount across client-side navigation, no missing-id warnings, search bar → `/search`                                                                                                                                            |
| `seo.spec.ts`             | Sitemap, robots, OG and icon PNG routes, `VacationRental` per stay, `Organization`, canonical and OG tags                                                                                                                                                                                       |
| `kitchen-sink.spec.ts`    | `/kitchen-sink` is a 404 in production                                                                                                                                                                                                                                                          |
| `a11y.spec.ts`            | axe on `/`, `/stays/oak-hill`, `/area`, `/search`, `/does-not-exist` in light and dark; serious/critical fail, moderate/minor are attached to the report                                                                                                                                        |
| `visual.spec.ts`          | Full-page screenshots of `/`, `/stays/oak-hill`, `/search` in both themes into `e2e/__screenshots__/` (review aids, gitignored, no pixel comparison)                                                                                                                                            |

No test ever loads a real third party: TikTok requests are aborted, the
Hospitable loaders are intercepted with stand-ins, and the contact route runs
dry.

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
  listening on ports 3000 and 3001, including another worktree's `next dev`
  (then `/kitchen-sink` answers 200 and the suite fails). Before a run that
  must prove anything: `lsof -iTCP:3000 -sTCP:LISTEN` and
  `pkill -f next-server` (`next-server` outlives a pkill of the pnpm
  wrapper).
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
There is no separate build step: the two Playwright web servers build the
stub and live copies and pipe the build log, so a build error fails the e2e
step with the Next output under `[WebServer]`. In CI, Playwright uses one
worker, one retry, and a trace on the first retry.

Every run uploads two artifacts, kept 7 days: `playwright-report` (the HTML
report, with traces for retried tests) and `screenshots`
(`e2e/__screenshots__/`). The job takes about two minutes.

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

## Agent notes

`AGENTS.md` (written by `next dev`, committed) points coding agents at the
Next 16 docs in `node_modules/next/dist/docs/`; read them before relying on
remembered Next.js APIs. In this version `params` and `searchParams` are
Promises everywhere and must be awaited; `PageProps<'/stays/[slug]'>` and
friends are global types from `next typegen`; `next/image` uses `preload`
instead of `priority`; and with Cache Components, uncached dynamic data
(`cookies()`, `headers()`, un-awaited fetches) outside a `<Suspense>`
boundary fails the build.
