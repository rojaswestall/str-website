import { expect, test, type Page } from "@playwright/test";

/*
 * Runs in the "chromium-live" project only: that build carries a dummy
 * NEXT_PUBLIC_MAPKIT_TOKEN, so CityMap renders the Apple map. MapKit JS is
 * never fetched; the route below answers for cdn.apple-mapkit.com with a
 * stand-in that implements the slice of the API lib/mapkit.ts types (Map,
 * MarkerAnnotation, colour schemes, the error event) and calls the script's
 * data-callback, as the real mapkit.core.js does once its libraries load.
 * Each marker becomes a button; clicking it asks the annotation's callout
 * delegate for its element and puts it on the page, so the site's own
 * callout card is what the tests read.
 */
const TOKEN = "e2e-mapkit-token";

function fakeMapKit({ rejectToken = false } = {}) {
  return `
  (() => {
    const script = document.currentScript;
    const listeners = [];
    const FeatureVisibility = { Hidden: "hidden", Visible: "visible", Adaptive: "adaptive" };
    class Coordinate { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } }
    class Simple { constructor(...args) { this.args = args; } }
    class MarkerAnnotation {
      constructor(coordinate, options = {}) {
        Object.assign(this, options);
        this.coordinate = coordinate;
        this.color = "";
        this.glyphColor = "";
      }
    }
    class FakeMap {
      constructor(element, options) {
        this.element = element;
        this.options = options;
        this.annotations = [];
        this.scheme = "light";
        element.dataset.fakeMap = "";
        window.__fakeMapKit.maps.push(this);
      }
      get colorScheme() { return this.scheme; }
      set colorScheme(value) { this.scheme = value; this.element.dataset.colorScheme = value; }
      addAnnotations(list) {
        for (const annotation of list) {
          this.annotations.push(annotation);
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.testid = "fake-marker";
          button.dataset.slug = annotation.data.slug;
          button.textContent = annotation.title;
          button.addEventListener("click", () => this.select(annotation));
          this.element.append(button);
        }
      }
      select(annotation) {
        this.element.querySelector("[data-fake-callout]")?.remove();
        const delegate = annotation.callout;
        const wrap = document.createElement("div");
        wrap.dataset.fakeCallout = "";
        wrap.dataset.animation = delegate.calloutShouldAnimateForAnnotation(annotation)
          ? delegate.calloutAppearanceAnimationForAnnotation(annotation)
          : "";
        wrap.append(delegate.calloutElementForAnnotation(annotation));
        this.element.append(wrap);
      }
      showItems(items) { this.element.dataset.shown = String(items.length); }
      destroy() { this.destroyed = true; this.element.replaceChildren(); }
    }
    FakeMap.ColorSchemes = { Light: "light", Dark: "dark" };
    window.__fakeMapKit = {
      maps: [],
      token: script.dataset.token,
      libraries: script.dataset.libraries,
    };
    window.mapkit = {
      Map: FakeMap,
      MarkerAnnotation,
      Coordinate,
      CoordinateSpan: Simple,
      Padding: Simple,
      CameraZoomRange: Simple,
      FeatureVisibility,
      addEventListener(type, listener) {
        listeners.push(listener);
        ${rejectToken ? 'setTimeout(() => listener({ status: "Unauthorized" }), 0);' : ""}
      },
      removeEventListener(type, listener) {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      },
    };
    queueMicrotask(() => window[script.dataset.callback]());
  })();
`;
}

async function interceptMapKit(
  page: Page,
  options?: { rejectToken?: boolean },
) {
  const loads: string[] = [];
  await page.route("**/cdn.apple-mapkit.com/**", async (route) => {
    loads.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: fakeMapKit(options),
    });
  });
  // The booking widgets are not under test here.
  await page.route("**/cdn.hsptb.com/**", (route) => route.abort());
  await page.route("**/hospitable.b-cdn.net/**", (route) => route.abort());
  return loads;
}

/** Marker colours from the latest map, keyed by slug. */
function markerColors(page: Page) {
  return page.evaluate(() => {
    const fake = (
      window as unknown as {
        __fakeMapKit: {
          maps: { annotations: { data: { slug: string }; color: string }[] }[];
        };
      }
    ).__fakeMapKit;
    const map = fake.maps.at(-1);
    return Object.fromEntries(
      (map?.annotations ?? []).map((a) => [a.data.slug, a.color]),
    );
  });
}

function cssToken(page: Page, name: string) {
  return page.evaluate(
    (token) =>
      getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    name,
  );
}

test.describe("city map on Apple Maps (MapKit token set)", () => {
  test("home: loads MapKit once with the token, one marker per house", async ({
    page,
  }) => {
    const loads = await interceptMapKit(page);
    await page.goto("/");

    const map = page.getByTestId("city-map");
    await expect(map).toHaveAttribute("data-map-provider", "apple");
    await expect(map).toHaveAttribute("data-map-status", "ready");

    const script = page.locator('script[src*="cdn.apple-mapkit.com"]');
    await expect(script).toHaveCount(1);
    await expect(script).toHaveAttribute("data-token", TOKEN);
    await expect(script).toHaveAttribute("data-libraries", "map,annotations");
    expect(loads).toHaveLength(1);

    const markers = map.getByTestId("fake-marker");
    await expect(markers).toHaveCount(3);
    for (const slug of ["oak-hill", "south-austin", "fire-side"]) {
      await expect(
        map.locator(`[data-testid="fake-marker"][data-slug="${slug}"]`),
      ).toHaveCount(1);
    }
    await expect(map.locator("[data-fake-map]")).toHaveAttribute(
      "data-shown",
      "3",
    );

    // Nothing highlighted on the home page: every marker is ink.
    const ink = await cssToken(page, "--ink");
    expect(Object.values(await markerColors(page))).toEqual([ink, ink, ink]);

    // The caption lists every house as a link, for keyboard and screen readers.
    const caption = map.locator("figcaption");
    for (const name of [
      "An Oak Hill Home",
      "South Austin Stay",
      "Fire Side Home",
    ]) {
      await expect(caption.getByRole("link", { name })).toBeVisible();
    }
  });

  test("a marker opens the site's callout, whose link navigates client-side", async ({
    page,
  }) => {
    const loads = await interceptMapKit(page);
    await page.goto("/");
    const map = page.getByTestId("city-map");
    await expect(map).toHaveAttribute("data-map-status", "ready");

    await map.getByRole("button", { name: "Fire Side Home" }).click();
    const callout = map.getByTestId("map-callout");
    await expect(callout).toHaveCount(1);
    await expect(callout).toHaveAttribute("data-slug", "fire-side");
    await expect(callout).toContainText("South Austin");
    await expect(callout).toContainText("Fire Side Home");
    await expect(callout).toContainText("Sleeps 8 · 3 bed · 5 beds · 2.5 bath");
    await expect(callout).toContainText(/\d\.\d+ ★ · \d+ reviews/);
    await expect(map.locator("[data-fake-callout]")).toHaveAttribute(
      "data-animation",
      /map-callout-in/,
    );

    const link = callout.getByRole("link", { name: "See the house →" });
    await expect(link).toHaveAttribute("href", "/stays/fire-side");
    await link.click();
    await expect(page).toHaveURL(/\/stays\/fire-side$/);

    // Same document: MapKit is not loaded a second time, the map remounts.
    expect(loads).toHaveLength(1);
    // The house page's map is the one with a highlighted house (the home
    // page's can linger in the DOM for a moment during the transition).
    const houseMap = page.getByTestId("city-map").filter({
      has: page.locator('[data-map-pin="fire-side"][data-highlighted]'),
    });
    await expect(houseMap).toHaveAttribute("data-map-status", "ready");
    await expect(houseMap.getByTestId("fake-marker")).toHaveCount(3);
  });

  test("house page: that house in ink, the others muted, no link to itself", async ({
    page,
  }) => {
    await interceptMapKit(page);
    await page.goto("/stays/south-austin");
    const map = page.getByTestId("city-map");
    await expect(map).toHaveAttribute("data-map-status", "ready");

    const ink = await cssToken(page, "--ink");
    const muted = await cssToken(page, "--muted");
    await expect
      .poll(() => markerColors(page))
      .toEqual({ "oak-hill": muted, "south-austin": ink, "fire-side": muted });

    await expect(
      map.locator("[data-map-pin][data-highlighted]"),
    ).toHaveAttribute("data-map-pin", "south-austin");

    await map.getByRole("button", { name: "South Austin Stay" }).click();
    const callout = map.getByTestId("map-callout");
    await expect(callout).toContainText("You're looking at this one");
    await expect(callout.getByRole("link")).toHaveCount(0);
  });

  test("follows the theme and respects reduced motion", async ({ page }) => {
    await interceptMapKit(page);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    const map = page.getByTestId("city-map");
    await expect(map).toHaveAttribute("data-map-status", "ready");
    await expect(map.locator("[data-fake-map]")).toHaveAttribute(
      "data-color-scheme",
      "dark",
    );
    const darkInk = await cssToken(page, "--ink");
    await expect
      .poll(async () => Object.values(await markerColors(page))[0])
      .toBe(darkInk);

    await map.getByRole("button", { name: "Oak Hill" }).click();
    await expect(map.locator("[data-fake-callout]")).toHaveAttribute(
      "data-animation",
      "",
    );
  });

  test("falls back to the drawn map when Apple rejects the token", async ({
    page,
  }) => {
    await interceptMapKit(page, { rejectToken: true });
    await page.goto("/");
    const map = page.getByTestId("city-map");
    await expect(map).toHaveAttribute("data-map-provider", "sketch");
    await expect(map.locator("svg [data-map-pin]")).toHaveCount(3);
  });

  test("falls back to the drawn map when MapKit cannot load", async ({
    page,
  }) => {
    await page.route("**/cdn.apple-mapkit.com/**", (route) => route.abort());
    await page.route("**/cdn.hsptb.com/**", (route) => route.abort());
    await page.route("**/hospitable.b-cdn.net/**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByTestId("city-map")).toHaveAttribute(
      "data-map-provider",
      "sketch",
    );
  });
});
