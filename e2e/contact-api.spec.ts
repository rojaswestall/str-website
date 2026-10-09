import {
  type APIRequestContext,
  expect,
  test,
  type TestInfo,
} from "@playwright/test";

/*
 * Runs in the default `chromium` project against the production build with no
 * RESEND_API_KEY, so every "send" is the dry-run path (payload logged, 200).
 *
 * The limiter is keyed on `x-forwarded-for`, so each test posts from its own
 * made-up address and the tests can run in parallel without sharing a bucket.
 * The addresses are in the IPv6 documentation prefix (2001:db8::/32) and
 * carry the worker pid and the retry number, so no two attempts ever share a
 * bucket: the limiter keeps a full bucket for ten minutes, and the 429 test
 * would otherwise fail on a Playwright retry or on a second local run against
 * a reused server. contact-form.spec.ts uses 203.0.113.x; the two never meet.
 */
function address(testInfo: TestInfo, n: number) {
  const hi = (process.pid >>> 16).toString(16);
  const lo = (process.pid & 0xffff).toString(16);
  return `2001:db8:${hi}:${lo}:${testInfo.retry.toString(16)}::${n.toString(16)}`;
}

const validInquiry = {
  name: "Taylor Guest",
  email: "taylor@example.com",
  message: "Is the house a good fit for two adults and a dog in March?",
  property: "oak-hill",
  checkIn: "2027-03-12",
  checkOut: "2027-03-15",
  website: "",
};

function post(
  request: APIRequestContext,
  ip: string,
  data: Record<string, unknown>,
) {
  return request.post("/api/contact", {
    data,
    headers: { "x-forwarded-for": ip },
  });
}

test.describe("POST /api/contact", () => {
  test("a valid inquiry returns 200 ok", async ({ request }, testInfo) => {
    const response = await post(request, address(testInfo, 0), validInquiry);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("a filled honeypot returns 200 ok without validating", async ({
    request,
  }, testInfo) => {
    const response = await post(request, address(testInfo, 1), {
      ...validInquiry,
      email: "not-an-email",
      website: "https://spam.example",
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("an invalid email returns 400 with a field error", async ({
    request,
  }, testInfo) => {
    const response = await post(request, address(testInfo, 2), {
      ...validInquiry,
      email: "not-an-email",
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors).toHaveProperty("email");
    expect(body.errors).not.toHaveProperty("name");
  });

  test("checkout before check-in returns 400 on checkOut", async ({
    request,
  }, testInfo) => {
    const response = await post(request, address(testInfo, 3), {
      ...validInquiry,
      checkIn: "2027-03-15",
      checkOut: "2027-03-12",
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("checkOut");
  });

  test("an unknown property slug returns 400 on property", async ({
    request,
  }, testInfo) => {
    const response = await post(request, address(testInfo, 4), {
      ...validInquiry,
      property: "not-a-house",
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("property");
  });

  test("a body that is not JSON returns 400", async ({ request }, testInfo) => {
    const response = await request.post("/api/contact", {
      data: "name=Taylor",
      headers: {
        "content-type": "text/plain",
        "x-forwarded-for": address(testInfo, 5),
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  test("the sixth inquiry from one address in a row returns 429", async ({
    request,
  }, testInfo) => {
    const ip = address(testInfo, 6);
    for (let i = 0; i < 5; i++) {
      const response = await post(request, ip, validInquiry);
      expect(response.status(), `request ${i + 1}`).toBe(200);
    }
    const sixth = await post(request, ip, validInquiry);
    expect(sixth.status()).toBe(429);
    expect((await sixth.json()).ok).toBe(false);
    expect(sixth.headers()["retry-after"]).toMatch(/^\d+$/);

    // Another address is unaffected.
    const other = await post(request, address(testInfo, 7), validInquiry);
    expect(other.status()).toBe(200);
  });

  test("GET is not allowed", async ({ request }) => {
    const response = await request.get("/api/contact");
    expect(response.status()).toBe(405);
  });
});
