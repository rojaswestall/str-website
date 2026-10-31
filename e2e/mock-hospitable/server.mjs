// A stand-in for the Hospitable Public API v2, for the native-mode e2e
// project. Playwright starts it (playwright.config.ts) and the native build
// is pointed at it with HOSPITABLE_API_BASE_URL, so the suite exercises the
// real routes, cache, retry, and widget end to end without a token or a
// network. Plain Node, no dependencies.
//
// Data: the one property is the recorded Dan Jean Unit A payload from
// lib/booking/__fixtures__/ (so its real markups, 11% direct and 15.5%
// Airbnb, drive the maths). Calendars are generated so the tests never age:
// weekdays are $112.00 base and Fridays/Saturdays $150.00, every day has a
// 2-night minimum, the 10th–12th of each month are RESERVED, and the 20th
// is closed to check-in. Quotes are priced from those rates exactly as
// Hospitable prices them (sub_total = Σ base × 1.11, a $151 cleaning fee,
// 6% state and 11% city tax on nights + cleaning).
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
const property = JSON.parse(
  readFileSync(new URL("property-danjean-a-bookings.json", fixtures), "utf8"),
).data;
const PROPERTY_ID = property.id;
const DIRECT_PCT =
  property.bookings?.listing_markups?.find((m) => m.platform === "direct")
    ?.markup ?? 11;

const WEEKDAY_BASE = 11200;
const WEEKEND_BASE = 15000;
const MIN_STAY = 2;
const CLEANING_FEE = 15100;
const STATE_TAX = 0.06;
const CITY_TAX = 0.11;

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

export function dayFor(iso) {
  const date = toUtc(iso);
  const weekday = date.getUTCDay();
  const dom = date.getUTCDate();
  const reserved = dom >= 10 && dom <= 12;
  const base = weekday === 5 || weekday === 6 ? WEEKEND_BASE : WEEKDAY_BASE;
  return {
    date: iso,
    min_stay: MIN_STAY,
    closed_for_checkin: dom === 20,
    closed_for_checkout: false,
    status: {
      available: !reserved,
      reason: reserved ? "RESERVED" : "AVAILABLE",
    },
    price: { amount: base, currency: "USD" },
  };
}

function calendar(start, end) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(dayFor(d));
  return { data: { days } };
}

function money(amount) {
  return { amount, formatted: `$${(amount / 100).toFixed(2)}` };
}

function quote(body) {
  const { checkin_date: checkIn, checkout_date: checkOut } = body;
  const nights = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(dayFor(d));
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
    (sum, n) => sum + Math.round(n.price.amount * (1 + DIRECT_PCT / 100)),
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
    return send(200, { data: [property] });
  }

  const match = url.pathname.match(
    /^\/v2\/properties\/([^/]+)\/(calendar|quote)$/,
  );
  if (!match)
    return send(404, { status_code: 404, reason_phrase: "Not Found" });
  const [, id, resource] = match;
  if (id !== PROPERTY_ID) {
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
    return send(200, calendar(start, end));
  }

  if (resource === "quote" && req.method === "POST") {
    const [status, body] = quote(await readBody(req));
    return send(status, body);
  }

  return send(405, { status_code: 405, reason_phrase: "Method Not Allowed" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-hospitable] listening on http://127.0.0.1:${PORT}`);
});
