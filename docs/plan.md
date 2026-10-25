# The Austin Collection — remaining work

Steps 1–13 of the original plan (scaffold through test suite and CI) are
merged, as are the code parts of step 14 that did not need a live domain: all
three Hospitable property ids, the property search widget on the home hero and
`/search`, real house photos, guest quotes, and the `/area` guide. What the
site looks like today is in [`architecture.md`](architecture.md); how to run
and test it is in [`development.md`](development.md).

This file now lists only what is **not done yet**. Remove an item when it
ships, in the same PR.

Design reference: `design/artifact.html` (static, do not edit). Original
artifact: https://claude.ai/artifact/8bKWdaGXgFA41g5RrFBa32.

## 1. Go live (needs a human with Vercel, DNS, Hospitable, and Resend access)

Do these in order; each later item depends on the earlier ones.

- [ ] **Accounts and domain.** Pick the domain and who controls DNS; the
      Vercel account/team to deploy under; a Resend account.
- [ ] **Vercel project.** Create it from `rojaswestall/str-website`
      (framework Next.js, Node 24). Enable Web Analytics in the dashboard.
      Set the environment variables in the table below.

  | Variable                      | Production              | Preview                    |
  | ----------------------------- | ----------------------- | -------------------------- |
  | `NEXT_PUBLIC_SITE_URL`        | `https://<domain>`      | the preview origin or prod |
  | `NEXT_PUBLIC_HOSPITABLE_MODE` | `live`                  | `stub`                     |
  | `RESEND_API_KEY`              | Resend key              | optional (dry run without) |
  | `CONTACT_FROM`                | `Name <addr@<domain>>`  | same as prod if key set    |
  | `CONTACT_TO`                  | comma-separated inboxes | same as prod if key set    |

  `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing
  them. Without `NEXT_PUBLIC_SITE_URL` every canonical, sitemap, OG, and
  JSON-LD URL says `http://localhost:3000`. Set all three Resend values
  together; a key without the two addresses makes `/api/contact` answer 500.

- [ ] **Domain.** Add it to the Vercel project and set the DNS records
      Vercel shows.
- [ ] **Resend.** Verify the sending domain; `CONTACT_FROM` must be on it.
      Decide the recipients (all three hosts or one shared inbox).
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
  - [ ] A test booking reaches Hospitable checkout on all three house pages.
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
- [ ] Domain in `site.domain` (`content/site.ts`) once chosen.
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

- [ ] Approve or adjust the dark palette in `app/globals.css`. Measured
      contrast on paper (light / dark): ink 12.3 / 14.9, ink-soft 7.4 / 11.2,
      muted 5.2 / 6.6, accent 3.3 / 5.2 (accent is decoration only).
- [ ] Whether a privacy policy page is needed (the contact form collects a
      name and email; analytics is cookieless).
- [ ] Whether to move the repo to a GitHub org (nothing depends on it).
- [ ] Shared rate limiting: the contact limiter is in memory per function
      instance. Swap in Upstash (see the comment in `lib/contact/rateLimit.ts`)
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
      utilities like `bg-gray-100`. Once the palette is approved, add
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
