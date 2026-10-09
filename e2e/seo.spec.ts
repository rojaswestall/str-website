import { expect, test } from "@playwright/test";

const SLUGS = ["oak-hill", "south-austin", "fire-side"] as const;
const NAMES: Record<(typeof SLUGS)[number], string> = {
  "oak-hill": "An Oak Hill Home",
  "south-austin": "South Austin Stay",
  "fire-side": "Fire Side Home",
};

/*
 * The test server runs without NEXT_PUBLIC_SITE_URL, so every absolute URL
 * must resolve to the Playwright baseURL (http://localhost:3000). On Vercel
 * the same code emits the real origin; see the step 11 notes in docs/plan.md.
 */
function origin(baseURL: string | undefined) {
  return new URL(baseURL ?? "http://localhost:3000").origin;
}

test.describe("seo", () => {
  test("/sitemap.xml lists the home page and the three stays on this origin", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");

    const body = await response.text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const site = origin(baseURL);
    expect(locs).toEqual([
      `${site}/`,
      ...SLUGS.map((slug) => `${site}/stays/${slug}`),
    ]);
    // lastModified is set once at build time, in ISO form.
    expect(body.match(/<lastmod>/g)).toHaveLength(4);
  });

  test("/robots.txt allows crawling, hides the dev and 404 routes, and names the sitemap", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Allow: \//);
    expect(body).toMatch(/Disallow: \/kitchen-sink/);
    expect(body).toMatch(/Disallow: \/api\//);
    expect(body).toMatch(/Disallow: \/_404\//);
    expect(body).toContain(`Sitemap: ${origin(baseURL)}/sitemap.xml`);
  });

  for (const path of ["/opengraph-image", "/stays/oak-hill/opengraph-image"]) {
    test(`${path} returns a PNG`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      const bytes = await response.body();
      // PNG signature.
      expect([...bytes.subarray(0, 8)]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(bytes.length).toBeGreaterThan(1000);
    });
  }

  for (const slug of SLUGS) {
    test(`/stays/${slug} carries one VacationRental JSON-LD block`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(`/stays/${slug}`);
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts).toHaveCount(1);

      const json = JSON.parse((await scripts.first().textContent()) ?? "null");
      expect(json["@context"]).toBe("https://schema.org");
      expect(json["@type"]).toBe("VacationRental");
      expect(json.name).toBe(NAMES[slug]);
      expect(json.url).toBe(`${origin(baseURL)}/stays/${slug}`);
      expect(json.aggregateRating).toMatchObject({
        "@type": "AggregateRating",
        bestRating: 5,
      });
      expect(typeof json.aggregateRating.ratingValue).toBe("number");
      expect(json.aggregateRating.reviewCount).toBeGreaterThan(0);
      // Only the city; the content has no street address and step 11 must not invent one.
      expect(json.address).toEqual({
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "TX",
        addressCountry: "US",
      });
      expect(json.containsPlace.occupancy.maxValue).toBeGreaterThan(0);
      expect(json.image.length).toBeGreaterThan(0);
      for (const src of json.image) {
        expect(src).toMatch(new RegExp(`^${origin(baseURL)}/photos/`));
      }
      // Contact details are still [TBC]; nothing placeholder-like may leak.
      expect(JSON.stringify(json)).not.toContain("[TBC]");
    });
  }

  test("the home page carries the Organization JSON-LD block", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/");
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(1);

    const json = JSON.parse((await scripts.first().textContent()) ?? "null");
    expect(json["@type"]).toBe("Organization");
    expect(json.name).toBe("The Austin Collection");
    expect(json.url).toBe(`${origin(baseURL)}/`);
    expect(json.logo).toMatch(new RegExp(`^${origin(baseURL)}/`));
    expect(JSON.stringify(json)).not.toContain("[TBC]");
  });

  for (const [path, title] of [
    ["/", "The Austin Collection"],
    ["/stays/fire-side", "Fire Side Home"],
  ] as const) {
    test(`${path} has a canonical link and Open Graph tags`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(path);
      const site = origin(baseURL);
      // Next normalizes the root canonical to the bare origin (no trailing slash).
      const canonicalPath = path === "/" ? "" : path;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${site}${canonicalPath}`,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        title,
      );
      await expect(
        page.locator('meta[property="og:site_name"]'),
      ).toHaveAttribute("content", "The Austin Collection");
      await expect(
        page.locator('meta[property="og:image"]').first(),
      ).toHaveAttribute(
        "content",
        new RegExp(`^${site}${canonicalPath}/opengraph-image`),
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(
        page.locator('meta[property="og:image:alt"]').first(),
      ).toHaveAttribute("content", /./);
      await expect(
        page.locator('link[rel="icon"][type="image/svg+xml"]'),
      ).toHaveAttribute("href", /icon/);
      await expect(
        page.locator('link[rel="apple-touch-icon"]'),
      ).toHaveAttribute("href", /apple-icon/);
    });
  }

  test("an unknown slug still returns 404 (the proxy survives the SEO routes)", async ({
    request,
  }) => {
    const response = await request.get("/stays/nope");
    expect(response.status()).toBe(404);
  });
});
