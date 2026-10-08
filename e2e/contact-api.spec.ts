import { type APIRequestContext, expect, test } from "@playwright/test";

/*
 * Runs in the default `chromium` project against the production build with no
 * RESEND_API_KEY, so every "send" is the dry-run path (payload logged, 200).
 *
 * The limiter is keyed on `x-forwarded-for`, so each test posts from its own
 * made-up address and the tests can run in parallel without sharing a bucket.
 */

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
  test("a valid inquiry returns 200 ok", async ({ request }) => {
    const response = await post(request, "203.0.113.10", validInquiry);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("a filled honeypot returns 200 ok without validating", async ({
    request,
  }) => {
    const response = await post(request, "203.0.113.11", {
      ...validInquiry,
      email: "not-an-email",
      website: "https://spam.example",
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("an invalid email returns 400 with a field error", async ({
    request,
  }) => {
    const response = await post(request, "203.0.113.12", {
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
  }) => {
    const response = await post(request, "203.0.113.13", {
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
  }) => {
    const response = await post(request, "203.0.113.14", {
      ...validInquiry,
      property: "not-a-house",
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("property");
  });

  test("a body that is not JSON returns 400", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: "name=Taylor",
      headers: {
        "content-type": "text/plain",
        "x-forwarded-for": "203.0.113.15",
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  test("the sixth inquiry from one address in a row returns 429", async ({
    request,
  }) => {
    const ip = "203.0.113.16";
    for (let i = 0; i < 5; i++) {
      const response = await post(request, ip, validInquiry);
      expect(response.status(), `request ${i + 1}`).toBe(200);
    }
    const sixth = await post(request, ip, validInquiry);
    expect(sixth.status()).toBe(429);
    expect((await sixth.json()).ok).toBe(false);
    expect(sixth.headers()["retry-after"]).toMatch(/^\d+$/);

    // Another address is unaffected.
    const other = await post(request, "203.0.113.17", validInquiry);
    expect(other.status()).toBe(200);
  });

  test("GET is not allowed", async ({ request }) => {
    const response = await request.get("/api/contact");
    expect(response.status()).toBe(405);
  });
});
