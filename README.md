# The Austin Collection

Direct-booking website for three short-term rental houses in Austin, Texas,
run by Alexis, Gabe, and Aaron. Guests book through Hospitable's embeddable
widgets; Airbnb stays available as a secondary link.

**Status:** built and green in CI, with the Vercel project and domain set
up. Resend (contact email), the enforcing CSP, and the content still to
confirm are in [`docs/plan.md`](docs/plan.md).

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript strict,
Tailwind v4, zod content, pnpm, ESLint, Prettier, Playwright with axe-core.
Deploys to Vercel with Vercel Web Analytics.

## Quick start

Requires Node 24 (`nvm use`) and pnpm 12 (pinned in `package.json`).

```bash
pnpm install
pnpm dev                                   # http://localhost:3000
```

No environment variables are needed locally: the Hospitable widgets render
placeholder panels and the contact form runs dry. To run the full test suite:

```bash
pnpm exec playwright install chromium     # once
pnpm test:unit                             # 32 unit tests, no server
pnpm test                                  # builds twice, runs 78 e2e tests
```

What CI runs, in order:

```bash
pnpm check:content && pnpm check:colors && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:unit && pnpm test
```

## Documentation

- [`docs/development.md`](docs/development.md) — setup, environment
  variables, scripts, the test suite and its gotchas, CI, and how to edit
  content.
- [`docs/architecture.md`](docs/architecture.md) — what is built: routes,
  components, the content model, theming, the Hospitable integration, the
  contact API, the booking API, SEO, and the CSP.
- [`docs/hospitable-discovery.md`](docs/hospitable-discovery.md) — what the
  Hospitable Public API returns, verified against the live account.
- [`docs/plan.md`](docs/plan.md) — remaining work only: go-live checklist,
  `[TBC]` content, open decisions, engineering follow-ups.
- `design/artifact.html` — the static visual reference. Open it in a
  browser; do not edit it.
- `AGENTS.md` — pointer for coding agents to the Next 16 docs bundled in
  `node_modules/next/dist/docs/`.
