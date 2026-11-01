# The Austin Collection — remaining work

Steps 1–13 of the original plan (scaffold through test suite and CI) are
merged, as are the code parts of step 14 that did not need a live domain: all
three Hospitable property ids, the "check dates" search on the home hero and
`/search` (the site's own, see architecture.md), real house photos, guest quotes, and the `/area` guide. What the
site looks like today is in [`architecture.md`](architecture.md); how to run
and test it is in [`development.md`](development.md).

This file now lists only what is **not done yet**. Remove an item when it
ships, in the same PR.

Design reference: `design/artifact.html` (static, do not edit). Original
artifact: https://claude.ai/artifact/8bKWdaGXgFA41g5RrFBa32.

## 1. Go live (needs a human with Vercel, Hospitable, and Resend access)

Done: the Vercel project and the custom domain. Do the rest in order; each
later item depends on the earlier ones.

- [ ] **Resend.** Create the account, verify the sending domain, pick the
      `from` address (it must be on that domain), and decide the recipients
      (all three hosts or one shared inbox).
- [ ] **Vercel environment variables.** Add the three Resend values, and
      confirm the rest are set as below (and Web Analytics is enabled):

  | Variable                      | Production              | Preview                    |
  | ----------------------------- | ----------------------- | -------------------------- |
  | `NEXT_PUBLIC_SITE_URL`        | `https://<domain>`      | the preview origin or prod |
  | `NEXT_PUBLIC_HOSPITABLE_MODE` | `live` → `native` (1b)  | `native`                   |
  | `RESEND_API_KEY`              | Resend key              | optional (dry run without) |
  | `CONTACT_FROM`                | `Name <addr@<domain>>`  | same as prod if key set    |
  | `CONTACT_TO`                  | comma-separated inboxes | same as prod if key set    |

  | `HOSPITABLE_PERSONAL_ACCESS_TOKEN` | Public API token | same (the search and the native widget need it) |
  | `HOSPITABLE_CUSTOM_SITE_ID`   | the widget's site uuid  | same                       |
  | `BOOKING_ADMIN_TOKEN`         | `openssl rand -hex 24`  | same or unset              |

  `HOSPITABLE_PERSONAL_ACCESS_TOKEN` is needed on Production now, before
  the switch to the native booking widget (1b): without it the "check dates"
  search on the home hero and `/search` shows only links to the three
  houses. It is read at build time for the home page, so redeploy after
  setting it.

  `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing
  them. Without `NEXT_PUBLIC_SITE_URL` every canonical, sitemap, OG, and
  JSON-LD URL says `http://localhost:3000`. Set all three Resend values
  together; a key without the two addresses makes `/api/contact` answer 500.
  Until then the form answers success but only logs each inquiry
  (`[contact] RESEND_API_KEY is not set; dry run` in the function log), so
  messages sent through the live site are not delivered.

- [ ] **Hospitable dashboard.**
  - [ ] Confirm the plan includes Direct with self-hosted widgets, and that
        Stripe/payments are set up in Hospitable Direct.
  - [ ] Style the widgets to match the paper palette (the booking iframe is
        styled only from the dashboard).
  - [ ] The loader's ping checks that the property's Hospitable name appears
        in the page text. If the live widget refuses to load on a house,
        compare its Hospitable listing name with `name` in
        `content/properties.ts`.
- [ ] **Apple Maps token.** Once the Apple Developer membership is active:
      Certificates, Identifiers & Profiles → Services → Maps → Tokens → (+),
      type **MapKit JS**, restriction **Domain** (the production domain,
      the Vercel preview domain, and `localhost` if wanted). Set it as
      `NEXT_PUBLIC_MAPKIT_TOKEN` for Production (and Preview) and redeploy.
      Until then the city map is the drawn SVG. Check the three `mapArea`
      positions in `content/properties.ts` look right on the real map.
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
  - [ ] A test booking reaches Hospitable checkout on all three house pages
        (with the native widget, see 1b; with the embed, through the iframe).
  - [ ] The hero "check dates" search lists the free houses on `/search`,
        and "Book these dates" opens each house page on that stay.
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

## 1b. Switch Production to the native booking widget

The widget, routes, comparison, admin check, e2e coverage and docs are all
merged (#36–#39 and the hardening PR; see "Booking widget and API" in
[`architecture.md`](architecture.md) and `CHANGELOG.md`). Vercel Preview
already runs `NEXT_PUBLIC_HOSPITABLE_MODE=native`. Production still embeds
Hospitable's widget; flipping it is a deliberate step, in this order, and
only with a go from the hosts.

- [ ] **Hospitable (human).** Set per-channel markups on Parkwood A
      (Oak Hill) and Dan Jean B (Fire Side); only Dan Jean Unit A (South
      Austin) has them, so it is the only house the price comparison is
      right for today (the other two show no comparison line, correctly).
      Check the Direct site's booking settings: the checkout currently says
      "This booking is non-refundable once accepted" while the API reports
      a refund-within-24-hours policy, and bookings are "Request to book"
      (the host must accept each one) rather than instant — decide both.
- [ ] **One real test booking on the Preview.** Pick Dan Jean Unit A,
      reserve with a real card, accept the request in Hospitable, confirm
      the reservation, the confirmation email, the lock code and the
      cleaner task all fire, then cancel and refund it in Hospitable.
- [ ] **Spot-check the comparison.** With `BOOKING_ADMIN_TOKEN` set on the
      Preview, call `/api/admin/comparison-check?propertyId=<uuid>&date=…`
      for two or three dates and compare `airbnbEstimate` with the Airbnb
      host calendar. A mismatch means the Airbnb markup in Hospitable has
      changed; the formula itself was verified on Nov 2 2026, Dec 31 2026
      and Feb 25 2027.
- [ ] **Vercel Production env.** `HOSPITABLE_PERSONAL_ACCESS_TOKEN`,
      `HOSPITABLE_CUSTOM_SITE_ID` and `BOOKING_ADMIN_TOKEN` present;
      `COMPARISON_ENABLED` unset or `true`. Then set
      `NEXT_PUBLIC_HOSPITABLE_MODE=native` for Production and redeploy
      (`NEXT_PUBLIC_*` is inlined at build time).
- [ ] **After the deploy.** On the production domain: pick dates on each
      house page and confirm a total appears; Reserve on Dan Jean A reaches
      the Hospitable checkout pre-filled; `booking_*` events appear in
      Vercel Web Analytics; the function log shows `[hospitable] GET …`
      lines and no `[booking:*]` errors. Keep the Airbnb link under the
      widget.
- [ ] **Rollback.** Set `NEXT_PUBLIC_HOSPITABLE_MODE=live` on Production and
      redeploy; the embedded widget returns and nothing else changes. The
      routes keep working either way.
- [ ] CSP: add `public.api.hospitable.com` only if the browser ever calls it
      directly (the routes are server-side, so it should not; the e2e suite
      asserts the browser makes no off-site request).
- [ ] Later, if latency on cold starts matters: the calendar and property
      caches are per function instance; a shared cache (Upstash, like the
      rate limiter note below) would make the first request on a new
      instance as fast as the rest.

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
- [ ] The live domain in `site.domain` (`content/site.ts`; still `[TBC]`).
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

- [ ] Whether a privacy policy page is needed (the contact form collects a
      name and email; analytics is cookieless).
- [ ] Whether to move the repo to a GitHub org (nothing depends on it).
- [ ] Shared rate limiting: the contact limiter is in memory per function
      instance. Swap in Upstash (see the comment in `lib/rateLimit.ts`)
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
      utilities like `bg-gray-100`. Now that the palette is approved, add
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
