# The Austin Collection

Direct-booking website for three short-term rental houses in Austin, Texas,
run by Alexis, Gabe, and Aaron. Guests book through Hospitable's embeddable
widgets; Airbnb stays available as a secondary link.

## Stack

Next.js (App Router), TypeScript strict, Tailwind v4, pnpm, ESLint, Prettier,
Playwright. Deployed on Vercel with Vercel Web Analytics.

## Requirements

- Node 22 (see `.nvmrc`)
- pnpm 10 (pinned in `package.json`; `corepack enable` picks it up)

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

- `app/` — routes, root layout, global CSS (design tokens from step 2 onward).
- `components/` — reusable UI, grouped by area (`ui`, `layout`, `property`,
  `hospitable`, `home`). Added from step 4 onward.
- `content/` — typed site content (`*.ts`). Property copy, hosts, policies,
  and site config live here, never hardcoded in components. Added in step 3.
- `public/` — static assets and photos.
- `e2e/` — Playwright specs.
- `docs/plan.md` — the full implementation plan with per-step prompts and the
  open-items checklist.
- `design/artifact.html` — the static visual reference. Open it in a browser;
  do not edit it.

## Environment

Copy `.env.example` to `.env.local`. No variables are needed yet.
