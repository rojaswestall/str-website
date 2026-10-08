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

| Script               | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `pnpm dev`           | Development server                                       |
| `pnpm build`         | Production build                                         |
| `pnpm start`         | Serve the production build                               |
| `pnpm lint`          | ESLint                                                   |
| `pnpm typecheck`     | `tsc --noEmit`                                           |
| `pnpm check:content` | Parse `content/*.ts` through zod, check slugs and photos |
| `pnpm format`        | Prettier, write mode (`format:check` for CI)             |
| `pnpm test:e2e`      | Playwright against a fresh production build              |

Before the first e2e run, install the browser once:

```bash
pnpm exec playwright install chromium
```

CI (`.github/workflows/ci.yml`) runs install, lint, format check, typecheck,
content check, build, and e2e on every pull request and on pushes to `main`.

## Where things live

- `app/` — routes, root layout, and `globals.css` (design tokens: light on
  `:root`, dark on `[data-theme="dark"]`, mapped to Tailwind utilities).
- `components/` — reusable UI, grouped by area (`theme`, `ui`, `layout`,
  `hospitable`, `embeds`, `property`, `home`). `theme/` holds the next-themes
  provider and toggle; `ui/` holds the primitives (import from
  `@/components/ui`); `layout/` holds the site shell (`SkipLink`,
  `SiteHeader`, `SiteFooter`) composed in `app/layout.tsx`; `hospitable/`
  holds the booking and search widgets (`PropertyWidget`, `SearchWidget`,
  their client cores, and the stubs); `embeds/` holds `TikTokEmbed`; the
  rest arrive from step 8 onward. `/kitchen-sink` renders every primitive in
  light and dark side by side in `pnpm dev` only (404 in production), and
  `/hospitable-lab` previews the widgets (dev, or a build with
  `NEXT_PUBLIC_DEV_ROUTES=1`; 404 otherwise).
- `lib/` — shared code that is not a component (`fonts.ts` loads Newsreader
  and IBM Plex through `next/font`; `site-url.ts` resolves the canonical
  origin from `NEXT_PUBLIC_SITE_URL`; `cx.ts` joins class names;
  `hospitable.ts` holds the loader URL and the stub/live mode switch;
  `csp.ts` is the Content Security Policy that `next.config.ts` sends as
  report-only; `hooks/useInjectedScript.ts` mounts third-party scripts).
- `content/` — typed site content. `types.ts` holds the zod schemas; the
  data files (`properties.ts`, `hosts.ts`, `area.ts`, `policies.ts`,
  `site.ts`) are plain objects; `index.ts` parses them at import and exposes
  `getAllProperties()`, `getProperty(slug)`, `getSite()`, and friends. Import
  from `@/content`, never from a data file. Unconfirmed values are `null` or
  strings starting with `[TBC]`. Property copy is never hardcoded in
  components.
- `scripts/` — `check-content.ts`, run by `pnpm check:content` and CI before
  the build.
- `public/photos/` — photos referenced from `content/`, one folder per house
  plus `area/` and `home/`. Today every file is a striped placeholder with
  the final aspect ratio (3:2 hero and gallery, 1:1 area picks, 21:9 hero
  collage); drop real photos in at the same paths.
- `e2e/` — Playwright specs. Two projects: `chromium` runs most specs
  against the default build on port 3000, and `chromium-live` runs
  `*.live.spec.ts` against a second build made with
  `NEXT_PUBLIC_HOSPITABLE_MODE=live` into `.next-live` on port 3001.
- `docs/plan.md` — the full implementation plan with per-step prompts and the
  open-items checklist.

## Dependency policy

Everything is on the latest stable release that its peers support. pnpm's
default one-day `minimumReleaseAge` means a version published in the last 24
hours resolves to the previous one until it ages; that is intended. TypeScript
stays on 6.x until typescript-eslint supports 7.

- `design/artifact.html` — the static visual reference. Open it in a browser;
  do not edit it.

## Environment

Copy `.env.example` to `.env.local`. Nothing is required locally:
`NEXT_PUBLIC_SITE_URL` (the canonical origin used for absolute metadata URLs)
falls back to `http://localhost:3000` when unset.

`NEXT_PUBLIC_HOSPITABLE_MODE` switches the Hospitable widgets between `stub`
(placeholder panels, the default from `content/site.ts`) and `live` (the
loader from `cdn.hsptb.com`). It is inlined at build time. A house whose
`hospitable.propertyId` is still null renders the stub in either mode.
`NEXT_PUBLIC_DEV_ROUTES=1` keeps `/hospitable-lab` in a production build;
Playwright sets it for its test servers.
