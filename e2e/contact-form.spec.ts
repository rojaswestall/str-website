import { expect, type Page, type Route, test } from "@playwright/test";

/*
 * Runs in the default `chromium` project against the production build with no
 * RESEND_API_KEY, so a successful submit is the dry-run path (payload logged,
 * 200) and the success state here is exactly what a real send shows.
 *
 * The limiter is keyed on `x-forwarded-for` and `next start` on localhost does
 * not set it, so without this header every browser post in the whole suite
 * would share one bucket. Each real submission below is made from this file's
 * own address; the 429, 500, and offline paths are intercepted and never reach
 * the route, so one run costs the limiter a single valid inquiry. The address
 * varies per worker process (203.0.113.50–249, clear of contact-api.spec.ts's
 * .10–.17) so repeated local runs against a reused server do not hit the
 * five-per-ten-minutes limit.
 */
test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `203.0.113.${50 + (process.pid % 200)}`,
  },
});

const inquiry = {
  name: "Taylor Guest",
  email: "taylor@example.com",
  property: "oak-hill",
  checkIn: "2027-03-12",
  checkOut: "2027-03-15",
  message: "Is the house a good fit for two adults and a dog in March?",
};

const form = (page: Page) =>
  page.getByRole("form", { name: "Ask us anything before you book" });

async function fillForm(page: Page, values = inquiry) {
  const f = form(page);
  await f.getByLabel("Name").fill(values.name);
  await f.getByLabel("Email").fill(values.email);
  await f.getByLabel("House").selectOption(values.property);
  await f.getByLabel("Check-in").fill(values.checkIn);
  await f.getByLabel("Check-out").fill(values.checkOut);
  await f.getByLabel("Message").fill(values.message);
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

test.describe("contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#direct");
  });

  test("sits under the mono heading in Why book direct", async ({ page }) => {
    const slot = page
      .locator("section#direct")
      .getByTestId("contact-form-slot");
    await expect(slot).toBeVisible();
    await expect(
      slot.getByRole("heading", {
        level: 3,
        name: "Ask us anything before you book",
      }),
    ).toBeVisible();
    const f = form(page);
    await expect(f.getByLabel("House")).toHaveValue("");
    await expect(f.getByLabel("House").locator("option")).toHaveText([
      "General",
      "An Oak Hill Home",
      "South Austin Stay",
      "Fire Side Home",
    ]);
    await expect(
      f.getByRole("button", { name: "Send message" }),
    ).toHaveAttribute("type", "submit");
    // The honeypot is in the DOM but not for people: off-screen, aria-hidden, untabbable.
    const honeypot = f.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).toHaveAttribute("autocomplete", "off");
    // Off-screen, not display:none (Playwright counts off-screen as "visible").
    await expect(honeypot).not.toBeInViewport();
    expect(
      await honeypot.evaluate((el) => getComputedStyle(el).display),
    ).not.toBe("none");
    // aria-hidden keeps it out of the accessibility tree (getByRole honours that).
    await expect(f.getByRole("textbox", { name: "Website" })).toHaveCount(0);
  });

  test("submits every field as entered and shows the success state", async ({
    page,
  }) => {
    await fillForm(page);
    const posted = page.waitForRequest(
      (request) =>
        request.url().endsWith("/api/contact") && request.method() === "POST",
    );
    const answered = page.waitForResponse("**/api/contact");
    await form(page).getByRole("button", { name: "Send message" }).click();

    const request = await posted;
    expect(request.headers()["content-type"]).toContain("application/json");
    expect(request.postDataJSON()).toEqual({ ...inquiry, website: "" });
    expect((await answered).status()).toBe(200);

    const success = page.getByTestId("contact-form-success");
    await expect(success).toBeVisible();
    await expect(success).toHaveAttribute("role", "status");
    await expect(success).toContainText("Thank you");
    await expect(success).toBeFocused();
    await expect(success).toContainText("We reply within the hour, usually");
    await expect(form(page)).toHaveCount(0);
  });

  test("renders the API's field errors inline and clears them on edit", async ({
    page,
  }) => {
    await fillForm(page, {
      ...inquiry,
      email: "not-an-email",
      checkIn: "2027-03-15",
      checkOut: "2027-03-12",
    });
    const f = form(page);
    await f.getByRole("button", { name: "Send message" }).click();

    const email = f.getByLabel("Email");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const errorId = await email.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const emailError = page.locator(`#${errorId}`);
    await expect(emailError).toHaveText("Enter a valid email address.");
    await expect(email).toBeFocused();

    const checkOut = f.getByLabel("Check-out");
    await expect(checkOut).toHaveAttribute("aria-invalid", "true");
    await expect(f.getByText("Checkout must be after check-in.")).toBeVisible();

    await expect(f.getByLabel("Name")).not.toHaveAttribute("aria-invalid");
    await expect(page.getByTestId("contact-form-success")).toHaveCount(0);
    await expect(page.getByTestId("contact-form-error")).toHaveCount(0);
    await expect(f.getByRole("button", { name: "Send message" })).toBeEnabled();

    // Editing the field drops its error; the other one stays until resubmit.
    await email.fill("taylor@example.com");
    await expect(email).not.toHaveAttribute("aria-invalid");
    await expect(emailError).toHaveCount(0);
    await expect(checkOut).toHaveAttribute("aria-invalid", "true");
  });

  test("shows the pending label, then the API's message on 429", async ({
    page,
  }) => {
    const message =
      "Too many messages in a short time. Please try again later.";
    // Hold the response until the pending state has been asserted, so the
    // test never races a timer.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/contact", async (route) => {
      await gate;
      await json(route, 429, { ok: false, message });
    });
    await fillForm(page);
    const f = form(page);
    const button = f.getByRole("button", { name: /Send/ });
    await button.click();

    await expect(button).toHaveText("Sending…");
    await expect(button).toBeDisabled();
    release();

    const error = page.getByTestId("contact-form-error");
    await expect(error).toHaveText(message);
    await expect(error).toHaveAttribute("role", "alert");
    await expect(button).toHaveText("Send message");
    await expect(button).toBeEnabled();
    await expect(page.getByTestId("contact-form-success")).toHaveCount(0);
    // The fields keep what the guest typed.
    await expect(f.getByLabel("Message")).toHaveValue(inquiry.message);
  });

  test("shows the API's generic message on 500", async ({ page }) => {
    const message =
      "We couldn't send your message just now. Please try again or email us directly.";
    await page.route("**/api/contact", (route) =>
      json(route, 500, { ok: false, message }),
    );
    await fillForm(page);
    await form(page).getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-form-error")).toHaveText(message);
    await expect(page.getByTestId("contact-form-success")).toHaveCount(0);
  });

  test("falls back to a connection message when the request fails", async ({
    page,
  }) => {
    await page.route("**/api/contact", (route) => route.abort("failed"));
    await fillForm(page);
    await form(page).getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-form-error")).toHaveText(
      "We couldn't reach the server. Check your connection and try again.",
    );
    await expect(form(page)).toBeVisible();
  });
});
