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

  test("the gallery is a carousel that opens every photo in a pop-up", async ({
    page,
  }) => {
    await page.goto("/stays/fire-side");
    const gallery = page.getByTestId("gallery");
    const counter = gallery.getByTestId("gallery-counter");

    // Chevrons step through the carousel and wrap at the ends.
    await expect(counter).toContainText("01 / 31");
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await expect(counter).toContainText("02 / 31");
    await gallery.getByRole("button", { name: "Previous photo" }).click();
    await gallery.getByRole("button", { name: "Previous photo" }).click();
    await expect(counter).toContainText("31 / 31");
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await expect(counter).toContainText("01 / 31");

    // "Show all" opens the pop-up with every photo; the exit button closes it.
    const popup = page.getByTestId("all-photos");
    await gallery.getByRole("button", { name: "Show all 31 photos" }).click();
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("img")).toHaveCount(31);
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(popup).toHaveCount(0);

    // Clicking the grey area around the photos closes it too, and so does Escape.
    await gallery.getByRole("button", { name: "Show all 31 photos" }).click();
    await expect(popup).toBeVisible();
    await popup.click({ position: { x: 5, y: 300 } });
    await expect(popup).toHaveCount(0);
    await gallery.getByRole("button", { name: "Show all 31 photos" }).click();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);

    // The pop-up opens at the photo the carousel was on, and closing it hands
    // focus back to the button that opened it (by button and by Escape).
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await expect(counter).toContainText("03 / 31");
    const showAll = gallery.getByRole("button", { name: "Show all 31 photos" });
    await showAll.click();
    await expect(popup.locator('[data-photo-index="2"]')).toBeInViewport();
    await expect(popup.locator('[data-photo-index="0"]')).not.toBeInViewport();
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(showAll).toBeFocused();
    await showAll.click();
    await page.keyboard.press("Escape");
    await expect(showAll).toBeFocused();

    // Clicking the photo itself opens the pop-up too.
    await gallery
      .getByRole("button", { name: "Open all photos" })
      .first()
      .click();
    await expect(popup).toBeVisible();
  });

  test("shows the gallery, the spec strip with unconfirmed values, and the guest quotes", async ({
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

    // This house's three Airbnb quotes, each with the guest's name and month.
    const quotes = page.getByTestId("guest-quotes");
    await expect(
      quotes.getByRole("heading", { level: 2, name: "What guests say" }),
    ).toBeVisible();
    await expect(quotes.locator("blockquote")).toHaveCount(3);
    // The same slideshow as the home page: one review showing, chevrons step.
    const current = quotes.locator("li[data-current]");
    await expect(current).toHaveCount(1);
    await expect(current.locator("figcaption")).toContainText("Alexander");
    await expect(quotes.getByTestId("review-counter")).toHaveText("01 / 03");
    await quotes.getByRole("button", { name: "Next review" }).click();
    await expect(quotes.getByTestId("review-counter")).toHaveText("02 / 03");
    await expect(current.locator("figcaption")).not.toContainText("Alexander");
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

  test("lists the closest area picks with this house's drive time and links to /area", async ({
    page,
  }) => {
    await page.goto("/stays/oak-hill");
    const nearby = page.getByTestId("nearby-picks");
    await expect(
      nearby.getByRole("heading", { level: 2, name: "Near this house" }),
    ).toBeVisible();
    const items = nearby.locator("li");
    await expect(items).toHaveCount(3);
    // Each pick links to its entry on the guide page.
    for (const id of ["eat", "outdoors", "local"]) {
      await expect(nearby.locator(`a[href="/area#${id}"]`)).toHaveCount(1);
    }
    // Drive times are open items: one t.b.c. gap per pick, never a number.
    await expect(items.filter({ hasText: "drive time t.b.c." })).toHaveCount(3);
    await expect(
      nearby.getByRole("link", { name: /full area guide/ }),
    ).toHaveAttribute("href", "/area");
  });
});
