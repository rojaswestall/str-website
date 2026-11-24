// A stand-in for the Hospitable Public API v2, for the native-mode e2e
// project. Playwright starts it (playwright.config.ts) and the native build
// is pointed at it with HOSPITABLE_API_BASE_URL, so the suite exercises the
// real routes, cache, retry, widget and search end to end without a token
// or a network. Plain Node, no dependencies.
//
// Data: all three houses, each built from the recorded Dan Jean Unit A
// payload in lib/booking/__fixtures__/ with its own id, capacity and house
// rules, plus a fourth "stranger" property content does not know, which the
// server must filter out. Calendars are generated so the tests never age;
// each house differs so a search has something to show:
//
//   South Austin (Dan Jean A, the recorded payload with its real 11% direct
//   and 15.5% Airbnb markups): weekdays $112.00 base, Fridays/Saturdays
//   $150.00, a 2-night minimum, the 10th–12th of each month RESERVED, the
//   20th closed to check-in.
//   Oak Hill (Parkwood A, no markups set, so the configured fallbacks
//   apply): $130.00 / $175.00, a 2-night minimum that is 3 nights when the
//   check-in is a Friday or Saturday, nothing blocked.
//   Fire Side (Dan Jean B): $98.00 / $140.00, no minimum, nothing blocked,
//   pets not allowed and a maximum of 4 guests.
//
// Quotes are priced from those rates exactly as Hospitable prices them
// (sub_total = Σ base × (1 + direct markup), a $151 cleaning fee, 6% state
// and 11% city tax on nights + cleaning).
//
// Knobs, all through the guest's last name on the final quote so a test can
// drive a path the calendar alone cannot:
//   "Unavailable"  → 422 "marked as unavailable" (someone booked meanwhile)
//   "Changed"      → the total comes back $10.00 higher than the first quote
//   "Upstream"     → 500
// And once per process the very first calendar read answers 503, so the
// server's single GET retry is what makes the first page load succeed.
//
// Only method, path and status are logged; never a body.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_HOSPITABLE_PORT ?? 3999);
const TOKEN = process.env.MOCK_HOSPITABLE_TOKEN ?? "e2e-hospitable-token";

const fixtures = new URL("../../lib/booking/__fixtures__/", import.meta.url);
const danJeanA = JSON.parse(
  readFileSync(new URL("property-danjean-a-bookings.json", fixtures), "utf8"),
).data;

const CLEANING_FEE = 15100;
const STATE_TAX = 0.06;
const CITY_TAX = 0.11;

const FRI_SAT = (iso) => {
  const weekday = toUtc(iso).getUTCDay();
  return weekday === 5 || weekday === 6;
};

/**
 * How each house's calendar is generated. `minStay`, `reserved` and
 * `closedForCheckin` take the date so a rule can depend on the weekday or
 * the day of the month.
 */
const SOUTH_AUSTIN = {
  weekdayBase: 11200,
  weekendBase: 15000,
  minStay: () => 2,
  reserved: (iso) => {
    const dom = toUtc(iso).getUTCDate();
    return dom >= 10 && dom <= 12;
  },
  closedForCheckin: (iso) => toUtc(iso).getUTCDate() === 20,
};
const OAK_HILL = {
  weekdayBase: 13000,
  weekendBase: 17500,
  minStay: (iso) => (FRI_SAT(iso) ? 3 : 2),
  reserved: () => false,
  closedForCheckin: () => false,
};
const FIRE_SIDE = {
  weekdayBase: 9800,
  weekendBase: 14000,
  minStay: () => 1,
  reserved: () => false,
  closedForCheckin: () => false,
};

function directPct(property) {
  return (
    property.bookings?.listing_markups?.find((m) => m.platform === "direct")
      ?.markup ?? 11
  );
}

/** Content's Hospitable ids (content/properties.ts); the stranger's is not. */
const HOUSES = [
  {
    property: {
      ...danJeanA,
      id: "2bfb62de-2f47-409f-b276-a47d5b405043",
      name: "Parkwood A",
      public_name: "An Oak Hill Home",
      bookings: { ...danJeanA.bookings, listing_markups: [] },
    },
    profile: OAK_HILL,
  },
  { property: danJeanA, profile: SOUTH_AUSTIN },
  {
    property: {
      ...danJeanA,
      id: "cb8bcbdd-75f6-49f4-b9a5-cea0b8df861d",
      name: "Dan Jean B",
      public_name: "Fire Side Home",
      capacity: { ...danJeanA.capacity, max: 4 },
      house_rules: { ...danJeanA.house_rules, pets_allowed: false },
    },
    profile: FIRE_SIDE,
  },
  {
    property: {
      ...danJeanA,
      id: "9d1f5b1e-6c2a-4b8e-9a3f-0d6c1e2f3a4b",
      name: "Stranger",
      public_name: "Not one of ours",
    },
    profile: FIRE_SIDE,
  },
];
const byId = new Map(HOUSES.map((h) => [h.property.id, h]));

let calendarFailuresLeft = 1;

function toUtc(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUtc(date) {
  return date.toISOString().slice(0, 10);
}
function addDays(iso, days) {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

export function dayFor(iso, profile = SOUTH_AUSTIN) {
  const reserved = profile.reserved(iso);
  const base = FRI_SAT(iso) ? profile.weekendBase : profile.weekdayBase;
  return {
    date: iso,
    min_stay: profile.minStay(iso),
    closed_for_checkin: profile.closedForCheckin(iso),
    closed_for_checkout: false,
    status: {
      available: !reserved,
      reason: reserved ? "RESERVED" : "AVAILABLE",
    },
    price: { amount: base, currency: "USD" },
  };
}

function calendar(start, end, profile) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push(dayFor(d, profile));
  }
  return { data: { days } };
}

function money(amount) {
  return { amount, formatted: `$${(amount / 100).toFixed(2)}` };
}

function quote(body, house) {
  const { checkin_date: checkIn, checkout_date: checkOut } = body;
  const nights = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
    nights.push(dayFor(d, house.profile));
  }
  const pct = directPct(house.property);
  const lastName = body.guest_details?.last_name ?? "";

  if (!body.custom_site_id) {
    return [
      422,
      {
        status_code: 422,
        reason_phrase: "The custom site id field is required.",
      },
    ];
  }
  if (lastName === "Upstream") {
    return [500, { status_code: 500, reason_phrase: "Server Error" }];
  }
  if (nights.length === 0) {
    return [
      422,
      {
        status_code: 422,
        reason_phrase: "The checkout date must be after the checkin date.",
      },
    ];
  }
  if (lastName === "Unavailable" || nights.some((n) => !n.status.available)) {
    return [
      422,
      {
        status_code: 422,
        reason_phrase: `One or more dates within this period have been marked as unavailable. ${checkIn}`,
      },
    ];
  }
  if (nights.length < nights[0].min_stay) {
    return [
      422,
      {
        status_code: 422,
        reason_phrase:
          "The length of stay is below your minimum stay requirement for these dates.",
      },
    ];
  }

  const subTotal = nights.reduce(
    (sum, n) => sum + Math.round(n.price.amount * (1 + pct / 100)),
    0,
  );
  const fees = [
    { ...money(CLEANING_FEE), label: "Cleaning fee", category: "Guest fees" },
    { ...money(0), label: "Service fee", category: "Guest fees" },
  ];
  if (lastName === "Changed") {
    fees.push({
      ...money(1000),
      label: "Updated pricing",
      category: "Guest fees",
    });
  }
  const feeTotal = fees.reduce((sum, f) => sum + f.amount, 0);
  const taxable = subTotal + feeTotal;
  const taxes = [
    {
      ...money(Math.round(taxable * STATE_TAX)),
      label: "State lodging tax",
      category: "Taxes",
    },
    {
      ...money(Math.round(taxable * CITY_TAX)),
      label: "City lodging tax",
      category: "Taxes",
    },
  ];
  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  const quoteId = randomUUID();
  return [
    200,
    {
      data: {
        quote_id: quoteId,
        booking_url: `https://booking.hospitable.com/book/external/2338069/${quoteId}`,
        currency: "USD",
        financials: {
          fees,
          taxes,
          discounts: [],
          totals: {
            sub_total: { ...money(subTotal), label: "Sub Total" },
            total: { ...money(taxable + taxTotal), label: "Total Price" },
          },
        },
      },
    },
  ];
}

function readBody(req) {
  return new Promise((resolve) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(text || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
    console.log(`[mock-hospitable] ${req.method} ${url.pathname} ${status}`);
  };

  if (url.pathname === "/health") return send(200, { ok: true });

  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(401, { status_code: 401, reason_phrase: "Unauthenticated." });
  }

  if (req.method === "GET" && url.pathname === "/v2/properties") {
    return send(200, { data: HOUSES.map((h) => h.property) });
  }

  const match = url.pathname.match(
    /^\/v2\/properties\/([^/]+)\/(calendar|quote)$/,
  );
  if (!match)
    return send(404, { status_code: 404, reason_phrase: "Not Found" });
  const [, id, resource] = match;
  const house = byId.get(id);
  if (!house) {
    return send(404, { status_code: 404, reason_phrase: "Not Found" });
  }

  if (resource === "calendar" && req.method === "GET") {
    if (calendarFailuresLeft > 0) {
      calendarFailuresLeft -= 1;
      return send(503, {
        status_code: 503,
        reason_phrase: "Service Unavailable",
      });
    }
    const start = url.searchParams.get("start_date");
    const end = url.searchParams.get("end_date");
    if (!start || !end) {
      return send(422, {
        status_code: 422,
        reason_phrase: "The start date field is required.",
      });
    }
    return send(200, calendar(start, end, house.profile));
  }

  if (resource === "quote" && req.method === "POST") {
    const [status, body] = quote(await readBody(req), house);
    return send(status, body);
  }

  return send(405, { status_code: 405, reason_phrase: "Method Not Allowed" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-hospitable] listening on http://127.0.0.1:${PORT}`);
});
