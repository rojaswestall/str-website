# Phase 0 discovery notes (Hospitable Public API v2)

Captured 2026-10-25 against the live account with plain `fetch` calls
(`Authorization: Bearer <PAT>` against `https://public.api.hospitable.com/v2`).
The responses the unit tests need are kept verbatim in
`lib/booking/__fixtures__/`, with street addresses, coordinates and host
names redacted because the repo is public; everything else learned is
written up here.

## Properties (`GET /properties?include=listings`)

| Name            | Hospitable id                          | Widget id (`booking_url`) | Airbnb listing      | Direct markup | Airbnb markup |
| --------------- | -------------------------------------- | ------------------------- | ------------------- | ------------- | ------------- |
| Parkwood A      | `2bfb62de-2f47-409f-b276-a47d5b405043` | 2338067                   | 1598934202273477463 | 0%            | 0%            |
| Dan Jean B      | `cb8bcbdd-75f6-49f4-b9a5-cea0b8df861d` | 2338068                   | 1598953749522814358 | 0%            | 0%            |
| Dan Jean Unit A | `02f700e5-a510-4c4f-b9f6-9d4bebdf499a` | 2338069                   | 1655329029936239948 | 11%           | 15.5%         |

**Decision (2026-10-25):** only Dan Jean Unit A has the per-channel markups
configured, so it is the development and test property. Parkwood A and
Dan Jean B are ignored for now; the widget reads markups per property from
the API, so they pick up the comparison automatically once markups are set.

**Airbnb check (2026-10-25, Dan Jean Unit A):** the Airbnb host calendar
shows `floor(base × 1.155)` to the dollar on all three dates checked, so
the comparison formula is verified against real Airbnb numbers.

| Date       | Calendar base | floor(base × 1.155) | Airbnb host calendar |
| ---------- | ------------- | ------------------- | -------------------- |
| 2026-11-02 | $112          | $129                | $129                 |
| 2026-12-31 | $223          | $257                | $257                 |
| 2027-02-25 | $203          | $234                | $234                 |

All three: `listed: true`, `currency: USD`, `capacity.max: 8`, 3 bedrooms,
check-in 16:00 / check-out 10:00, pets allowed, `calendar_restricted: false`.
`timezone` comes back as the UTC offset string `"-0500"`, not an IANA zone,
so date logic uses `America/Chicago` from config.

Markups and fees come from `GET /properties/{id}?include=bookings` →
`data.bookings.listing_markups[]` (`{platform, type: "percent", markup}`),
`data.bookings.fees[]` (cleaning_fee $151 on all three),
`occupancy_based_rules.pet_fee` ($150 fixed), `discounts[]` (weekly/monthly %).

## Calendar (`GET /properties/{id}/calendar?start_date&end_date`)

`data.days[]`, one entry per date inclusive of both ends:

| Need                   | Field                 | Notes                                                                                                                                |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| date                   | `date`                | `YYYY-MM-DD`                                                                                                                         |
| available              | `status.available`    | boolean                                                                                                                              |
| booked vs host-blocked | `status.reason`       | `AVAILABLE`, `RESERVED` (`source_type: RESERVATION`), `BLOCKED` (`source_type: AVAILABILITY_WINDOW` seen at the booking-window edge) |
| nightly price          | `price.amount`        | **integer cents** (`30500` = `$305.00`); `price.formatted` is the display string                                                     |
| min stay               | `min_stay`            | integer nights; **check-in-day based** (a 2-night stay starting on a min-2 day that crosses a min-3 night quotes fine)               |
| closed to arrival      | `closed_for_checkin`  | boolean                                                                                                                              |
| closed to departure    | `closed_for_checkout` | boolean                                                                                                                              |

`data.provider` is `airbnb-official` and `data.listing_id` is the Airbnb
listing id, but `price.amount` equals the PriceLabs recommended price
(pre-markup base) for every date checked.

## Quote (`POST /properties/{id}/quote`)

Request body (verified):

```json
{
  "checkin_date": "2026-11-02",
  "checkout_date": "2026-11-04",
  "guests": { "adults": 2, "children": 0, "infants": 0, "pets": 0 },
  "custom_site_id": "<data-site-uuid from the Hospitable widget embed>",
  "guest_details": {
    "first_name": "…",
    "last_name": "…",
    "email": "…",
    "phone": "+1…"
  }
}
```

Response `data`: `quote_id`, `booking_url`
(`https://booking.hospitable.com/book/external/{widgetPropertyId}/{quote_id}`),
`currency`, `financials.{fees[], taxes[], discounts[], totals.{sub_total,
total_fees, total, total_without_taxes}}`. Every money line is
`{amount: <int cents>, formatted, label, category}`.

- **No nightly breakdown** in the Public API response; `sub_total` is the
  sum of nights. `sub_total` = Σ calendar `price.amount` × (1 + direct
  markup) exactly for both properties checked ($263.00 at 0%, $248.64 =
  $224 × 1.11 at 11%).
- **No expiry field** anywhere in the response.
- `fees` always includes a `$0.00 Service fee` line (host-only fee model).
- `guest_details` works and pre-fills the hosted checkout (the checkout's
  own quote record carries the details). Email must pass real validation
  (`example.com` → 400); phone must be a real-looking number (`+1555…` →
  generic 422 "There was an issue creating the Quote."). Both errors below.

Error shape: `{status_code, reason_phrase, errors?}`.

| Case                       | Status | `reason_phrase`                                                                                     |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| unavailable night in range | 422    | `One or more dates within this period have been marked as unavailable. Oct 30, 2026, Oct 31, 2026`  |
| below min stay             | 422    | `The length of stay is below your minimum stay requirement for these dates.`                        |
| validation                 | 400    | `The guest details.email must be a valid email address.` + `errors: {"guest_details.email": [...]}` |
| missing field              | 400    | `The checkout date field is required.` + `errors`                                                   |
| rejected phone             | 422    | `There was an issue creating the Quote.` (no `errors`)                                              |

## Hosted checkout

`booking_url` loads an Angular "Guest Portal" app that fetches
`GET https://api.hospitable.com/bookings/api/properties/{widgetId}/quote/{quote_id}`
(unauthenticated). That record has `nightly_breakdown` (`{"2026-11-02": "130.00"}`),
`guest_details`, `cancellation_policy`, `num_guests`, and the same totals.
Not part of the Public API; noted only as a cross-check.
