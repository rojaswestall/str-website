# The Austin Collection — direct-booking site plan

## Context

Three short-term rental houses in Austin (An Oak Hill Home, South Austin Stay, Fire Side Home), run by Alexis, Gabe, and Aaron, currently book only through Airbnb. Airbnb's guest-side fee adds roughly 15% to what guests pay. The goal is a site at our own domain where guests can book direct through Hospitable's embeddable widgets, with Airbnb kept as a secondary option.

The design reference is the "Keep Austin Staying" artifact (https://claude.ai/artifact/8bKWdaGXgFA41g5RrFBa32). The name changes to **The Austin Collection**. The artifact's look is ported faithfully (warm paper palette, Newsreader headlines, IBM Plex Sans body, IBM Plex Mono labels) and a dark mode is added.

This plan was written in plan mode with no code touched. It is meant to be executed step by step by separate coding agents using the prompts in the last section.

## Decisions made

| Area | Decision |
|---|---|
| Hosting / repo | Repo `rojaswestall/str-website` (created, empty, `main`, local at `~/Documents/github/str-website`). Vercel deploy. Transfer to an org later if wanted. |
| Stack | Next.js App Router, TypeScript strict, Tailwind v4, pnpm, ESLint + Prettier, Playwright |
| Structure | Home page (artifact sections) + one page per house at `/stays/<slug>` |
| Booking | Direct booking live at launch via Hospitable per-property booking widget; Hospitable search widget on home; Airbnb link secondary |
| Content | Typed data files in repo (`content/*.ts`), photos in `public/` |
| Design | Port artifact faithfully, rename, add dark mode (system preference + toggle) |
| Email signup | Replaced by a contact form that emails hosts via Resend |
| Analytics | Vercel Web Analytics |
| Rate limiting | Honeypot + per-instance in-memory limiter (Upstash optional later) |

## Recommended changes to the artifact (beyond rename)

- **"Book direct next time" becomes "Why book direct."** Ledger of benefits plus the contact form. The waitlist pitch no longer applies since booking is live.
- **Add a short "Your hosts" strip** (three names, one line each, optional photo). Direct booking asks guests to trust strangers; faces and names convert.
- **Add two or three guest quotes per property page** pulled from Airbnb reviews. Off-platform social proof matters once the Airbnb badge is gone.
- **Add direct-booking FAQ rows to Practicals** (how payment works, who holds the deposit, cancellation). These are the questions that stop a direct booking.
- **Make the TikTok embed optional and data-driven.** It is a heavy third-party script that ignores the theme; keep it only if you like the clip.
- **Show "from $X / night" and min nights** on each property band once rates are confirmed; the artifact leaves these as t.b.c.

## Steps

Dependencies: 1 → 2 → 3 → 4 → {5, 6, 7} → {8, 9} → {10, 11} → {12, 13} → 14. Steps in braces can run in parallel. (Renumbered after step 6 merged so the numbers follow execution order: Contact API was 9, home and property pages were 7 and 8. PR titles and branch names from before that keep the old numbers.)

1. **Scaffold.** In the existing empty repo, scaffold Next.js App Router, TS strict, Tailwind v4, pnpm, ESLint, Prettier, Playwright, CI. Keep `design/artifact.html` and `docs/plan.md`.
2. **Tokens and theme.** Define light and dark CSS variables, map to Tailwind theme, load fonts via next/font, add next-themes provider and toggle.
3. **Content model.** Typed schema and seed data for properties, hosts, area picks, policies, FAQ, licenses, site config. Placeholder photos. Zod check script.
4. **UI primitives.** Section, SectionHead, Eyebrow, Button, Tag, SpecRow, Credential, PhotoFrame, Ledger, Container. Dev-only kitchen-sink route for visual parity.
5. **Site shell.** SiteHeader, SiteFooter with STR licenses, skip link, root metadata, Vercel Analytics, branded 404.
6. **Hospitable widgets.** HospitableWidget and HospitableSearch with stub and live modes, shared script-injection hook, CSP headers in report-only mode.
7. **Contact API.** `POST /api/contact` with zod validation, honeypot, rate limit, Resend send, dry-run when key absent.
8. **Home page.** Hero with CityMap SVG and search widget, three PropertyBands, hosts strip, area guide, practicals, why-book-direct placeholder.
9. **Property pages.** `/stays/[slug]` with gallery, specs, amenities, quotes, booking panel (widget + Airbnb link). Static params, 404 on unknown slug.
10. **Contact form.** ContactForm client component with pending, success, error states mounted in the WhyBookDirect section.
11. **SEO.** Per-page metadata, generateMetadata for stays, OG image routes, sitemap, robots, JSON-LD VacationRental per property.
12. **Dark mode and accessibility audit.** Contrast, focus rings, reduced motion, stray hex in SVG and gradients. axe clean in both themes.
13. **Test suite and CI.** Playwright smoke specs for all routes, theme toggle, contact stub, widget stub, 404. Run against production build in CI.
14. **Go live.** Vercel project, domain, env vars, real Hospitable embed codes, Resend domain, CSP switched to enforce. Verify a real booking flow.

## Open items (human)

### Needed before step 1
- [x] Repo: `rojaswestall/str-website`, empty, branch `main`, cloned to `~/Documents/github/str-website`. `docs/plan.md` and `design/artifact.html` are already in the working tree (uncommitted).
- [ ] If you still want a GitHub org, create it and transfer the repo later (Settings → Transfer). Nothing in the plan depends on it.
- [x] Node and pnpm pins. Decided in step 1: latest stable of everything. Node 24 LTS (`.nvmrc`), pnpm 12 (exact `packageManager` pin), TypeScript 6.x, ESLint 10.

### Needed before step 3 (content)
- [ ] Final house names for the two still-placeholder listings (artifact notes "two house names" still to come).
- [x] URL slugs for each house: `oak-hill`, `south-austin`, `fire-side` (fixed in step 3; changing them later means changing `content/properties.ts` and any inbound links).
- [ ] Nightly rate range and minimum nights per house (artifact shows t.b.c.).
- [ ] Pet fee per stay.
- [ ] Confirm the placeholder policies: 4 pm check-in, 11 am checkout, late checkout to 1 pm, 14-day / 7-day cancellation.
- [ ] Three area-guide picks (eat, outdoors, locals-only): name, one or two sentences, distance from houses, a photo.
- [ ] Keep the TikTok clip (@exploretex Barton Springs)? If yes, confirm URL. If no, it is dropped.
- [ ] Host bios: one line each for Alexis, Gabe, Aaron, and whether to show photos.
- [ ] Two or three guest review quotes per house with first name and month.
- [ ] Photos per house (hero 3:2, gallery set), plus hero collage and area pick photos. Confirm you own the rights.
- [ ] Brand assets: wordmark treatment (text-only is fine), favicon, default OG image. Step 11 shipped placeholders: an "AC" monogram (`app/icon.svg`, `components/seo/MonogramIcon.tsx` behind `/icon1` and `/apple-icon`) and generated paper-and-Newsreader share cards (`app/opengraph-image.tsx`, `app/stays/[slug]/opengraph-image.tsx`).

### Needed before step 6 / 14 (Hospitable)
- [ ] Confirm Hospitable plan includes Direct with self-hosted widgets.
- [x] From Hospitable → Direct → self-hosted site: copy the raw widget embed snippet for one property and paste it into the step 6 prompt so the component matches the real loader shape (docs do not publish it; the August 2026 loader replaced the old iframe). Pasted in step 6; the site uuid is in `content/site.ts`.
- [x] Which house is Hospitable property id `2338068` (the id in the pasted snippet)? Confirmed after step 6: "Dan Jean B", which is Fire Side Home (`fire-side`, Airbnb room 1598953749522814358). Set in `content/properties.ts`.
- [ ] `data-property-id` for An Oak Hill Home ("Parkwood A" in Hospitable) and South Austin Stay ("Dan Jean Unit A"); copy each house's snippet, only the property id differs. Goes in `content/properties.ts`.
- [ ] The search widget snippet, if Hospitable Direct offers a multi-property one. The per-property loader refuses to run without `data-property-id`, so the search widget has a different embed; until it is pasted here and wired in `HospitableSearch.tsx`, the home hero shows the search stub even in live mode.
- [ ] Style the widget in the Hospitable dashboard to match the paper palette.
- [ ] Confirm Stripe or payment setup is complete inside Hospitable Direct.

### Needed before step 7 / 14 (contact and deploy)
- [ ] Domain name and who controls DNS.
- [ ] Resend account, verified sending domain, `from` address, recipient list (all three or one inbox). Step 7 built the route; the values go in `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` (see `.env.example`), set on Vercel in step 14.
- [ ] Vercel account and team to deploy under.
- [ ] Public contact email and Instagram handle for the footer (artifact: t.b.c.).
- [ ] Approve or adjust the proposed dark palette in step 2.
- [ ] Decide whether a privacy policy page is required (contact form collects name and email; analytics is cookieless).

## Verification

- Every step ends with `pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e` green, locally and in CI.
- Step 4 and 12 include screenshot comparison against `design/artifact.html` in both themes.
- Step 14 ends with a real test booking on each house's page on the production domain, a received contact email, and a console free of CSP violations.

---

## Prompts

Paste the **preamble** first, then the step prompt, into a fresh agent with the repo cloned. Each step should be done on a branch named `step-<nn>-<slug>` and opened as a PR.

### Preamble (paste before every step prompt)

```
You are implementing one step of a larger plan for "The Austin Collection", a direct-booking website for three short-term rental houses in Austin, TX run by three hosts (Alexis, Gabe, Aaron). Guests book through Hospitable's embeddable widgets; Airbnb is a secondary link.

Where to look first (all in the repo, read before writing any code):
- `docs/plan.md`: the full plan. Read the Context, Decisions, and Steps sections, then your step's prompt, then the "Open items" checklist to see which inputs for your step are still missing. If an input you need is unchecked there, use the placeholder the step describes and say so in your PR; do not invent real-looking values.
- Notes from earlier steps, in `docs/plan.md` under the Prompts section. Each finished step leaves a block headed `**Notes from step N (read before steps ...)**` directly after its prompt. Before writing any code, grep `docs/plan.md` for `Notes from step` and read every block whose header lists your step number, plus the block from the step immediately before yours. These notes override your assumptions and your training data about the stack; they record file paths, decisions, and gotchas the prompts do not mention. In your PR description, list the notes blocks you read. If a block that should name your step does not, read it anyway and add your step number to its header in the same PR.
- `design/artifact.html`: the visual source of truth. Open it in a browser (not just the source) and compare your work against it at desktop and phone widths. Its `:root` CSS variables are the light-theme design tokens. It is a static reference; do not edit it.
- `README.md` (once step 1 creates it): how to run, lint, test, and where content lives.
- Earlier steps' PRs on GitHub: if your step depends on a component or file from a prior step, read that step's prompt in `docs/plan.md` and the merged code before reusing it.

Stack and conventions (already decided, do not change):
- Next.js App Router (latest), TypeScript strict, Tailwind v4, pnpm, ESLint flat config, Prettier, Playwright. Node 24 LTS, pnpm 12.
- In current Next.js, `params` and `searchParams` are Promises in pages, layouts, generateMetadata, and route handlers. Always `await` them.
- Content is typed data in `content/*.ts`. Never hardcode property copy in components.
- Design tokens are CSS variables in `app/globals.css` mapped into Tailwind via `@theme inline`. Light and dark themes switch on `[data-theme]`. Use token utilities (`bg-paper`, `text-ink`, `border-hairline`, `font-display`, `font-mono`), never raw hex in components.
- Match `design/artifact.html` faithfully; the site name is "The Austin Collection", not "Keep Austin Staying".
- Reusable components live in `components/ui`, `components/layout`, `components/property`, `components/hospitable`, `components/home`, etc. Prefer composing existing primitives over new one-off styles.
- Keep files focused. Server Components by default; add "use client" only where needed.
- Accessibility: semantic HTML, visible focus rings, `prefers-reduced-motion` respected, alt text from content data.
- Repo: `rojaswestall/str-website`, default branch `main`, local clone at `~/Documents/github/str-website`.
- Work on a branch `step-<nn>-<slug>`. Commit in small, logical commits. Open a PR when done.
- Done means: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e` pass. Report exactly what passed and what you could not verify.
- If you learn something later steps need (a real Hospitable snippet shape, a changed file path, a decision you had to make), add it to the relevant step or open item in `docs/plan.md` in the same PR.
- When you finish, add your own `**Notes from step N (read before steps ...)**` block directly after your step's prompt in `docs/plan.md`, naming every later step that depends on what you built or decided.
```

### Step 1 — Scaffold

```
Step 1 of 14: Scaffold the repository.

The repo `rojaswestall/str-website` already exists and is cloned at `~/Documents/github/str-website`. It has no commits yet; the working tree contains only `docs/plan.md` and `design/artifact.html`. Keep both files. Scaffold in place:
- `pnpm create next-app@latest .` in the repo root (it will complain the directory is not empty; if so, scaffold into a temp dir and move the files in, then verify nothing overwrote `docs/` or `design/`). App Router, TypeScript, Tailwind v4, ESLint, `src/` directory OFF, import alias `@/*`.
- Pin `"packageManager": "pnpm@10"` and add `.nvmrc` with Node 22.
- Enable TS `strict` and `noUncheckedIndexedAccess`.
- Add Prettier (with prettier-plugin-tailwindcss) and an ESLint flat config that includes Prettier compatibility.
- Add Playwright with one smoke spec that loads `/` and asserts the page title contains "The Austin Collection". Configure `playwright.config.ts` to run `pnpm build && pnpm start` as the web server (production build, not dev).
- Add `@vercel/analytics` and render `<Analytics />` in `app/layout.tsx`.
- Add scripts: `dev`, `build`, `start`, `lint`, `typecheck` (tsc --noEmit), `format`, `test:e2e`.
- Add `.github/workflows/ci.yml` that runs install, lint, typecheck, build, and e2e on pull requests and main.
- Add `.env.example` (empty for now, with a comment header).
- Make the first commit on `main` with just `docs/plan.md` and `design/artifact.html` before scaffolding, so the design reference has its own history. Then do the scaffold on the `step-01-scaffold` branch.
- Write a short README: what the site is, how to run it, where content lives.
- Set `app/layout.tsx` metadata title to "The Austin Collection" and a placeholder description.

Done when CI is green on the first PR and `pnpm test:e2e` passes locally against the production build.
```

**Notes from step 1 (read before steps 2+):**

- Scaffolded with Next.js 16.4 (Turbopack), React 19.3, Tailwind 4.3. `create-next-app` now defaults to `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`; both are kept. Consequence: uncached dynamic data (`cookies()`, `headers()`, un-awaited fetches) outside a `<Suspense>` boundary fails the build. Static pages, `generateStaticParams`, route handlers, and client components are unaffected. See `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`.
- Tailwind v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts`, not PostCSS. Step 2 keeps that and only edits `app/globals.css`.
- `PageProps<'/stays/[slug]'>`, `LayoutProps<'/'>`, and `RouteContext` are global type helpers generated by `next typegen`; `pnpm typecheck` runs typegen first, so no manual prop typing is needed for `params`.
- `AGENTS.md` at the repo root is written by `next dev` and points agents at the Next 16 docs in `node_modules/next/dist/docs/`. It is committed so the tree stays clean.
- `docs/plan.md` and `design/artifact.html` are in `.prettierignore`; CI runs `pnpm format:check`, so run `pnpm format` before committing.
- Playwright runs one Chromium project against `pnpm build && pnpm start`; CI builds once explicitly and then again inside the Playwright web server. Step 13 can dedupe that if CI time matters.
- Versions: Node 24 LTS (`.nvmrc`; Node 26 is "current", not LTS, at the time of writing), pnpm 12 (exact `packageManager` pin; corepack needs an exact version), TypeScript 6.0 (7.x is the native compiler and typescript-eslint caps support below 6.1), ESLint 10, `@vercel/analytics` 2. Everything else was already on latest.
- pnpm 11+ changes that matter here: `minimumReleaseAge` defaults to one day, so a package published in the last 24 hours resolves to the previous version (expected, do not fight it); build-script policy lives in `pnpm-workspace.yaml` under `allowBuilds` (`ignoredBuiltDependencies` is gone); settings no longer live in `.npmrc`. If pnpm 10's auto-switch fails with ENOEXEC, install pnpm 12 globally with `npm i -g pnpm@<pin>` under Node 24.

### Step 2 — Tokens and theme

```
Step 2 of 14: Design tokens, fonts, and dark mode.

Source of truth for light tokens is the `:root` block in `design/artifact.html`. Port every variable: ink, ink-soft, muted, accent, hairline, paper, paper-2, slot-a, slot-b, and the five map colors (map-ground, map-road, map-road-major, map-water, map-park).

1. In `app/globals.css`:
   - Define raw light values on `:root` and dark values on `[data-theme="dark"]`. Proposed dark palette (adjust only if contrast fails): paper #161513, paper-2 #1E1C19, slot-a #22201C, slot-b #2A2823, ink #ECE8E1, ink-soft #CFCAC1, muted #A19B91, accent #8E887F, hairline #2E2B27, map-ground #1E1C19, map-road #3A3732, map-road-major #4A463F, map-water #5F7B88, map-park #6E8060.
   - Set `color-scheme: light` on `:root` and `color-scheme: dark` on `[data-theme="dark"]`.
   - Map tokens into Tailwind with `@theme inline { --color-paper: var(--paper); ... --font-display: var(--font-newsreader); --font-body: var(--font-plex-sans); --font-mono: var(--font-plex-mono); }`.
   - Add `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` so `dark:` utilities key on the attribute.
   - Port the base styles: body background/color/font, `:focus-visible` outline, `prefers-reduced-motion` rule, `--measure: 62ch`, `--gutter`, `--maxw: 1180px`.
   - Verify muted-on-paper and ink-soft-on-paper reach 4.5:1 in both themes; adjust dark values if needed and note what you changed.
2. Fonts via `next/font/google` in `lib/fonts.ts`: Newsreader (weights 300, 400, 500, italic 300, optical size axis), IBM Plex Sans (400, 500), IBM Plex Mono (400, 500). Expose as CSS variables on `<html>`.
3. Install `next-themes`. Add `components/theme/ThemeProvider.tsx` (`attribute="data-theme"`, `enableSystem`, `disableTransitionOnChange`) and wrap the app in `app/layout.tsx`. Add `suppressHydrationWarning` on `<html>`.
4. Add `components/theme/ThemeToggle.tsx`: a small mono-labelled button cycling light / dark / system, icon rendered only after mount to avoid hydration mismatch, accessible label.
5. Temporarily render the toggle and a few token swatches on `/` so the PR is reviewable; step 4 replaces this.

Done when toggling flips the theme with no flash on reload, system preference is honoured, and `bg-paper text-ink font-display` utilities resolve in both themes.
```

**Notes from step 2 (read before steps 4, 6, 12):**

- Tokens live in `app/globals.css`: raw values on `:root` and `[data-theme="dark"]`, mapped in `@theme inline` as `--color-*` (`bg-paper`, `text-ink-soft`, `border-hairline`, `bg-map-water`, ...), `--font-display` / `--font-body` / `--font-mono` (`--font-sans` is aliased to body so `font-sans` also resolves to Plex Sans), and three layout helpers for step 4: `max-w-maxw` (1180px), `px-gutter` (the clamp), `max-w-measure` (62ch).
- Dark palette used exactly as proposed; no value needed adjusting. Contrast on paper (light / dark): ink 12.3 / 14.9, ink-soft 7.4 / 11.2, muted 5.2 / 6.6, accent 3.3 / 5.2. `accent` fails 4.5:1 on light paper, same as the artifact; keep it for rules and decoration, not body text. On `slot-b`, light `muted` drops to 4.3:1, so avoid muted text on slot surfaces or use ink-soft there.
- `dark:` is a custom variant keyed on `[data-theme="dark"]`, not `prefers-color-scheme`. A `data-theme="dark"` wrapper element therefore also flips `dark:` utilities inside it, which the step 4 kitchen sink relies on.
- Fonts are self-hosted by `next/font` (`lib/fonts.ts`); no Google Fonts requests at runtime. `next/font` only allows `axes` on variable fonts, so Newsreader is loaded as a variable font (all weights, normal + italic, `opsz`) rather than the artifact's 300/400/500 subset. Plex Sans and Plex Mono are 400 + 500 as specified. The variables `--font-newsreader`, `--font-plex-sans`, `--font-plex-mono` are set on `<html>` via `fontVariables`.
- Theme: `next-themes` 0.4 with `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` (`components/theme/ThemeProvider.tsx`). It injects an inline `<script>` into `<body>` to set the attribute before paint. **Step 6 CSP:** that script will violate a strict `script-src`; pass a `nonce` prop to `ThemeProvider` (next-themes supports it) or allow its hash. (Resolved in step 6: the policy keeps `'unsafe-inline'` in `script-src`, so no nonce is needed; see the step 6 notes.) `ThemeToggle` (`components/theme/ThemeToggle.tsx`) cycles light → dark → system, uses `useSyncExternalStore` for the mounted check (the `react-hooks` lint rules reject `setState` in `useEffect`), and exposes `data-theme-toggle` / `data-mode` attributes for tests.
- `e2e/theme.spec.ts` covers system preference, the toggle cycle, persistence across reload, and that `font-display` resolves to Newsreader. Step 13 can extend it rather than rewrite it.
- The temporary swatch page on `/` imports `ThemeToggle` directly; step 4 removes the swatches and step 5 moves the toggle into `SiteHeader`.
- Local gotcha: if the shell's default Node is not 24, run `nvm use` first or pnpm 12 fails to launch with ENOEXEC. `/_vercel/insights/script.js` 404s outside Vercel; that console error is expected locally.

### Step 3 — Content model

```
Step 3 of 14: Typed content model and seed data.

Create `content/` with:
- `types.ts`: zod schemas and inferred types for Property, Host, AreaPick, PolicyRow, FaqRow, License, SiteConfig, Photo, Quote, HospitableConfig.
  - Property: slug, name, shortName, neighborhood, locationLine (e.g. "Oak Hill, Austin · off Hwy 290 & 71"), summary (1–2 sentences), description (paragraph), sleeps, bedrooms, beds, bathrooms (number, 2.5 allowed), minNights (number | null), rateFrom (number | null, USD per night), amenities (string[]), rating (number), reviewCount (number), guestFavorite (boolean), airbnbUrl, strLicense, hospitable: { bookingWidgetId: string | null }, photos: Photo[] (src, alt, width, height, role: "hero" | "gallery"), quotes: Quote[] (text, author, month), mapPin: { x, y } in the CityMap 400×400 viewBox.
  - Host: name, line (one sentence), photo (optional).
  - AreaPick: title, kind ("eat" | "outdoors" | "local"), blurb, distanceLine, link (optional), photo (optional).
  - SiteConfig: name "The Austin Collection", tagline, domain, contactEmail, instagram, hospitable: { searchWidgetId: string | null, mode: "stub" | "live" }, tiktok: { url, handle } | null.
- `properties.ts`: seed the three houses from `design/artifact.html` (names, copy, specs, amenities, ratings, review counts, Airbnb URLs, STR licenses OL2026086598 / OL2026040319 / OL2026031718). Slugs: `oak-hill`, `south-austin`, `fire-side`. Leave rateFrom and minNights null. Map pins: Oak Hill (85, 299); both South Austin houses near (266, 299), offset slightly so they don't overlap.
- `hosts.ts`: Alexis, Gabe, Aaron with placeholder lines.
- `area.ts`: three picks with placeholder text clearly marked `[TBC]`.
- `policies.ts`: the six Practicals rows from the artifact plus three direct-booking FAQ rows (how payment works, deposit/damage, cancellation) with placeholder answers marked `[TBC]`.
- `site.ts`: SiteConfig with placeholders.
- `index.ts`: `getAllProperties()`, `getProperty(slug)`, `getSite()`, etc. Parse through zod at import so bad data fails the build.
- `scripts/check-content.ts` and a `check:content` script that parses all content and asserts unique slugs and that each property has at least one hero photo. Run it in CI before build.
- Placeholder photos: generate neutral SVG or PNG placeholders in `public/photos/<slug>/hero.jpg` etc. with the correct aspect ratios (3:2 hero, 1:1 area picks, 21:9 hero collage).

Done when `pnpm check:content` passes and `getProperty("oak-hill")` returns typed data.
```

**Notes from step 3 (read before steps 4, 5, 8, 9, 11):**

- Import content only from `@/content` (`content/index.ts`). It parses every data file through zod at module load, so a bad value throws in `next build` and in `pnpm check:content`; the data files themselves are plain typed objects. `getProperty(slug)` returns `undefined` for unknown slugs (call `notFound()`), and `getPropertySlugs()` feeds `generateStaticParams`. `getLicenses()` derives the footer license lines from `properties.ts`; there is no separate license file.
- Two photo shapes: `Image` (`src`, `alt`, `width`, `height`) for hosts, area picks, and the home hero collage (`site.heroCollage`, 21:9), and `Photo` (`Image` + `role: "hero" | "gallery"`) for properties. Every `src` is root-relative under `/photos/` and `check:content` asserts the file exists in `public/`. Placeholders are real JPEGs with the artifact's diagonal-stripe look (`public/photos/<slug>/hero.jpg`, `gallery-01..03.jpg` at 1800×1200; `area/{eat,outdoors,local}.jpg` at 1200×1200; `home/hero-collage.jpg` at 2100×900), so `next/image` works unchanged and real photos replace them at the same paths.
- Unconfirmed values: `rateFrom` and `minNights` are `null` (render "t.b.c."); host lines, area picks, FAQ answers, domain, contact email, and Instagram handle are strings starting with `[TBC]` (`isTbc()` from `@/content` detects them; render with the step 4 `Tbc` span and never as a live `mailto:` or link). Every Practicals row and FAQ row carries `tbc: true` until the hosts confirm it. `quotes` are empty arrays because no review quotes have been supplied; step 9 must hide the quotes block when the array is empty rather than seed fake ones.
- House names stay as the artifact has them (An Oak Hill Home, South Austin Stay, Fire Side Home) until the open item is answered; changing `name` in `properties.ts` is the only edit needed. Slugs are fixed as `oak-hill`, `south-austin`, `fire-side`.
- Map pins (CityMap 400×400 viewBox): Oak Hill (85, 299), South Austin Stay (258, 292), Fire Side Home (274, 306). The artifact draws one dot at (266, 299) for both South Austin houses; step 8 should draw one per property from `mapPin` instead.
- Hospitable: `site.hospitable.mode` is `"stub"` and every widget id is `null`. Step 6 reads mode from content (or lets `NEXT_PUBLIC_HOSPITABLE_MODE` override it; decide there) and falls back to the stub whenever an id is null.
- `site.tiktok` is populated with the artifact's @exploretex clip; set it to `null` to drop the embed. `site.tagline` is the artifact hero line, "Places we look after, properly."
- Tooling: `zod` 4 (`z.url()`, `z.prettifyError`), `tsx` runs the check script with the `@/` alias. `tsx` pulls in `esbuild`, whose postinstall is denied in `pnpm-workspace.yaml` like the others; it runs fine from the optional platform package.

### Step 4 — UI primitives

```
Step 4 of 14: UI primitives matching the artifact.

Read `design/artifact.html` closely. Build these in `components/ui/`, each a small focused file, styled only with token utilities:
- `Container` (max-w from --maxw, horizontal padding from --gutter).
- `Section` (vertical rhythm `py-[clamp(3rem,6vw,5rem)]`, optional top hairline, `id` prop for anchors).
- `SectionHead` (h2 in display font + right-aligned mono uppercase meta line; optional lede paragraph with the artifact's negative-margin treatment).
- `Eyebrow` (mono, uppercase, tracking 0.13em, muted).
- `Button` (variants `primary` and `ghost`; mono uppercase; renders `<a>` when `href` is given, `<button>` otherwise; supports `external` to add target/rel).
- `Tag` and `TagList` (hairline-bordered mono chips).
- `SpecRow` (the hairline-top-and-bottom mono spec strip with `·` separators; accepts items, marks `tbc` items with the dashed underline).
- `Credential` (★ rating · N reviews · optional "Guest favorite" badge).
- `PhotoFrame` (next/image wrapper with hairline border, aspect ratio prop 3:2 / 1:1 / 21:9, optional mono figcaption; falls back to the striped placeholder with a label when no src).
- `Ledger` (the paper-2 panel with mono heading and em-dash list; also usable as a definition list via `rows` prop).
- `Prose` (max-width --measure, ink-soft color).
- `Tbc` inline span (dashed underline for unconfirmed values).

Add a dev-only route `app/(dev)/kitchen-sink/page.tsx` that renders every primitive with sample data in a two-column light/dark comparison (wrap one column in a `data-theme="dark"` container). Guard it with `notFound()` when `process.env.NODE_ENV === "production"`.

Remove the temporary swatches from step 2 on `/`.

Done when a screenshot of the kitchen sink is visually indistinguishable from the matching artifact elements in light mode, and nothing uses raw hex.
```

**Notes from step 4 (read before steps 5, 8, 9, 12):**

- Import primitives from `@/components/ui` (barrel in `components/ui/index.ts`): `Container`, `Section`, `SectionHead`, `Eyebrow`, `Button`, `Tag`, `TagList`, `SpecRow`, `Credential`, `PhotoFrame`, `Ledger`, `Prose`, `Tbc`. All are Server Components, styled only with token utilities; `lib/cx.ts` joins class names (no clsx dependency). Class names are always literal strings so Tailwind can see them; never build them with template literals.
- `Section` wraps its children in a `Container` by default (`bleed` opts out) and takes `hairline` for the artifact's `section + section` top rule, so the home page should pass `hairline` on every section after the hero. `id` lands on the `<section>` for `/#stays`-style anchors; `aria-labelledby` can point at the `SectionHead` `id`, which is set on the h2.
- `SectionHead` takes `title`, `meta` (right-aligned mono line, pass `<Tbc>` for the practicals meta), and `lede`. The lede carries the artifact's negative top margin itself, so render it through the prop rather than as a sibling paragraph.
- `Button` renders `next/link` for internal `href`s, a plain `<a target="_blank" rel="noopener noreferrer">` when `external` is set, and `<button type="button">` when there is no `href`. Variants are `primary` (ink on paper) and `ghost` (hairline border).
- `SpecRow` takes `items: { label, tbc?, strong? }[]`; `tbc` renders the dashed `Tbc` underline, `strong` is the artifact's `.rate` (ink, weight 500) for "from $X / night" once rates are confirmed. Separators are `aria-hidden`. `Credential` formats whole ratings as "5.0" and pluralises reviews; the "Guest favorite" badge is opt-in.
- `PhotoFrame` accepts any `{ src, alt, width, height }` (the content `Image` and `Photo` types fit), renders `next/image` with `fill` + `object-cover` inside a fixed-ratio hairline box (`3:2`, `1:1`, `21:9`), and shows the striped slot with a mono label when `image` is null. Pass `sizes` for anything not full-width and `preload` (Next 16 replaced `priority`) for the hero. `caption` takes a node or a string array joined with `·`.
- `Ledger` takes `title` plus `items` (em-dash list), `rows` (definition rows styled like the artifact's Practicals `dt`/`dd`), or both; `as` picks `aside`/`div` and `headingAs` the heading level (default `h4`). The footer in step 5 can reuse its typography but should not nest a Ledger.
- Tokens: `app/globals.css` now defines the light values on `:root, [data-theme="light"]` as well as dark on `[data-theme="dark"]`, so a wrapper with either attribute forces that theme for its subtree regardless of the `<html>` theme. The kitchen sink relies on this; step 12 can use it for side-by-side audits.
- `/kitchen-sink` (`app/(dev)/kitchen-sink/`) renders every primitive twice (forced light and forced dark) from real content data and calls `notFound()` when `NODE_ENV` is `production`; `e2e/kitchen-sink.spec.ts` asserts the 404 against the production build. `/` is a holding page built from the primitives; the theme toggle still lives there for `e2e/theme.spec.ts` until step 5 moves it into `SiteHeader`.
- Verified in the browser at 1400px and 375px against `design/artifact.html`: section head and lede margins, spec strip, tags, credential badge, buttons, ledger, striped slot gradient, and the dashed `Tbc` underline all match computed values. No raw hex outside `app/globals.css`.

### Step 5 — Site shell

```
Step 5 of 14: Site shell.

- `components/layout/SiteHeader.tsx`: masthead from the artifact. Wordmark "The Austin Collection" in display font linking to `/`; mono uppercase nav: Stays (`/#stays`), The area (`/#area`), Practicals (`/#practicals`), Book direct (`/#direct`); ThemeToggle at the end. Collapses gracefully at narrow widths (wrap, no hamburger needed).
- `components/layout/SiteFooter.tsx`: colophon with site name and domain, contact column (email, Instagram, "Phone shared with guests after booking"), and the STR license line listing each property's name and license from `content/properties.ts`. Use `Ledger`-style mono typography.
- `components/layout/SkipLink.tsx` to `#main`.
- `app/layout.tsx`: compose SkipLink, SiteHeader, `<main id="main">`, SiteFooter, ThemeProvider, Analytics. Root `metadata` with title template `%s · The Austin Collection`, description, `metadataBase` from `NEXT_PUBLIC_SITE_URL`.
- `app/not-found.tsx`: branded 404 with a link home.
- Delete the preview "notice" bar concept from the artifact; it is not part of the real site.

Done when every route shows header and footer, the footer lists three license numbers, and `/does-not-exist` renders the branded 404 with status 404.
```

**Notes from step 5 (read before steps 8, 9, 11, 12, 13):**

- `app/layout.tsx` now composes `SkipLink`, `SiteHeader`, `<main id="main" className="flex flex-1 flex-col">`, and `SiteFooter` inside `ThemeProvider`, with `Analytics` last. Pages must not render their own `<main>` (the holding `/` and the kitchen sink were changed to match). `main` is a flex column so a short page still pushes the footer to the bottom; a page whose only child is a `Section` can pass `className="flex-1"` as `app/not-found.tsx` does.
- Root metadata is `title: { default: site.name, template: "%s · The Austin Collection" }`, so a page exporting `title: "An Oak Hill Home"` renders "An Oak Hill Home · The Austin Collection". `metadataBase` comes from `getSiteUrl()` in `lib/site-url.ts`, which reads `NEXT_PUBLIC_SITE_URL` (added to `.env.example`) and falls back to `http://localhost:3000`. Step 11 should build canonical URLs, the sitemap, and OG image URLs from the same helper; step 14 sets the variable on Vercel.
- `app/not-found.tsx` is the branded 404 and exports its own `metadata` (Next 16 supports that on the root `not-found`). `next build` prerenders it as `/_not-found`; `/does-not-exist` returns status 404 with the full shell. `notFound()` from step 9's unknown-slug pages renders the same component. Per the Next docs the status drops to 200 if `notFound()` is thrown after streaming starts, so call it before any `Suspense` boundary.
- `SiteHeader` nav links are `next/link`s to `/#stays`, `/#area`, `/#practicals`, `/#direct`; step 8 must give those `Section`s matching `id`s. `ThemeToggle` now lives in the header and was removed from `/`; `e2e/theme.spec.ts` still finds it through `[data-theme-toggle]`. At phone widths the nav wraps under the wordmark and the toggle onto its own line; there is no hamburger.
- `SiteFooter` reads `getSite()` and `getLicenses()`. `[TBC]` contact values render as `Tbc` gaps with the artifact's wording ("domain to confirm", "email address to confirm", "Instagram handle to confirm"); once real values land in `content/site.ts` they become a `mailto:` link and an `instagram.com/<handle>` link (a leading `@` is stripped). The license line carries `data-testid="str-licenses"` for tests. The artifact's preview notice bar and its "Preview layout" footer line were dropped on purpose.
- `e2e/shell.spec.ts` covers the header links, the toggle, the three license numbers, the skip link as first tab stop, and the 404 status, title, and shell. Step 13 can fold it into `home.spec.ts` / `stays.spec.ts` or keep it.
- Computed styles were compared against `design/artifact.html` at 1400px and 375px, light and dark: masthead padding, wordmark size, nav size and gap, footer colophon, domain, contact, and license typography all match the artifact's values.

### Step 6 — Hospitable widgets

```
Step 6 of 14: Hospitable booking and search widgets.

Context: Hospitable serves its widget through a dynamic script loader from `cdn.hsptb.com` (requires HTTPS and that domain in CSP `script-src`). The loader populates a container element, very likely with an iframe from `booking.hospitable.com`. The exact snippet shape is pasted below by the human; if it is missing, build against the abstract contract and leave a clearly marked TODO.

REAL SNIPPET FROM HOSPITABLE DASHBOARD (human pastes here):
<<<
<script
  src="https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js"
  data-site-uuid="a2dd8e69-2e7b-4a23-a07e-718ab1e46afb"
  data-property-id="2338068"
  data-theme="multi">
</script>
>>>

Build:
1. `lib/hooks/useInjectedScript.ts`: a client hook that on mount appends a `<script>` with the given src and attributes to `document.body` (or a target node) and on cleanup removes that script and calls `container.replaceChildren()`. Must be safe under React strict mode double-mount and must re-run when the `key` prop changes, so client-side navigation between `/stays/a` and `/stays/b` repopulates the container. Do not use `next/script` (it dedupes by src and will not re-run). Never inject scripts via dangerouslySetInnerHTML.
2. `components/hospitable/HospitableWidget.tsx` ("use client"): props `widgetId`, `propertyName`, `airbnbUrl`. Reads `NEXT_PUBLIC_HOSPITABLE_MODE` (`stub` | `live`). In `live` mode with a widgetId, renders the container matching the real snippet and injects the loader via the hook. If live but widgetId is null, falls back to stub and `console.warn`s once. Container sits on a `PhotoFrame`-style hairline surface that works in both themes (the iframe itself stays light; that is accepted).
3. `components/hospitable/HospitableStub.tsx`: placeholder with `data-testid="hospitable-stub"`, the property name, disabled date and guest fields in the site's style, and a ghost Button to the Airbnb URL labelled "Check availability on Airbnb".
4. `components/hospitable/HospitableSearch.tsx`: same pattern for the multi-property search widget using `site.hospitable.searchWidgetId`.
5. `components/embeds/TikTokEmbed.tsx`: reuse the hook with `https://www.tiktok.com/embed.js` and the `blockquote.tiktok-embed` markup from the artifact. Renders nothing when `site.tiktok` is null.
6. CSP in `next.config.ts` `headers()`, as `Content-Security-Policy-Report-Only` for now: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.hsptb.com https://va.vercel-scripts.com https://www.tiktok.com; frame-src https://booking.hospitable.com https://*.hospitable.com https://www.tiktok.com; connect-src 'self' https://*.hospitable.com https://vitals.vercel-insights.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-ancestors 'none'`. Put the policy string in `lib/csp.ts`.
7. `.env.example`: add `NEXT_PUBLIC_HOSPITABLE_MODE=stub`.
8. Playwright `e2e/hospitable.spec.ts`: in stub mode asserts the stub renders on the kitchen sink or a temp route; in a second test sets live mode via env, intercepts `**/cdn.hsptb.com/**` with `page.route` serving a tiny fake loader that writes `<div data-testid="hospitable-live-marker">` into the container, and asserts exactly one marker exists after navigating between two mounts.

Done when both modes behave as described, strict mode produces one script and one populated container, and `curl -I` on the production build shows the report-only CSP header.
```

**Notes from step 6 (read before steps 8, 9, 12, 13, 14):**

- The real snippet is a single `<script>` tag with `data-site-uuid`, `data-property-id`, and `data-theme`; there is no container element and no "widget id". The loader (read from `cdn.hsptb.com`, not guessed) resolves itself via `document.currentScript`, POSTs a ping to `api.hospitable.com/sites/widgets/<uuid>/ping` (it checks that the property's name appears in `document.body.innerText`, so the house name must be on the page), then inserts `<iframe id="booking-iframe" src="https://booking.hospitable.com/widget/<uuid>/<propertyId>?theme=…">` right after the script (or into `#<data-container>` if that attribute is set; `data-height` defaults to 900px and the iframe resizes itself by postMessage). Because the iframe id is fixed, the loader bails out when one already exists, so a mount must clear the previous one first; `useInjectedScript` does that in its cleanup. The iframe is Hospitable's and stays light in dark mode.
- Content changes: `property.hospitable.propertyId` (was `bookingWidgetId`; it is the numeric `data-property-id`, null until the house is matched) and `site.hospitable = { mode, siteUuid, theme, searchWidgetId }`. `siteUuid` and `theme: "multi"` hold the snippet's values. Fire Side Home carries `propertyId: "2338068"` (the snippet's house, "Dan Jean B" in Hospitable); the other two are null until their snippets are copied (open item). Hospitable's internal names: Parkwood A = An Oak Hill Home, Dan Jean Unit A = South Austin Stay, Dan Jean B = Fire Side Home. `NEXT_PUBLIC_HOSPITABLE_MODE` overrides `site.hospitable.mode` when set to `stub` or `live` (`resolveHospitableMode` in `lib/hospitable.ts`); it is inlined at build time, so set it per Vercel environment.
- Components, all in `components/hospitable` (barrel `index.ts`): `PropertyWidget({ property })` and `SearchWidget()` are the Server Components steps 8 and 9 should mount; they read `getSite()` and pass props to the client cores `HospitableWidget` / `HospitableSearch`, which decide stub vs. live and `console.warn` once (also in the server log) when live mode has no id. `HospitableStub` (`data-testid="hospitable-stub"`) and `HospitableSearchStub` (`data-testid="hospitable-search-stub"`) are the placeholder panels; the live frame is `data-testid="hospitable-widget"` with a "Loading the booking calendar…" line that hides via `group-has-[iframe]:hidden` once the iframe lands. The live booking widget runs on a hairline `paper-2` surface, no fixed aspect ratio (the iframe sets its own height, roughly 520px for the calendar + guests + Reserve).
- `HospitableSearch` is stub-only for now: the per-property loader refuses to run without `data-property-id`, so a multi-property search widget needs a different snippet (open item). In live mode it warns once and renders the stub; the `TODO(step 14)` in the file says where to wire the real snippet. Step 8 should still mount `SearchWidget` in the hero so the layout is right.
- `lib/hooks/useInjectedScript({ src, attributes, target, key, enabled, prepare })` appends the script to the `target` element (a ref to a div React never renders children into) and on cleanup removes the script and calls `replaceChildren()` on it. The insertion is deferred to a microtask so React strict mode's synchronous mount/unmount/remount adds exactly one script (a started script element cannot be cancelled, even after removal). Verified in `next dev`: one loader script, one `booking-iframe`. `prepare(target)` runs just before insertion for scripts that scan for markup (TikTok). Rule for any third-party embed: the element a script mutates must be a React leaf; React throws on unmount if a node it rendered was replaced by someone else.
- `components/embeds/TikTokEmbed({ clip })` takes `site.tiktok` and renders nothing when it is null. It builds the `blockquote.tiktok-embed` imperatively in the leaf container, injects `https://www.tiktok.com/embed.js`, and shows the artifact's styled fallback (kicker, handle, "Watch on TikTok") until the player iframe appears. Observed: embed.js loads its library script and stylesheet from `lf16-tiktok-web.tiktokcdn-us.com` into `<head>`/`<body>` (deduped by id, left in place) and puts the player iframe *inside* the blockquote at the container's width. Step 8 wraps it in the artifact's `.video-feature` grid (9:16 frame beside the copy).
- CSP lives in `lib/csp.ts` (`cspDirectives` + `contentSecurityPolicy`) and `next.config.ts` sends it as `Content-Security-Policy-Report-Only` on `/(.*)`. It is the step 6 prompt's policy plus `https://lf16-tiktok-web.tiktokcdn-us.com` in `script-src` and `style-src` (TikTok's library). Because `script-src` carries `'unsafe-inline'`, next-themes' pre-paint script and Next's inline scripts pass without a nonce, which resolves the step 2 note; a nonce would force dynamic rendering of every page. In `next dev` the console logs `'unsafe-eval'` report-only violations from React's dev tooling; production does not use eval. Step 14 flips the header key to `Content-Security-Policy` after watching the live console, and can drop the Google Fonts entries (fonts are self-hosted) if nothing reports them.
- Temporary lab route `app/(dev)/hospitable-lab` (index: search widget, TikTok, links; `[slug]`: one booking widget with `?propertyId=<id>` overriding content so live mode can be exercised before the ids are known). It is gated by `assertDevRoute()` in `app/(dev)/dev-routes.ts`: available in `next dev` and in production builds that set `NEXT_PUBLIC_DEV_ROUTES=1` (Playwright does), 404 otherwise. The kitchen sink keeps its stricter NODE_ENV-only gate. **Step 9 deletes `app/(dev)/hospitable-lab` and points `e2e/hospitable.spec.ts` and `e2e/hospitable.live.spec.ts` at `/stays/<slug>`** (the lab page is a preview of that booking panel). Step 8 does the same for the search stub and TikTok assertions on `/`. (Removed in step 9: the lab, `app/(dev)/dev-routes.ts`, and `NEXT_PUBLIC_DEV_ROUTES` are gone, including from the Playwright web servers, `.env.example`, and the README; the booking panel now lives on `/stays/<slug>`. See the step 9 notes.)
- Next 16.4 instant-navigation validation (dev only, `cacheComponents`): awaiting `params` or `searchParams` outside a `<Suspense>` boundary logs "Next.js encountered URL data during prerendering or a navigation". Moving the `await params` into a Suspense child silences it but then `notFound()` for an unknown slug streams with status 200 (verified: `/hospitable-lab/nope` returned 200). The lab page therefore awaits `params` at the top, calls `notFound()` before any boundary, and exports `const instant = false` to declare the blocking read; only `searchParams` is read inside Suspense. **Step 9 should do the same on `/stays/[slug]`** (status 404 matters more than an instant shell for a prerendered page) and step 13 should assert the 404 status. (Corrected in step 9: that holds in `next dev` only. Under `next start` the route's `◐` fallback shell is sent with status 200 before the page runs, so `/stays/nope` was still a 200; the real 404 comes from the slug check in `proxy.ts`. See the step 9 notes.)
- Playwright now has two projects and two web servers. `chromium` (port 3000, default build, `NEXT_PUBLIC_DEV_ROUTES=1`) runs every spec except `*.live.spec.ts`; `chromium-live` (port 3001) builds a second copy with `NEXT_PUBLIC_HOSPITABLE_MODE=live` into `.next-live` (`distDir` follows `NEXT_DIST_DIR` in `next.config.ts`) and runs only `*.live.spec.ts`. The live spec intercepts `**/cdn.hsptb.com/**` with a stand-in loader that mimics the real one (reads its `data-*`, inserts a marker after the script) and asserts one marker before and after client-side navigation, the stub fallback plus a single warning when the id is null, and the search stub. `.next-live` is ignored by git, ESLint, and Prettier; the live build adds `.next-live/types` globs to `tsconfig.json` (committed, so the tree stays clean). (Since corrected: the live build now type-checks with `tsconfig.live.json`, selected in `next.config.ts` when `distDir` is `.next-live`, and those globs live only there, so a stale `.next-live` can no longer break the default build or `pnpm typecheck`.) CI now builds three times; step 13 can drop the explicit `pnpm build` step and let Playwright's servers build. Both web server timeouts are 300s.
- `e2e/hospitable.spec.ts` also asserts the `Content-Security-Policy-Report-Only` header on `/`, a lab page, and the 404 page, and that no request to `hsptb.com` is made in stub mode. `curl -I http://localhost:3000/` on the production build shows the header. (Since step 9 the three paths are `/`, `/stays/oak-hill`, and `/does-not-exist`.)
- Known edge: if the visitor navigates between two houses while the loader's ping is still in flight, the loader's global in-flight promise makes the second mount a no-op and the new container stays empty until a reload. The ping is cached in `sessionStorage` after the first success, so this only affects the very first navigation and only within the ping's latency. Not worked around.
- `.env.example` gained `NEXT_PUBLIC_HOSPITABLE_MODE=stub` and `NEXT_PUBLIC_DEV_ROUTES=`. Local dev gotcha: a `.env.local` with `NEXT_PUBLIC_HOSPITABLE_MODE=live` plus `/hospitable-lab/<slug>?propertyId=2338068` loads the real widget against the pasted snippet. (Since step 9: `NEXT_PUBLIC_DEV_ROUTES` is gone from `.env.example` and the lab URL no longer exists; to see the real widget locally, set `NEXT_PUBLIC_HOSPITABLE_MODE=live` in `.env.local` and open `/stays/fire-side`, the one house with a property id.)

### Step 7 — Contact API

```
Step 7 of 14: Contact API route.

Implement `app/api/contact/route.ts` (POST only):
- `lib/contact/schema.ts`: zod schema { name (2–80), email (valid), message (10–2000), property (optional slug from content), checkIn/checkOut (optional ISO dates, checkOut > checkIn), website (honeypot, must be empty) }.
- Honeypot filled → return 200 with `{ ok: true }` and do nothing.
- `lib/contact/rateLimit.ts`: in-memory sliding window, 5 requests per IP per 10 minutes, keyed on `x-forwarded-for`. Document that it is per-instance on Vercel and that Upstash can replace it later.
- `lib/contact/email.ts`: send via Resend (`resend` package) from `CONTACT_FROM` to `CONTACT_TO` (comma-separated), `replyTo` the guest, subject "Inquiry: <property or General> — <name>", plain-text body plus a simple HTML version. When `RESEND_API_KEY` is absent, log the payload and return success (dry-run) so local and CI work without secrets.
- Responses: 200 ok, 400 with field errors, 429 on rate limit, 500 on send failure (message logged, generic error returned).
- `.env.example`: `RESEND_API_KEY=`, `CONTACT_FROM=`, `CONTACT_TO=`.
- Playwright `e2e/contact-api.spec.ts` using `request` fixture: valid → 200; honeypot → 200 silent; invalid email → 400; sixth request → 429.

Done when all four API tests pass against the production build without a Resend key.
```

**Notes from step 7 (read before steps 10, 13, 14):**

- Files: `app/api/contact/route.ts` (POST only; any other method gets Next's automatic 405), `lib/contact/schema.ts` (`ContactInquirySchema`, `ContactInquiry`, `ContactFieldErrors`, `fieldErrors`, `isHoneypotFilled`), `lib/contact/rateLimit.ts` (`consume`, `clientKey`, `CONTACT_RATE_LIMIT`), `lib/contact/email.ts` (`buildMessage`, `sendInquiry`). The route is dynamic (`ƒ` in the build output); Cache Components do not apply to it.
- Response contract for step 10's form: `200 { ok: true }` (sent, dry-run, or honeypot tripped, deliberately indistinguishable); `400 { ok: false, message, errors }` where `errors` maps a field name to its first message (`name`, `email`, `message`, `property`, `checkIn`, `checkOut`, `website`, the same keys the form posts); `429 { ok: false, message }` with a `Retry-After` header in seconds; `500 { ok: false, message }` with a generic message (the real reason is only logged). Each `message` is written to show the guest verbatim. A non-JSON body is a 400 with empty `errors`.
- Schema details: strings are trimmed; optional fields (`property`, `checkIn`, `checkOut`, `website`) treat `""` as absent, so the form can post every input's value as-is, including an empty select and empty native date inputs. `property` must be a slug from `getPropertySlugs()` (send `""` for "General"); dates are `YYYY-MM-DD` (what `<input type="date">` yields), compared as strings, and `checkOut > checkIn` fails on the `checkOut` path. The honeypot is checked before validation: any non-empty `website` returns 200 without touching the limiter or the mailer. Errors use zod 4's `{ error }` option, not `message`.
- Rate limit: 5 valid inquiries per address per 10 minutes, counted after validation so a guest fixing a typo is not locked out, and not counted for honeypot hits. The key is the first entry of `x-forwarded-for` (Vercel sets it to the client address), falling back to one shared `"unknown"` bucket when the header is missing. **`next start` on localhost does not add that header, so browser-driven posts in Playwright all share the `unknown` bucket per server process.** `e2e/contact-api.spec.ts` sends its own `x-forwarded-for` per test; step 10's form spec (and step 13) must do the same via `test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.<n>" } })` per file or test, or keep to five submissions per spec run. The map is per server instance (per function instance on Vercel); the comment in `rateLimit.ts` names the Upstash drop-in if a shared limit is ever wanted.
- Mail: `resend` 6.x (`new Resend(key)`, `resend.emails.send({ from, to, replyTo, subject, text, html })` returns `{ data, error }`; `replyTo` is camelCase). Subject is `Inquiry: <property name or General> — <name>`; the guest's address is the Reply-To; the HTML body is a plain table plus the escaped message, no template. Without `RESEND_API_KEY` the route logs the whole message under `[contact] RESEND_API_KEY is not set; dry run` and returns 200, which is what local, CI, and Vercel Preview run on until step 14. With a key but no `CONTACT_FROM` / `CONTACT_TO` the route returns 500 and logs why.
- Step 14: set `RESEND_API_KEY`, `CONTACT_FROM` (must be on the domain verified in Resend; a `Name <addr>` form is fine), and `CONTACT_TO` (comma-separated) for Production. The open item for the Resend account, domain, sender, and recipients is still unchecked; `.env.example` describes each value and nothing in the repo contains a real address. After deploying, send one inquiry through the live form and confirm it lands; a `500` in the function log with `[contact] send failed:` names the Resend error.
- Tests: `e2e/contact-api.spec.ts` runs in the default `chromium` project (not `*.live.spec.ts`) with the `request` fixture and covers 200, honeypot, invalid email, checkout-before-check-in, unknown slug, non-JSON body, the sixth request 429 with `Retry-After`, and GET 405. Step 13 can keep it as the API half of the contact coverage.
- `app/(dev)/dev-routes.ts` still said steps 7 and 8 mount the widgets; corrected to 8 and 9 after the renumbering.

### Step 8 — Home page

```
Step 8 of 14: Home page.

Rebuild the artifact's landing page in `app/page.tsx` as a Server Component composed from sections, all content from `content/`:
1. `components/home/Hero.tsx`: eyebrow "Three houses · one small team", h1 "Places we look after, <em>properly.</em>", lede from `site.tagline` (rewrite the artifact lede to name the three hosts), hero collage `PhotoFrame` 21:9 with the three-place figcaption, then the `SearchWidget` Server Component (`@/components/hospitable`) directly under the collage with a mono label "Check dates across all three".
2. `components/map/CityMap.tsx`: port the circular Austin SVG from the artifact exactly (paths, clip, rings). All fills and strokes must use the token CSS variables (`var(--map-road)` etc.), never hex, so dark mode recolours it. Pins come from `property.mapPin`; include the key/legend as in the artifact. Accept an optional `highlightSlug` prop for reuse on property pages.
3. `components/property/PropertyBand.tsx`: the alternating two-column band (photo / body) with place line, h3, Credential, summary, SpecRow (sleeps, bed, beds, bath, min nights or Tbc, rate or Tbc), TagList of amenities, actions: primary Button "Book direct" → `/stays/<slug>#book`, ghost Button "See the whole house" → `/stays/<slug>`. Even bands flip column order at ≥760px.
4. `components/home/HostsStrip.tsx`: compact three-up strip of hosts (name in display font, one mono line, optional photo). Place it between the stays and area sections.
5. `components/area/AreaGuide.tsx`: section "What's worth doing" with the optional `TikTokEmbed` feature row (hidden when null) and the three `AreaPick` cards (1:1 PhotoFrame, mono distance line, h4, blurb).
6. `components/practicals/PracticalsList.tsx`: two-column definition list from `policies.ts`, including the FAQ rows under a "Booking direct" sub-heading.
7. `components/home/WhyBookDirect.tsx`: section id `direct`, h2 "Why book direct", pitch paragraphs (rewrite: fees go to the platform not the house; booking here is the same calendar and the same people), the `Ledger` "What direct booking changes" with the four items from the artifact, and a placeholder slot where step 10 mounts the contact form.
Use `Section` ids `stays`, `area`, `practicals`, `direct` so header anchors work.

Done when Playwright finds all four section headings, three bands link to the right slugs, and the CityMap recolours when toggling the theme.
```

**Notes from step 8 (read before steps 9, 10, 11, 12, 13):**

- `app/page.tsx` composes `Hero`, `Stays`, `HostsStrip` (`components/home`), `AreaGuide` (`components/area`), `Practicals` (`components/home`, wraps `PracticalsList`), and `WhyBookDirect` (`components/home`). Everything is a Server Component reading `@/content`; nothing calls `cookies()`, `headers()`, or `fetch`, and `/` builds as `○`. Section ids are `stays`, `area`, `practicals`, `direct`, each with `aria-labelledby` pointing at an `<id>-heading` h2; the hero is a plain `<section>` (the artifact's asymmetric padding, not `Section`) with `#hero-heading` as the page's only h1. Heading outline: h2 per section, h3 for house names, area picks, the video title, and the FAQ sub-heading.
- `components/map/CityMap.tsx` is a Server Component that reads `getAllProperties()` itself; props are `highlightSlug?` and `className?`. One pin per `property.mapPin` (`<g data-map-pin="<slug>">`, plus `data-highlighted` on the match); with `highlightSlug`, the other houses drop to muted 6px dots without a halo and the legend reads "<shortName> · this house" / "The other houses". **Step 9:** `<CityMap highlightSlug={property.slug} />`. Every colour is a `fill-*` / `stroke-*` token utility; the ground rect carries `data-map-ground`, and `e2e/home.spec.ts` asserts its computed fill flips from `rgb(241, 239, 234)` to `rgb(30, 28, 25)` on toggle. Ids come from `useId`, so two maps on one page do not share a clip path. Below `sm` the legend lines wrap and the figure can stack; the artifact's `nowrap` overflowed a 375px viewport.
- `components/practicals/PracticalsList.tsx`: props `terms?: string[]` (case-insensitive match on `row.term`, omit for all rows), `faq?: boolean` (default true: the FAQ rows under a "Booking direct" sub-heading, `faqHeadingAs` picks h3/h4), `className`. **Step 9:** `<PracticalsList terms={["Check-in", "Check-out", "Pets", "Cancellation"]} faq={false} />`. A `[TBC]` answer renders as one dashed gap; a row whose wording exists but has `tbc: true` keeps its text and gets a small mono "to confirm" marker, so the property page shows the same flags without the section meta line. Test hooks: `data-testid="practicals"`, `data-testid="practicals-faq"`, `data-tbc` on unconfirmed rows.
- `components/property/PropertyBand.tsx`: `{ property, flip?, className? }`. Bands flip at `min-[760px]` (the artifact's breakpoint; Tailwind's `md` is 768px). The band body is `property.description` (the artifact's band paragraph; the content model reserves `summary` for cards and metadata), so **step 9's `PropertyCard` should use `summary`** and the property page `description`. Buttons: primary "Book direct" → `/stays/<slug>#book`, ghost "See the whole house" → `/stays/<slug>`, so **step 9 must give `BookingPanel` `id="book"`**. The file also exports `propertySpecItems(property)` (the `SpecRow` items with the Tbc rules for null `rateFrom` / `minNights`); reuse it on the property page so the wording stays identical.
- `TbcText` and `stripTbc` were added to `@/components/ui`: a string starting with `[TBC]` renders as `<Tbc>` with the marker stripped (the remaining text is the brief for the real copy, which is honest to show), anything else renders as plain text. Hosts, area picks, and FAQ answers use it; step 9 can use it for anything else that may still be `[TBC]`.
- Content additions: `site.tiktok` gained `title` and `body: string[]` (the copy beside the player, from the artifact), and `site.heroCollage` gained `caption: string[]` (the figcaption places). `TikTokEmbed`'s `clip` prop still accepts `site.tiktok` unchanged. The hero h1 is `site.tagline` with its last word in italics; the lede names the hosts from `getHosts()` and counts houses from content.
  - Later fix: `site.staysLede` (the lede under "The stays") and `site.directPitch: string[]` (the "Why book direct" paragraphs) now hold that copy; `Stays` and `WhyBookDirect` read them. Edit the copy there, not in the components.
- Hero layout: the collage, then a row with the mono label "Check dates across all three" (`#search-label`) and `SearchWidget` on the left and `CityMap` on the right; both stack at phone width. `HospitableSearch` still renders the stub in both modes (open item), so the search stub and TikTok assertions that the step 6 notes said to move from the lab index were added to `e2e/home.spec.ts` as new tests; the lab tests were left untouched for step 9 to delete with the lab.
- **Step 10:** the contact-form slot in `WhyBookDirect` is the `<div data-testid="contact-form-slot">` after the pitch paragraphs, currently rendering `<Tbc>Contact form to come</Tbc>`. Replace its contents with the mono heading "Ask us anything before you book" and `ContactForm`; keep the `data-testid` on the wrapper (or update the assertion in `e2e/home.spec.ts` that expects it to be visible). The ledger on the right is `Ledger` with the four artifact items as a const in the component.
- **Step 11:** `app/page.tsx` exports no `metadata`; the root default title applies. Add `export const metadata` (description, canonical `/`, `openGraph`) there, and render the `Organization` JSON-LD in `app/page.tsx` next to the sections. Hero image is `PhotoFrame` with `preload` and `sizes="(min-width: 1180px) 1180px, 100vw"`.
- **Step 12:** the striped placeholder JPEGs stay light in dark mode (hero collage, band heroes, area picks); real photos replace them at the same paths, and any dimming belongs in `PhotoFrame`, not the sections. No raw colours in the new components; legend swatches use `bg-ink`, `bg-paper`, `bg-map-water`, `bg-map-park`. `min-[760px]` is used for the band, hero row, video feature, and direct grids.
- **Step 13:** `e2e/home.spec.ts` (default `chromium` project) covers title and hero, the four anchored sections, band links and the t.b.c. gaps, the search stub and TikTok embed, CityMap pins and recolour, and hosts / practicals / direct. The TikTok test aborts every request to `tiktok.com` / `tiktokcdn-us.com` so the styled fallback stays visible (the real player hides it once it loads, which made the lab-style assertion racy under a full parallel run) and CI never depends on TikTok. Local gotcha: a parallel session's Playwright server on port 3000 is silently reused (`reuseExistingServer`) and the tests then run against the other worktree's build; check `lsof -iTCP:3000 -sTCP:LISTEN` before `pnpm test:e2e`.

### Step 9 — Property pages

```
Step 9 of 14: Property pages at /stays/[slug].

- `app/stays/[slug]/page.tsx`: `generateStaticParams` from `getAllProperties()`; `await params`; `notFound()` on unknown slug.
- `components/property/PropertyHeader.tsx`: place line, h1 name, Credential, summary.
- `components/property/Gallery.tsx`: hero 3:2 PhotoFrame plus a responsive grid of gallery photos. Keyboard-accessible lightbox is optional; if included keep it dependency-free and focus-trapped.
- `components/property/AmenityList.tsx`: TagList grouped under a mono heading.
- `components/property/Quotes.tsx`: two or three guest quotes in display italic with mono attribution.
- `components/property/BookingPanel.tsx`: section id `book`, h2 "Book direct", the `PropertyWidget` Server Component (`@/components/hospitable`) for this property, a short mono note "Same calendar as Airbnb, no platform fee", and a ghost Button "Or view on Airbnb" (external).
- Reuse `SpecRow`, `PracticalsList` (filtered to check-in/out, pets, cancellation), and `CityMap` with `highlightSlug`.
- A "Back to all stays" link and a small "Other houses" row with the other two `PropertyCard`s (`components/property/PropertyCard.tsx`, compact card with hero photo, name, Credential, link).
- Layout: on wide screens, BookingPanel sits in a sticky right column beside the description; stacks on mobile.

Done when `next build` emits three static pages, `/stays/nope` 404s, each page shows the widget stub with the correct property name, and the Airbnb link has target="_blank" rel="noopener noreferrer".
```

**Notes from step 9 (read before steps 11, 12, 13, 14):**

- Route: `app/stays/[slug]/page.tsx` with `generateStaticParams` from `getPropertySlugs()`. The build lists `/stays/oak-hill`, `/stays/south-austin`, and `/stays/fire-side` as `○` static plus a `◐` fallback row for the pattern. The page's `generateMetadata` sets only `title` (the root template renders "An Oak Hill Home · The Austin Collection") and `description` from `summary`; **step 11** extends it with Open Graph, canonical, and the per-property JSON-LD. Everything the `VacationRental` block needs (name, description, sleeps, bedrooms, bathrooms, amenities, rating, reviewCount, photos, airbnbUrl) is already on `Property`.
- 404 status, correcting the step 6 note: with Cache Components, `instant = false` plus a top-level `await params` / `notFound()` does **not** give an unknown slug a 404 status under `next start`. The `◐` fallback shell is sent with 200 before the page runs (verified: `/stays/nope` returned 200 with the branded body). The documented fix is a request-time check before rendering, so `proxy.ts` at the repo root (matcher `/stays/:slug`) looks the slug up in `getPropertySlugs()` and rewrites unknown ones to `/_404/stays/<slug>`; underscore segments are private in the App Router, so no page can ever own that path and Next answers with its normal 404: status 404, `app/not-found.tsx` inside the shell, title "Page not found · The Austin Collection", and the `noindex` meta. Rewriting to another `/stays/<x>` path would hit the fallback shell again. The page keeps `instant = false` and `notFound()` as the dev-mode and defence-in-depth path. The build output gains a "ƒ Proxy (Middleware)" line; the static pages are unaffected. `e2e/stays.spec.ts` asserts the status; **step 13** should keep that assertion.
- Components, all in `components/property` (barrel `index.ts`): `PropertyHeader` (place line, h1, `Credential`, summary), `Gallery` (`data-testid="gallery"`; hero 3:2 preloaded, gallery photos in a 2-up / 3-up grid at 3:2; no lightbox), `AmenityList`, `Quotes` (`data-testid="guest-quotes"`; returns `null` for an empty array, which is every house today), `BookingPanel` (`<section id="book">`, h2 "Book direct", `PropertyWidget`, the mono note, ghost "Or view on Airbnb" with `target="_blank" rel="noopener noreferrer"`), `PropertyCard`, `OtherHouses` (`<nav>` named "Other houses" by its h2; used by the live spec to navigate), `MonoHeading` (the ledger-style mono block heading). The spec strip reuses `propertySpecItems` from step 8's `PropertyBand.tsx` (re-exported from the barrel), so the band and the page word the strip identically. `PropertyCard` shows `summary`; the page body shows `description`, as the step 8 notes ask.
- Page layout: one `Section` holding the "Back to all stays" link (`/#stays`), the header, a phone-only primary "Book direct" button to `#book` (`lg:hidden`), the gallery, then a grid `lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]` with the copy column (The house + `SpecRow`, Amenities, Quotes, "Good to know" = `PracticalsList terms={["Check-in","Check-out","Pets","Cancellation"]} faq={false}`, "Where it is" = `CityMap highlightSlug={property.slug}`) beside `BookingPanel` with `lg:sticky lg:top-8`; then a hairline `Section` with `OtherHouses`. Checked in the browser at 1400px and 375px, light and dark: stacks on phones with no horizontal scroll, sticky at desktop. Step 8 merged while this PR was open; the slots were wired on the rebase.
- Heading order on a property page: h1 name; h2 The house, Amenities, (What guests say), Good to know, Where it is, Book direct, Other houses; h3 card names. The home page's `#practicals-heading` id is reused on the property page's "Good to know" h2; the two never share a page. **Step 12**: the stub and the panel both link to the same Airbnb URL under different names ("Check availability on Airbnb", "Or view on Airbnb"), as the prompt specifies; and the placeholder JPEGs are light images, so the gallery glows in dark mode until real photos land or the `dark:brightness-95` treatment is added.
- Hospitable lab removed: `app/(dev)/hospitable-lab`, `app/(dev)/dev-routes.ts`, and `NEXT_PUBLIC_DEV_ROUTES` (Playwright config, `.env.example`, README) are gone. `e2e/hospitable.spec.ts` (stub mode, CSP header on `/`, `/stays/oak-hill`, `/does-not-exist`) and `e2e/hospitable.live.spec.ts` now run against `/stays/<slug>`. The lab's `?propertyId=` override went with it, so the live spec mounts on `/stays/fire-side` (the only house with an id) and proves the remount by navigating through "Other houses" to `/stays/oak-hill` (stub, no marker, no script) and back (one marker, one script, two loader fetches). The lab index assertions for stub mode (search stub, TikTok fallback) were deleted here because step 8 already covers them on `/` in `e2e/home.spec.ts`; the live-mode search-stub assertion moved to `/` in `hospitable.live.spec.ts`.
- **Step 14**: the two missing Hospitable ids go in `content/properties.ts` as `hospitable.propertyId` (numeric string, like Fire Side's `"2338068"`) for `oak-hill` and `south-austin`; nothing else changes, the panel flips from stub to live by itself once `NEXT_PUBLIC_HOSPITABLE_MODE=live`. The step 14 prompt's `hospitable.bookingWidgetId` is the pre-step-6 name. The loader's ping checks that the property's name appears in the page text; the h1 and the stub both carry `property.name`, but if Hospitable's listing name differs from the site's (the open item on final house names), the live widget will refuse to load until they match or the ping is understood better; watch the console on the first live load.
- Tests: `e2e/stays.spec.ts` runs in the default `chromium` project and covers, for all three slugs, the title, h1, back link, panel heading, stub name, note, Airbnb link attributes, and the other-house links; plus gallery count, the t.b.c. spec values, the absent quotes block, sticky vs. static by viewport, and the 404 status. Live-mode assertions stay in `hospitable.live.spec.ts`.
- Local gotcha, still true: Playwright reuses whatever is already on ports 3000 and 3001, and `next-server` outlives a pkill of the pnpm wrapper. Run `pkill -f next-server` before `pnpm test:e2e` or the suite tests a stale build.

### Step 10 — Contact form

```
Step 10 of 14: Contact form component.

- `components/contact/ContactForm.tsx` ("use client"): fields name, email, property (select populated from `getAllProperties()`, passed in as props from the server parent), check-in and check-out (native date inputs, optional), message, hidden honeypot `website`. Styled like the artifact's signup input and button (hairline borders, mono uppercase button, paper background). States: idle, pending (button disabled, mono "Sending…"), success (replace form with a short display-font thank-you and a mono line "We reply within the hour, usually"), error (inline field errors from the 400 response, general error banner otherwise). No form library; use `fetch` to `/api/contact` and `useState`/`useTransition`.
- Mount it in `components/home/WhyBookDirect.tsx` in the slot left in step 8, under a mono heading "Ask us anything before you book". Replace the step 8 placeholder.
- Add a `ContactForm` mount to the kitchen sink.
- Playwright `e2e/contact-form.spec.ts`: fill and submit, assert success state (API dry-run).

Done when the form submits end to end locally, validation errors render inline, and the kitchen sink shows it in both themes.
```

**Notes from step 10 (read before steps 12, 13, 14):**

- Files: `components/contact/ContactForm.tsx` (`"use client"`, barrel `components/contact/index.ts` exporting `ContactForm` and `ContactFormProperty`). Props are serialisable only: `properties: { slug, name }[]` plus any `<form>` attribute except the handlers it owns; `WhyBookDirect` builds the list from `getAllProperties()` and passes `aria-labelledby="contact-heading"` so the form has an accessible name (`getByRole("form", { name: "Ask us anything before you book" })` in the spec). Nothing in `app/api/contact/**` or `lib/contact/**` changed; the form imports only the `ContactFieldErrors` type from `lib/contact/schema.ts`.
- Behaviour: inputs are uncontrolled and the body is `Object.fromEntries(new FormData(form))`, so every field goes up as-is under the step 7 names (`name`, `email`, `property`, `checkIn`, `checkOut`, `message`, `website`) and optional fields post `""`. States: idle; pending (`Button type="submit"` disabled, label "Sending…"); success (the form unmounts and a `role="status"` block with `data-testid="contact-form-success"` shows the display-font thank-you and the mono line "We reply within the hour, usually"); error. A 400 maps `errors` onto each field (`aria-invalid`, `aria-describedby` → `<id>-error`, ink border via `aria-invalid:border-ink`) and focuses the first invalid control in DOM order; editing a field clears only that field's error. On success the thank-you block (`tabIndex={-1}`) takes focus, since the form and its submit button unmount. A 429 or 500 shows the API's `message` in a `role="alert"` line (`data-testid="contact-form-error"`); a thrown `fetch` (offline, aborted) shows "We couldn't reach the server…", and a non-JSON body falls back to a generic line. Ids come from `useId`, so the kitchen sink can mount two copies.
- Mount: `components/home/WhyBookDirect.tsx` keeps `data-testid="contact-form-slot"` on the wrapper, with `MonoHeading as="h3"` (from `@/components/property`) "Ask us anything before you book" and the form under it. `/` is still `○` static: the form is a client island and the parent reads nothing dynamic. `e2e/home.spec.ts` is unchanged; its `direct.locator("li")` count still holds because the form renders no lists. The kitchen sink's "ContactForm" block mounts the same thing in forced light and forced dark.
- Styling matches the artifact's `.signup` / `.form-note`: hairline border, `bg-paper`, `font-body` at 0.95rem, 0.66rem × 0.8rem padding, `placeholder:text-muted`, mono uppercase labels like `StubField`, mono 0.72rem notes. There is no error colour token; errors are mono `text-ink`, and invalid controls swap `border-hairline` for `border-ink`. Native date inputs follow `color-scheme`, so the picker icon flips in dark mode. Checked in the browser at 1400px and 375px in both themes: idle, field-error, and success states; no horizontal scroll at phone width.
- **Step 12:** the only focus treatment is the global `:focus-visible` ring from `globals.css` (2px ink, 3px offset), which is visible on inputs, the select, the textarea, and the submit in both themes; nothing form-specific overrides it. Error messages and the general error line are ink on paper (full contrast); the muted mono labels and the "House and dates are optional." note are `text-muted`, so re-check those against the dark palette if axe or the contrast pass flags them. The honeypot is `<div aria-hidden="true">` positioned `-left-[9999px]` with `<input name="website" tabindex="-1" autocomplete="off">`; it is deliberately not `display:none`. axe's `aria-hidden-focus` rule accepts `tabindex="-1"`, but if a rule does flag it, keep the input focusable-by-script and out of the tab order rather than hiding it, or bots will skip it. A disabled `Button` only gets `opacity-70`; check that "Sending…" still passes contrast.
- **Step 13:** `e2e/contact-form.spec.ts` runs in the default `chromium` project and covers the mount and honeypot attributes, a full submit (asserts the posted JSON equals every field as entered, a 200 from the real route, and the success state), the 400 path (inline errors for `email` and `checkOut`, focus on the first, clearing on edit), the pending label plus the 429 message, the 500 message, and the aborted-request fallback, the last three via `page.route("**/api/contact", …)`. The file sets `test.use({ extraHTTPHeaders: { "x-forwarded-for": \`203.0.113.${50 + (process.pid % 200)}\` } })` (one address per worker process, clear of `contact-api.spec.ts`'s `.10`–`.17`) because `next start` does not add that header and every browser post would otherwise share the `unknown` bucket; only one test makes a real valid post, so a run costs the limiter one inquiry out of five per ten minutes, and the per-process address keeps repeated local runs against a reused server from hitting the limit. Keep the header (or a per-test address) in any spec that submits the form for real, and keep the API coverage in `contact-api.spec.ts`. Playwright's `toBeVisible` / `toBeHidden` treat the off-screen honeypot as visible; assert `not.toBeInViewport()` and `getByRole("textbox", { name: "Website" })` count 0 instead (`getByLabel` does not honour `aria-hidden`).
- **Step 14:** nothing in the form changes when `RESEND_API_KEY` is set. The same submit that dry-runs today (`[contact] RESEND_API_KEY is not set; dry run` in the server log, 200) becomes a real send once `RESEND_API_KEY`, `CONTACT_FROM`, and `CONTACT_TO` are set on Vercel, and the guest sees the identical success state. With the key but without `CONTACT_FROM` / `CONTACT_TO` the route answers 500 and the form shows the route's generic message, so set all three together. After deploying, send one real inquiry through the live form on the production domain (pick a house, add dates, a real email as the sender) and confirm it arrives with the guest's address as Reply-To and the subject `Inquiry: <house> — <name>`; a `[contact] send failed:` line in the function log names the Resend error if it does not. `site.contactEmail` is still `[TBC]` and the form neither needs nor renders it.

### Step 11 — SEO

```
Step 11 of 14: Metadata and SEO.

- `lib/seo.ts`: helpers for canonical URLs from `NEXT_PUBLIC_SITE_URL`, default OG fields, and a `vacationRentalJsonLd(property)` builder (schema.org `VacationRental` with name, description, address locality "Austin", numberOfRooms, occupancy, amenityFeature, aggregateRating from rating/reviewCount, image, url). Also an `Organization` block for the site.
- `components/seo/JsonLd.tsx`: renders a `<script type="application/ld+json">` safely.
- `app/stays/[slug]/page.tsx`: `generateMetadata` (await params) with title, description from summary, openGraph image from the OG route, canonical.
- `app/opengraph-image.tsx` and `app/stays/[slug]/opengraph-image.tsx` using `ImageResponse`: paper background, site name in display font, property name, and the ★ rating line. Load Newsreader via `fetch` of the font file at build time.
- `app/sitemap.ts`: home plus three stays with lastModified. `app/robots.ts`: allow all, disallow `/kitchen-sink`, sitemap URL.
- Favicon and `apple-icon` placeholders in `app/` (simple "AC" monogram SVG in ink on paper).

Done when `/sitemap.xml` lists four URLs, both OG routes return image/png, and each property page's JSON-LD validates with the schema.org validator.
```

**Notes from step 11 (read before steps 12, 13, 14):**

- Files: `lib/seo.ts` (`canonicalUrl(path)` on `getSiteUrl()`, `openGraphDefaults`, `propertyOgImageUrl`, `propertyImageUrls`, `vacationRentalJsonLd`, `organizationJsonLd`), `components/seo/JsonLd.tsx` (`<script type="application/ld+json">`, `<` escaped as `\u003c`), `components/seo/MonogramIcon.tsx`, `lib/og-font.ts`, `assets/fonts/` (Newsreader 300 regular and italic TTFs plus `OFL.txt`), `app/sitemap.ts`, `app/robots.ts` (disallows `/kitchen-sink`, `/api/`, `/_404/`), `app/opengraph-image.tsx`, `app/stays/[slug]/opengraph-image.tsx`, `app/icon.svg`, `app/icon1.tsx` (32px PNG for browsers that ignore SVG favicons, Safari among them), `app/apple-icon.tsx`. The site description moved into content as `site.description` (`content/site.ts`, schema in `content/types.ts`); `app/layout.tsx`, `app/page.tsx`, the Organization block, and the home OG card all read it from there. The scaffold's `app/favicon.ico` (the Vercel triangle) was deleted: with it present Next advertises both icons and ico-first browsers keep the triangle. `/favicon.ico` therefore answers 404 until a real one lands with the brand assets; modern browsers use the `<link rel="icon">` tags (SVG first, PNG second) and never ask for it.
- Metadata: the stay page's `generateMetadata` sets `openGraph.images` explicitly (the generated card first, the hero photo second). An explicit `images` replaces the tag Next would emit for the `opengraph-image.tsx` file convention, which is why the route URL is listed by hand through `canonicalUrl`, and why it has no cache-busting `?hash` query. The home page sets no `images` and gets the file-convention tag, absolute via `metadataBase` and hashed. Twitter tags inherit from Open Graph. Next normalizes the home canonical to the bare origin (no trailing slash); the sitemap and the `Organization` url keep the slash.
- Cache Components and the font: the step prompt's build-time `fetch` does not work here. A module-scope `fetch` in an OG route is rejected by Next's patched fetch as soon as the prerender that evaluated the module finishes ("fetch() rejects when the prerender is complete") and the route turns `ƒ`; a `"use cache"` loader with `cacheLife("max")` builds static but re-runs the fetch at request time after its 30-day revalidate, so a network blip on Vercel would regenerate the cards in the wrong face for the next 30 days. `lib/og-font.ts` therefore reads the two Newsreader 300 TTFs from `assets/fonts/` with `readFile` at module scope (the pattern in Next's `opengraph-image` docs for local assets); the ImageResponse routes build as plain `○` / `●` with no revalidate column, there is no network dependency, and a missing file fails the build. Newsreader has no ★ glyph, so the property card draws the star as inline SVG; with the character, Satori tries to download a fallback font at build and logs a 400.
- JSON-LD: validator.schema.org (by hand, 2026-10-08) reports 0 errors and 0 warnings for the Oak Hill block once `occupancy` moved into `containsPlace` (`Accommodation` with `numberOfBedrooms` and `numberOfBathroomsTotal`); `occupancy` is not a `VacationRental` property, `numberOfRooms` is. Contact email and Instagram stay out while `[TBC]` (`organizationJsonLd` adds `email` and `sameAs` once `content/site.ts` has real values); the content has no street address and none should be added. Each house's `sameAs` is its Airbnb URL.
- **Step 12:** the raw-hex grep must exempt `app/opengraph-image.tsx`, `app/stays/[slug]/opengraph-image.tsx`, and `components/seo/MonogramIcon.tsx` (ImageResponse renders off the page and cannot read CSS variables) and `app/icon.svg` (a standalone file). Each carries a comment saying so and copies the light-theme values from `globals.css`; if a token changes, update those literals by hand. The cards are light-only on purpose, share previews have no theme.
- **Step 13:** `e2e/seo.spec.ts` (default `chromium` project) covers the sitemap's four URLs on the test origin, robots (allow, the three disallows, the sitemap line), both OG routes, `/apple-icon`, and `/icon1` returning `image/png` with a PNG signature, one `VacationRental` block per stay (type, name, url, address, occupancy, aggregateRating, images on the origin, no `[TBC]`), the `Organization` block on `/`, canonical plus og:title / og:site_name / og:image / twitter:card and the two icon links on `/` and one stay, and the 404 status for `/stays/nope`. The schema.org validator check is manual and cannot run in CI. `playwright.config.ts` pins `NEXT_PUBLIC_SITE_URL=""` for both web servers (an explicit process value wins over `.env.local`, and `getSiteUrl()` treats empty as unset), so the spec's origin assertions hold on any machine; keep that pin when the config is consolidated.
- **Step 14:** `NEXT_PUBLIC_SITE_URL` must be the final `https://` origin on Vercel (Production and Preview); without it every canonical, sitemap, OG, and JSON-LD URL says `http://localhost:3000`. Placeholder artwork to swap: `app/icon.svg` and `components/seo/MonogramIcon.tsx` (the monogram behind `/icon1` and `/apple-icon`) and the two `opengraph-image.tsx` layouts; the routes and the metadata pointing at them stay as they are. After swapping, re-scrape the home page and the three stay pages in the Facebook Sharing Debugger, the X card validator, and Slack (unfurl again) because the stay pages' OG image URLs carry no cache-busting hash and scrapers cache by URL. Add a real `favicon.ico` to `app/` if one is supplied. The share-card font is vendored, so the build needs no outbound access for it.

### Step 12 — Dark mode and accessibility audit

```
Step 12 of 14: Dark mode and accessibility audit.

Audit every route in both themes and fix drift:
- Grep `components/` and `app/` for raw hex, `rgb(`, and hardcoded `white`/`black`; replace with tokens.
- Check the CityMap, striped placeholder gradient, PhotoFrame borders, Ledger panel, form inputs, and the Hospitable stub surface in dark mode. Photos should not glow: add a subtle `dark:brightness-95` or hairline treatment if needed.
- Display font weight: if Newsreader 300 looks too thin on dark paper, bump display weight to 400 under `[data-theme="dark"]` only.
- Verify `:focus-visible` rings are visible in both themes, `prefers-reduced-motion` disables transitions, every image has alt from content, headings are in order, nav and footer are landmarks, the theme toggle has an accessible name.
- Add `@axe-core/playwright` and `e2e/a11y.spec.ts` running axe on `/`, one stay page, and `/does-not-exist` in both themes; fail on serious or critical violations.
- Add `e2e/visual.spec.ts` capturing full-page screenshots of `/` and one stay in both themes (store under `e2e/__screenshots__`, not for strict comparison yet, just for PR review).

Done when axe reports zero serious/critical violations on all tested pages in both themes and no raw colors remain in components.
```

**Notes from step 12 (read before steps 13, 14):**

- What was audited: `/`, the three stays, `/does-not-exist`, and `/kitchen-sink` under `pnpm dev`, light and dark, 1400px and 375px, against `design/artifact.html` (light only). Layout matches the artifact at both widths; no horizontal scroll at 375px. Contrast was computed from the token values, not eyeballed: on paper (light / dark) ink 12.3 / 14.9, ink-soft 7.4 / 11.2, muted 5.2 / 6.6, accent 3.3 / 5.2; muted on `paper-2` 4.8 / 6.2, on `slot-a` 4.7 / 5.9, on `slot-b` 4.3 / 5.3. Every `text-muted` use sits on `paper` or `paper-2` (the stubs, Ledger, Credential badge); nothing muted sits on a slot surface (the PhotoFrame chip has its own `bg-paper`). `text-accent` is only ever decoration (`aria-hidden` separators in `SpecRow` and `Quotes`, the Ledger `—`, the `Tbc` dashed underline, hover borders). The disabled "Sending…" button (`opacity-70` ink on paper) measures 4.9 light / 7.8 dark, so it stays. No token value was changed; the dark palette approval is still an open item and nothing in the audit requires a value change.
- Fixes, all treatment-only: `PhotoFrame` now applies `dark:brightness-90` to the `next/image` (the one place every photo renders, so real photos inherit it at the same paths); judged on the striped placeholders, `.95` was invisible and `.85` went grey, `.9` takes the glow off. `StubField` lost `disabled:opacity-80`: with it the stub's muted "Add date" text measured 3.4:1 on light paper, without it 5.2:1 (the field still reads disabled from the cursor, the muted ink, and `aria-disabled`). The kitchen sink's two `Ledger` blocks pass `headingAs="h3"` and its two contact-form headings carry a visually hidden "(light)" / "(dark)" so the forced-theme copies no longer trip axe's `heading-order` and `landmark-unique`; nothing in `components/` changed for that.
- Display weight: kept at 300. Only the two h1s (home, 404) and the form's thank-you line are weight 300; every h2/h3 already uses `font-normal`. Compared at 1x and 2x, 1400px and 375px, on dark paper: 300 reads cleanly and 400 loses the hairline character, so no `[data-theme="dark"]` rule was added to `globals.css`.
- `dark:` in a shared primitive, first instance: `PhotoFrame`'s `dark:brightness-90` is the first `dark:` utility inside `components/ui`. The variant is `[data-theme="dark"] *`, so when `<html>` is dark it also matches inside the kitchen sink's forced-`light` column (the step 2 note: a wrapper can force dark, not force light back). Dev-only and accepted; do not chase it when comparing photo treatments on `/kitchen-sink`, compare on the real routes.
- Verified by computed style, not assumed: the global `:focus-visible` ring (2px ink, 3px offset) applies to every tabbable element in both themes (skip link, wordmark, nav links, theme toggle, every band and stub button, TikTok fallback links, the form's inputs, select, date inputs, textarea, submit, Airbnb and card links); `prefers-reduced-motion: reduce` zeroes every transition (`transitionDuration` is `0s` on the toggle, nav links, buttons, footer links); the honeypot is script-focusable, `tabIndex -1`, and never reached by Tab; native date inputs report `color-scheme: dark` in dark. One h1 per public route; landmarks are `banner`, `navigation` (named "Primary"; the property page adds a second nav named by "Other houses"), `main`, `contentinfo`; every image has alt from content (`[TBC]` placeholders kept). The kitchen sink has two h1s by design (two forced-theme copies) and is dev-only.
- Known, left as is: `hairline` on paper is 1.2:1, so form-input and button borders are below the 3:1 WCAG 1.4.11 target for component boundaries; this is the artifact's design, axe does not test it, and inputs carry labels and placeholders. Map water/park on the ground are 2.6 / 2.0 light (3.8 / 4.0 dark); the SVG carries a full `<desc>` and the legend is text, so the colours are not the only carrier. Both would need token value changes, which are out of scope until the palette is approved.
- Also known, markup rather than treatment, so left for **step 13** (or whoever next touches these components) rather than changed here: the theme toggle's `aria-label` changes on every click while the button keeps focus, which most screen readers do not re-announce (a visually hidden `aria-live="polite"` status beside it would fix that); `Button` with `external` and the TikTok handle link open new tabs with no "(opens in a new tab)" hint (adding an `sr-only` span changes those links' accessible names, so the specs that match them by name need checking at the same time); the contact form's required fields carry no `required` / `aria-required`, relying on the "(optional)" hints and the server-side errors; the `aria-live` on the live widget's "Loading…" line never announces anything because the text exists at mount and leaves via `display:none`. `check:colors` does not catch Tailwind's default palette (`bg-gray-100`, `text-red-600`); the robust fix is `--color-*: initial;` in `@theme` in `globals.css` once the palette is approved, or a second pattern in the script.
- **Step 13:** `e2e/a11y.spec.ts` (default `chromium` project) runs `@axe-core/playwright` 4.13 with axe's default rule set (WCAG 2.x A/AA plus best-practice) on `/`, `/stays/oak-hill`, and `/does-not-exist` in light and dark (six tests); the theme is set with `page.emulateMedia({ colorScheme })` and `html[data-theme]` plus the toggle's `data-mode` are asserted before `analyze()`. `serious` / `critical` fail; `moderate` / `minor` are `console.log`ged and attached to the report as `axe-advisory-<route>-<theme>`. No rule is disabled. As of this PR axe reports zero violations of any impact on all six combinations (also clean at 375px and on the other two stays, checked by hand). `e2e/visual.spec.ts` (default project, viewport 1400×900) scrolls the page to load lazy images, waits for fonts, and writes `e2e/__screenshots__/{home,stays-oak-hill}-{light,dark}.png` with `page.screenshot({ fullPage: true, animations: "disabled" })`; no `toHaveScreenshot`, no pixel comparison. The four PNGs are committed as review aids and are overwritten on every run, so step 13 may gitignore `e2e/__screenshots__/` and upload it as a CI artifact instead. Both specs abort `tiktok.com` / `tiktokcdn-us.com` like `home.spec.ts`. `pnpm check:colors` (`scripts/check-colors.ts`) is the raw-colour grep as a failing check (hex, `rgb(`/`hsl(`/`oklch(`, bare `white`/`black` under `components/` and `app/`), exempting `app/globals.css`, `app/opengraph-image.tsx`, `app/stays/[slug]/opengraph-image.tsx`, `components/seo/MonogramIcon.tsx`, and `app/icon.svg`; add it to CI next to `check:content`. No existing spec assertion changed: the raw `rgb(...)` values in `theme.spec.ts` and `home.spec.ts` still hold because no token moved. `package.json` gained only the `@axe-core/playwright` devDependency and the `check:colors` script.
- **Step 14:** once real photos land, look at `dark:brightness-90` in `PhotoFrame` on them in dark mode and tune the one value there (real photos may want `.85`; the placeholders could not settle that). The dark palette is still unapproved; the measured ratios above are the baseline for that decision. The live Hospitable iframe is third-party and light-only; it was not audited (stub mode in every spec) and the a11y spec will not see it either, so on the production domain run axe (browser extension or `pnpm test:e2e e2e/a11y.spec.ts` against the live URL) on `/stays/fire-side` with the real widget, and check the iframe has a title. The TikTok player is blocked in every spec; on the live domain confirm the fallback hides once the player loads and that the player iframe does not trap keyboard focus.

### Step 13 — Test suite and CI

```
Step 13 of 14: Complete the Playwright smoke suite and CI.

- Consolidate `e2e/`: `home.spec.ts` (sections, band links, search stub), `stays.spec.ts` (all three slugs render, widget stub with correct name, Airbnb link attrs, 404 on bad slug), `theme.spec.ts` (toggle sets data-theme, persists on reload, respects system via `colorScheme` emulation), `contact-api.spec.ts`, `contact-form.spec.ts`, `hospitable.spec.ts`, `a11y.spec.ts`, `seo.spec.ts` (sitemap, robots, OG images, JSON-LD present).
- `playwright.config.ts`: chromium only, `webServer` runs `pnpm build && pnpm start` with `NEXT_PUBLIC_HOSPITABLE_MODE=stub`, `reuseExistingServer` locally, retries 1 in CI, trace on first retry.
- `.github/workflows/ci.yml`: cache pnpm, run `check:content`, lint, typecheck, build, e2e; upload the Playwright report as an artifact on failure. Add a `pnpm test` alias.
- Make sure the suite runs in under about two minutes.

Done when CI is green on the PR and the report artifact appears on a deliberately failing run (then fix it).
```

**Notes from step 13 (read before step 14):**

- Final spec list, all in `e2e/`. The `chromium` project (port 3000, default build, stub mode) runs every file except `*.live.spec.ts`: `home.spec.ts` (title and hero, the four anchored sections, band links and the t.b.c. gaps, search stub and TikTok fallback with every TikTok request aborted, CityMap pins and recolour, hosts / practicals / direct, plus the site shell: header links and toggle, `main#main`, footer contact line, the three STR licences, the skip link as first tab stop); `stays.spec.ts` (for each of the three slugs: title, h1, back link, booking panel, the stub naming that house, the Airbnb link attributes, the other-house links; gallery count and spec strip; practicals subset and highlighted map; sticky panel by viewport; and the branded 404 with status 404 for both `/stays/nope`, via `proxy.ts`, and `/does-not-exist`, via Next's not-found); `theme.spec.ts` (dark on first visit under `colorScheme: dark`, light under light, a live `emulateMedia` flip with nothing in `localStorage` and the stored choice winning afterwards, the toggle cycle with persistence across reload, `font-display` resolving to Newsreader); `contact-api.spec.ts` (eight `request`-fixture cases on `POST /api/contact`); `contact-form.spec.ts` (six browser cases: mount and honeypot, full submit, inline 400 errors, pending + 429, 500, aborted request); `hospitable.spec.ts` (stub mode makes no request to `hsptb.com`; the `Content-Security-Policy-Report-Only` header on `/`, `/stays/oak-hill`, `/does-not-exist` and no enforcing header); `seo.spec.ts` (sitemap, robots, four PNG routes, one `VacationRental` block per stay, `Organization` on `/`, canonical and OG tags on `/` and one stay, 404 for `/stays/nope`); `kitchen-sink.spec.ts` (404 in production); `a11y.spec.ts` (step 12: axe on `/`, `/stays/oak-hill`, `/does-not-exist` in light and dark, serious/critical fail); `visual.spec.ts` (step 12: four full-page screenshots into `e2e/__screenshots__/`). `e2e/shell.spec.ts` was folded into `home.spec.ts` and `stays.spec.ts` with every assertion kept. The `chromium-live` project (port 3001, second build with `NEXT_PUBLIC_HOSPITABLE_MODE=live` into `.next-live`) runs only `hospitable.live.spec.ts` (one script with the snippet's `data-*` attributes and one marker on `/stays/fire-side`, teardown and remount across client-side navigation, stub fallback plus a single warning for a house with no id, the search stub on `/`); the real loader is intercepted and never fetched. It was kept rather than replaced by a route-level intercept in the default build because mode is inlined at build time and the live build is the only coverage of the real loader shape. 65 tests (62 + 3) in about 15 seconds once the two servers are up. Step 12 merged while this PR was open and both of its specs were folded in on the rebase. Screenshots decision: `e2e/__screenshots__/` is gitignored (the four PNGs were untracked here) because `visual.spec.ts` overwrites them on every run and committed copies would dirty the tree after every `pnpm test`; CI uploads the folder as the `screenshots` artifact on every run instead, so a PR's review aids are on its Actions run.
- `playwright.config.ts`: the comment at the top lists which spec runs in which project; keep it current. `retries: 1` and `workers: 1` in CI, `trace: "on-first-retry"`, `reuseExistingServer` outside CI, 300 s server timeouts. Two environment pins on the default web server, both deliberate: `NEXT_PUBLIC_HOSPITABLE_MODE=stub` (so a `.env.local` with `live` cannot flip the widgets under the stub specs) and `NEXT_PUBLIC_SITE_URL=""` (`getSiteUrl()` treats empty as unset, so every absolute URL `seo.spec.ts` checks resolves to the test origin whatever `.env.local` says). The live server pins the same site URL and `NEXT_DIST_DIR=.next-live`. In CI both servers pipe stdout so a failed `pnpm build` shows its error in the job log.
- Rate-limit addresses: `next start` adds no `x-forwarded-for`, so every browser post would share the limiter's `unknown` bucket (5 per 10 minutes per server process). `contact-api.spec.ts` uses `203.0.113.10`–`.17`, one per test; `contact-form.spec.ts` sets `203.0.113.${50 + pid % 200}` for its whole file through `test.use({ extraHTTPHeaders })`, one address per worker process, and makes exactly one real valid post per run. Any new spec that submits the form for real must pick an address outside both ranges.
- CI (`.github/workflows/ci.yml`, one job on `ubuntu-latest`, Node from `.nvmrc`, pnpm store cached by `actions/setup-node`): install, `check:content`, `check:colors` (step 12's raw-colour grep), lint, `format:check`, `typecheck` (which runs `next typegen`), `playwright install --with-deps chromium`, then `pnpm test`. The explicit `pnpm build` step is gone: the two Playwright web servers build the stub copy and the live copy (two builds instead of three), and a build error fails the e2e step with the Next output under a `[WebServer]` prefix. `playwright-report/` is uploaded as an artifact on failure only (traces from the one retry are inside it); `e2e/__screenshots__/` is uploaded as `screenshots` on every run. Verified on PR #24: the artifact appeared on a deliberately failing assertion, a deliberately broken build failed the e2e step with the TypeScript error in the log, and the job was green on the fix. The job takes about 100 s end to end (install and checks about 30 s, browser install about 20 s, the e2e step about 45 s including both builds).
- `pnpm test` is an alias of `pnpm test:e2e`. Local gotchas, still true: run `nvm use` first; Playwright reuses whatever is already listening on ports 3000 and 3001, including another worktree's `next dev` (then `/kitchen-sink` answers 200 and the suite fails), so run `lsof -iTCP:3000 -sTCP:LISTEN` and `pkill -f next-server` before a run that must prove anything.
- **Step 14**, after deploying, re-run by hand against the production domain what CI cannot: the CSP header check from `hospitable.spec.ts` once the policy is enforcing (expect `Content-Security-Policy`, not the report-only key, and no console violations on `/`, a stay, and the 404); the live Hospitable loader on all three stay pages once the two missing property ids and the search snippet exist (the `chromium-live` spec only proves the shape with Fire Side's id and a fake loader; the real widget's ping also requires the house name on the page); and the SEO URLs from `seo.spec.ts` once `NEXT_PUBLIC_SITE_URL` is set (sitemap `<loc>`s, canonical, `og:image`, JSON-LD `url` and `image` must all carry the real `https://` origin, not `localhost:3000`). The contact form's real send is covered by the step 10 notes. The markup-level accessibility items the step 12 notes left for "step 13 or whoever next touches these components" (a live region for the toggle's changing label, a new-tab hint on external links, `aria-required` on the form's required fields) touch `components/**`, which this step did not own, so they are still open; whoever adds the new-tab hint must update the specs that match those links by accessible name.

### Step 14 — Go live

```
Step 14 of 14: Deploy and switch to live booking. Parts of this need a human with Vercel, DNS, Hospitable, and Resend access; do what you can and list exactly what remains.

1. Vercel: create the project from the GitHub repo (`vercel link`), framework Next.js, set env vars for Production and Preview: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HOSPITABLE_MODE=live` (production) / `stub` (preview), `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`. Enable Web Analytics in the Vercel dashboard.
2. Domain: add the custom domain to the Vercel project and output the DNS records the human must set.
3. Hospitable: fill `hospitable.propertyId` (the `data-property-id` from each house's dashboard snippet) for An Oak Hill Home and South Austin Stay in `content/properties.ts` from the values the human provides (Fire Side Home already has `2338068`). Paste the multi-property search widget snippet, set `searchWidgetId` in `content/site.ts`, and wire it in `components/hospitable/HospitableSearch.tsx` at the `TODO(step 14)`. Re-check the loader attributes in `lib/hospitable.ts` (`bookingWidgetAttributes`) against the real snippet and fix any mismatch.
4. Resend: confirm the sending domain is verified; send one real test inquiry and confirm receipt.
5. CSP: deploy with report-only, open each page in production, collect any violations from the console, add the missing origins to `lib/csp.ts`, then switch the header to enforcing `Content-Security-Policy`.
6. Replace remaining `[TBC]` content and placeholder photos with the real assets supplied by the human; run `pnpm check:content`.
7. Verify on the production domain: the booking widget loads for each house, a test booking reaches checkout, the search widget works, the theme toggle persists, and analytics events appear in Vercel.
8. Update README with the deploy and content-editing runbook.

Done when a real test booking reaches Hospitable checkout on all three property pages and the console shows no CSP violations.
```
