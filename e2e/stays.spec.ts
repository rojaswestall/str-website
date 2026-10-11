import { expect, test } from "@playwright/test";

const HOUSES = [
  {
    slug: "oak-hill",
    name: "An Oak Hill Home",
    airbnb: "https://www.airbnb.com/rooms/1598934202273477463",
  },
  {
    slug: "south-austin",
    name: "South Austin Stay",
    airbnb: "https://www.airbnb.com/rooms/1655329029936239948",
  },
  {
    slug: "fire-side",
    name: "Fire Side Home",
    airbnb: "https://www.airbnb.com/rooms/1598953749522814358",
  },
];

test.describe("property pages", () => {
  for (const house of HOUSES) {
    test(`/stays/${house.slug} renders ${house.name} with its booking panel`, async ({
      page,
    }) => {
      await page.goto(`/stays/${house.slug}`);

      await expect(page).toHaveTitle(`${house.name} · The Austin Collection`);
      await expect(
        page.getByRole("heading", { level: 1, name: house.name }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to all stays" }),
      ).toHaveAttribute("href", "/#stays");

      // Booking panel: the widget stub names the house, the Airbnb link is secondary.
      const panel = page.locator("#book");
      await expect(
        panel.getByRole("heading", { level: 2, name: "Book direct" }),
      ).toBeVisible();
      await expect(panel.getByTestId("hospitable-stub")).toContainText(
        house.name,
      );
      await expect(panel).toContainText(
        "Same calendar as Airbnb, no platform fee",
      );
      const airbnb = panel.getByRole("link", { name: "Or view on Airbnb" });
      await expect(airbnb).toHaveAttribute("href", house.airbnb);
      await expect(airbnb).toHaveAttribute("target", "_blank");
      await expect(airbnb).toHaveAttribute("rel", "noopener noreferrer");

      // The other two houses, never this one.
      const others = page.getByRole("navigation", { name: "Other houses" });
      for (const other of HOUSES.filter((h) => h.slug !== house.slug)) {
        await expect(
          others.getByRole("link", { name: other.name }),
        ).toHaveAttribute("href", `/stays/${other.slug}`);
      }
      await expect(others.getByRole("link", { name: house.name })).toHaveCount(
        0,
      );
    });
  }

  test("shows the gallery, the spec strip with unconfirmed values, and no quotes", async ({
    page,
  }) => {
    await page.goto("/stays/fire-side");

    // Hero plus the 30 gallery photos listed for fire-side in content/photos.ts.
    await expect(page.getByTestId("gallery").getByRole("img")).toHaveCount(31);

    const specs = page.getByRole("list", { name: "Key facts" });
    await expect(specs).toContainText("Sleeps 8");
    await expect(specs).toContainText("2.5 bath");
    await expect(specs).toContainText("min nights t.b.c.");
    await expect(specs).toContainText("rate t.b.c.");

    await expect(
      page
        .getByRole("list", { name: "Amenities" })
        .or(page.getByRole("heading", { name: "Amenities" })),
    ).toBeVisible();
    await expect(page.getByText("fire pit", { exact: true })).toBeVisible();

    // Review quotes are an open item: nothing is rendered until they exist.
    await expect(page.getByTestId("guest-quotes")).toHaveCount(0);
    await expect(page.getByText("What guests say")).toHaveCount(0);
  });

  test("shows every practicals row with the booking FAQ, and the map with this house highlighted", async ({
    page,
  }) => {
    await page.goto("/stays/south-austin");

    const section = page.locator("section#practicals");
    await expect(
      section.getByRole("heading", { level: 2, name: "Practicals" }),
    ).toBeVisible();
    const practicals = section.getByTestId("practicals");
    for (const term of [
      "Check-in",
      "Check-out",
      "Cleaning",
      "Pets",
      "Cancellation",
      "Questions",
    ]) {
      await expect(
        practicals.locator("dt", { hasText: new RegExp(`^${term}$`) }),
      ).toHaveCount(1);
    }
    const faq = practicals.getByTestId("practicals-faq");
    await expect(
      faq.getByRole("heading", { level: 3, name: "Booking direct" }),
    ).toBeVisible();
    await expect(faq.locator("dt")).toHaveCount(3);
    await expect(faq).toContainText(
      "How does payment work when I book direct?",
    );

    const map = page.getByTestId("city-map");
    await expect(map.locator("[data-map-pin]")).toHaveCount(3);
    await expect(
      map.locator("[data-map-pin][data-highlighted]"),
    ).toHaveAttribute("data-map-pin", "south-austin");
    await expect(map).toContainText("South Austin · this house");
  });

  test("the booking column is sticky on wide screens and stacks on phones", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/stays/oak-hill");
    const position = () =>
      page.locator("#book").evaluate((el) => getComputedStyle(el).position);
    await expect.poll(position).toBe("sticky");

    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(position).toBe("static");
    // The narrow layout offers a jump to the panel instead.
    await expect(
      page.getByRole("main").getByRole("link", { name: "Book direct" }),
    ).toHaveAttribute("href", "#book");
  });

  // `/stays/nope` gets its 404 status from the slug check in proxy.ts (the
  // route's fallback shell would otherwise answer 200); `/does-not-exist` is
  // Next's own not-found path. Both must render the full branded shell.
  for (const path of ["/stays/nope", "/does-not-exist"]) {
    test(`${path} renders the branded 404 with status 404`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle("Page not found · The Austin Collection");
      await expect(
        page.getByRole("heading", { level: 1, name: /isn.t one of ours/ }),
      ).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(
        page
          .getByRole("main")
          .getByRole("link", { name: "Back to the houses" }),
      ).toHaveAttribute("href", "/");
    });
  }
});
