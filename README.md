# The Austin Collection

Direct-booking website for three short-term rental houses in Austin, Texas,
run by Alexis, Gabe, and Aaron. Guests book through Hospitable's embeddable
widgets; Airbnb stays available as a secondary link.

## Stack

Next.js (App Router), TypeScript strict, Tailwind v4, pnpm, ESLint, Prettier,
Playwright. Deployed on Vercel with Vercel Web Analytics.

## Requirements

- Node 24 LTS (see `.nvmrc`; `nvm use` picks it up)
- pnpm 12 (exact version pinned in `package.json`; install it with
  `npm i -g pnpm@<pinned version>` or let `corepack` pick it up)

## Run

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

| Script               | What it does                                                |
| -------------------- | ----------------------------------------------------------- |
| `pnpm dev`           | Development server                                          |
| `pnpm build`         | Production build                                            |
| `pnpm start`         | Serve the production build                                  |
| `pnpm lint`          | ESLint                                                      |
| `pnpm typecheck`     | `next typegen` then `tsc --noEmit`                          |
| `pnpm check:content` | Parse `content/*.ts` through zod, check slugs and photos    |
| `pnpm check:colors`  | Fail on raw colours in `components/` and `app/` (see below) |
| `pnpm format`        | Prettier, write mode (`format:check` for CI)                |
| `pnpm test`          | Playwright against fresh production builds (see below)      |
| `pnpm test:e2e`      | Same as `pnpm test`                                         |

Before the first e2e run, install the browser once:

```bash
pnpm exec playwright install chromium
```

`pnpm test` builds the site twice (`.next` in stub mode on port 3000,
`.next-live` in live mode on port 3001), starts both, and runs the specs in
`e2e/` (65 tests, roughly 15 seconds once the servers are up).
Locally it reuses any server already listening on those ports, so stop a
stale one first (`pkill -f next-server`) or the suite tests an old build. The
config pins `NEXT_PUBLIC_HOSPITABLE_MODE=stub` and `NEXT_PUBLIC_SITE_URL=""`
on the default server so a `.env.local` cannot change what the tests see.

CI (`.github/workflows/ci.yml`) runs install, content check, colour check,
lint, format check, typecheck, and `pnpm test` on every pull request and on
pushes to `main`; the Playwright web servers do the builds, so there is no
separate build step. Every run uploads two artifacts: `screenshots` (the
`e2e/__screenshots__/` review aids, which are gitignored) and
`playwright-report` (the HTML report, with a trace for any test that needed
its one retry). The whole job takes about two minutes.

## Where things live

- `app/` — routes (`/`, `/stays/[slug]` for each house, `/api/contact`),
  root layout, and `globals.css` (design tokens: light on `:root`, dark on
  `[data-theme="dark"]`, mapped to Tailwind utilities).
- `components/` — reusable UI, grouped by area (`theme`, `ui`, `layout`,
  `hospitable`, `embeds`, `property`, `home`). `theme/` holds the next-themes
  provider and toggle; `ui/` holds the primitives (import from
  `@/components/ui`); `layout/` holds the site shell (`SkipLink`,
  `SiteHeader`, `SiteFooter`) composed in `app/layout.tsx`; `hospitable/`
  holds the booking and search widgets (`PropertyWidget`, `SearchWidget`,
  their client cores, and the stubs); `embeds/` holds `TikTokEmbed`;
  `home/` holds the landing-page sections composed by `app/page.tsx`;
  `map/` holds the `CityMap` SVG; `area/` the area guide; `practicals/`
  the policies list; `property/` the home-page `PropertyBand` and the pieces
  of a house page (`PropertyHeader`, `Gallery`, `AmenityList`, `Quotes`,
  `BookingPanel`, `PropertyCard`, `OtherHouses`). `/kitchen-sink` renders
  every primitive in light and dark side by side in `pnpm dev` only (404 in
  production).
- `lib/` — shared code that is not a component (`fonts.ts` loads Newsreader
  and IBM Plex through `next/font`; `site-url.ts` resolves the canonical
  origin from `NEXT_PUBLIC_SITE_URL`; `cx.ts` joins class names;
  `hospitable.ts` holds the loader URL and the stub/live mode switch;
  `csp.ts` is the Content Security Policy that `next.config.ts` sends as
  report-only; `hooks/useInjectedScript.ts` mounts third-party scripts).
- SEO — `lib/seo.ts` builds every absolute URL from `getSiteUrl()`
  (`canonicalUrl`), holds the shared Open Graph defaults and site
  description, and builds the `VacationRental` and `Organization` JSON-LD that
  `components/seo/JsonLd.tsx` renders on each house page and the home page.
  Per-page metadata is `generateMetadata` in `app/stays/[slug]/page.tsx` and
  `metadata` in `app/page.tsx`. `app/sitemap.ts` and `app/robots.ts` generate
  `/sitemap.xml` and `/robots.txt`; `app/opengraph-image.tsx` and
  `app/stays/[slug]/opengraph-image.tsx` render the share cards with
  `ImageResponse` (`lib/og-font.ts` reads the Newsreader TTFs vendored under
  `assets/fonts/`); `app/icon.svg`, `app/icon1.tsx`, and `app/apple-icon.tsx`
  are the placeholder "AC" monogram icons (`components/seo/MonogramIcon.tsx`)
  until real brand assets exist. Set `NEXT_PUBLIC_SITE_URL` to the real
  origin on Vercel, or every canonical, sitemap, and OG URL points at
  localhost.
- `content/` — typed site content. `types.ts` holds the zod schemas; the
  data files (`properties.ts`, `hosts.ts`, `area.ts`, `policies.ts`,
  `site.ts`) are plain objects; `index.ts` parses them at import and exposes
  `getAllProperties()`, `getProperty(slug)`, `getSite()`, and friends. Import
  from `@/content`, never from a data file. Unconfirmed values are `null` or
  strings starting with `[TBC]`. Property copy is never hardcoded in
  components.
- `scripts/` — `check-content.ts` (`pnpm check:content`) and
  `check-colors.ts` (`pnpm check:colors`); CI runs both first, before
  anything builds.
- `public/photos/` — photos referenced from `content/`, one folder per house
  plus `area/` and `home/`. Today every file is a striped placeholder with
  the final aspect ratio (3:2 hero and gallery, 1:1 area picks, 21:9 hero
  collage); drop real photos in at the same paths.
- `e2e/` — Playwright specs. Two projects: `chromium` runs every spec except
  `*.live.spec.ts` against the default build on port 3000 (`home`, `stays`,
  `theme`, `contact-api`, `contact-form`, `hospitable`, `seo`,
  `kitchen-sink`, `a11y`, `visual`), and `chromium-live` runs
  `hospitable.live.spec.ts` against
  a second build made with `NEXT_PUBLIC_HOSPITABLE_MODE=live` into
  `.next-live` on port 3001. The comment at the top of `playwright.config.ts`
  says what each file covers.
- `docs/plan.md` — the full implementation plan with per-step prompts and the
  open-items checklist.
- `design/artifact.html` — the static visual reference. Open it in a browser;
  do not edit it.

## Accessibility and visual checks

`e2e/a11y.spec.ts` runs axe-core (`@axe-core/playwright`) on `/`,
`/stays/oak-hill`, and `/does-not-exist` in light and dark; `serious` and
`critical` violations fail, `moderate` and `minor` findings are printed and
attached to the report. Run it alone with
`pnpm test:e2e e2e/a11y.spec.ts --project=chromium`. `e2e/visual.spec.ts`
writes full-page screenshots of `/` and `/stays/oak-hill` in both themes at
1400px to `e2e/__screenshots__/<route>-<theme>.png`; they are review aids
regenerated on every run, not a pixel comparison, so the folder is gitignored
and CI publishes it as the `screenshots` artifact on every run. Both specs
block requests to `tiktok.com` so the third-party player is never audited.
`pnpm check:colors`
(`scripts/check-colors.ts`) fails on any hex, `rgb(`/`hsl(`/`oklch(`, or bare
`white`/`black` under `components/` and `app/`; it exempts `app/globals.css`
(the token blocks) and the four files that render outside the page's CSS and
copy the light values by hand: `app/opengraph-image.tsx`,
`app/stays/[slug]/opengraph-image.tsx`, `components/seo/MonogramIcon.tsx`,
and `app/icon.svg`.

## Dependency policy

Everything is on the latest stable release that its peers support. pnpm's
default one-day `minimumReleaseAge` means a version published in the last 24
hours resolves to the previous one until it ages; that is intended. TypeScript
stays on 6.x until typescript-eslint supports 7.

## Environment

Copy `.env.example` to `.env.local`. Nothing is required locally:
`NEXT_PUBLIC_SITE_URL` (the canonical origin used for absolute metadata URLs)
falls back to `http://localhost:3000` when unset.

`NEXT_PUBLIC_HOSPITABLE_MODE` switches the Hospitable widgets between `stub`
(placeholder panels, the default from `content/site.ts`) and `live` (the
loader from `cdn.hsptb.com`). It is inlined at build time. A house whose
`hospitable.propertyId` is still null renders the stub in either mode.

For production, set `NEXT_PUBLIC_HOSPITABLE_MODE=live` in the deployment
environment. Local development can still force `stub` when a widget or property
is not ready yet.

The contact route (`POST /api/contact`) emails inquiries through Resend using
`RESEND_API_KEY`, `CONTACT_FROM`, and `CONTACT_TO` (comma-separated
recipients). With no API key it runs dry: the message is written to the server
log and the request still succeeds, so local dev and CI need no secrets. The home
page's form (`components/contact/ContactForm.tsx`, mounted in "Why book
direct") posts to that route and shows the same success state in dry run as
after a real send.
