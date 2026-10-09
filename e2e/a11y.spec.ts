import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * axe-core on the three page shapes (home, a stay, the 404) in both themes.
 * Theme is set the way e2e/theme.spec.ts does for a first visit: emulate the
 * OS colour scheme and let next-themes resolve `system` to it, then assert
 * html[data-theme] before auditing so a failure is never a race.
 *
 * Only `serious` and `critical` violations fail. `moderate` and `minor`
 * findings are printed and attached to the report so they stay visible
 * without blocking CI. No rule is disabled.
 */

const ROUTES = [
  { name: "home", path: "/" },
  { name: "stay", path: "/stays/oak-hill" },
  { name: "not-found", path: "/does-not-exist" },
] as const;

const THEMES = ["light", "dark"] as const;

const FAIL_ON = new Set(["serious", "critical"]);

type Violation = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number];

function describe(violation: Violation) {
  const nodes = violation.nodes
    .map(
      (node) =>
        `      ${node.target.join(" ")}\n        ${node.failureSummary?.split("\n").join("\n        ")}`,
    )
    .join("\n");
  return `  [${violation.impact}] ${violation.id}: ${violation.help} (${violation.helpUrl})\n${nodes}`;
}

async function prepare(
  page: Page,
  theme: (typeof THEMES)[number],
  path: string,
) {
  // Never audit TikTok's player: block it so the styled fallback is what loads.
  await page.route(/tiktok(cdn-us)?\.com/, (route) => route.abort());
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  // The theme toggle renders its label after mount; wait so axe sees the final DOM.
  await expect(page.locator("[data-theme-toggle]")).toHaveAttribute(
    "data-mode",
    "system",
  );
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`${route.name} (${route.path}) has no serious or critical axe violations in ${theme}`, async ({
      page,
    }, testInfo) => {
      await prepare(page, theme, route.path);

      const results = await new AxeBuilder({ page }).analyze();

      const blocking = results.violations.filter((v) =>
        FAIL_ON.has(v.impact ?? ""),
      );
      const advisory = results.violations.filter(
        (v) => !FAIL_ON.has(v.impact ?? ""),
      );

      if (advisory.length > 0) {
        const report = advisory.map(describe).join("\n");
        console.log(
          `axe advisory findings on ${route.path} (${theme}), not failing:\n${report}`,
        );
        await testInfo.attach(`axe-advisory-${route.name}-${theme}`, {
          body: report,
          contentType: "text/plain",
        });
      } else {
        console.log(`axe: no advisory findings on ${route.path} (${theme})`);
      }

      expect(
        blocking,
        `serious/critical axe violations on ${route.path} (${theme}):\n${blocking.map(describe).join("\n")}`,
      ).toEqual([]);
    });
  }
}
