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

| Script           | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Development server                           |
| `pnpm build`     | Production build                             |
| `pnpm start`     | Serve the production build                   |
| `pnpm lint`      | ESLint                                       |
| `pnpm typecheck` | `tsc --noEmit`                               |
| `pnpm format`    | Prettier, write mode (`format:check` for CI) |
| `pnpm test:e2e`  | Playwright against a fresh production build  |

Before the first e2e run, install the browser once:

```bash
pnpm exec playwright install chromium
```

CI (`.github/workflows/ci.yml`) runs install, lint, format check, typecheck,
build, and e2e on every pull request and on pushes to `main`.

## Where things live

- `app/` — routes, root layout, and `globals.css` (design tokens: light on
  `:root`, dark on `[data-theme="dark"]`, mapped to Tailwind utilities).
- `components/` — reusable UI, grouped by area (`theme`, `ui`, `layout`,
  `property`, `hospitable`, `home`). `theme/` holds the next-themes provider
  and toggle; the rest arrive from step 4 onward.
- `lib/` — shared code that is not a component (`fonts.ts` loads Newsreader
  and IBM Plex through `next/font`).
- `content/` — typed site content (`*.ts`). Property copy, hosts, policies,
  and site config live here, never hardcoded in components. Added in step 3.
- `public/` — static assets and photos.
- `e2e/` — Playwright specs.
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

Copy `.env.example` to `.env.local`. No variables are needed yet.
