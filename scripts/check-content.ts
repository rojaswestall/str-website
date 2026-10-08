/*
 * Content check, run in CI before the build (`pnpm check:content`).
 *
 * Importing `@/content` parses every content module through zod, so an invalid
 * file throws here with a readable path before the build spends any time on it.
 * The structural invariants (unique slugs, at least one hero photo per
 * property) live in the schemas themselves; this script only has to import,
 * exercise the accessors, and print a short summary.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import {
  getAllProperties,
  getAreaPicks,
  getFaqs,
  getHosts,
  getLicenses,
  getPolicies,
  getProperty,
  getSite,
} from "@/content";

function fail(message: string): never {
  console.error(`check:content failed: ${message}`);
  process.exit(1);
}

const properties = getAllProperties();
const slugs = properties.map((p) => p.slug);

if (new Set(slugs).size !== slugs.length) {
  fail(`duplicate property slugs: ${slugs.join(", ")}`);
}

for (const property of properties) {
  if (!property.photos.some((photo) => photo.role === "hero")) {
    fail(`property "${property.slug}" has no hero photo`);
  }
  if (getProperty(property.slug) !== property) {
    fail(`getProperty("${property.slug}") did not return the seeded property`);
  }
}

if (getProperty("does-not-exist") !== undefined) {
  fail('getProperty("does-not-exist") should be undefined');
}

const site = getSite();
const hosts = getHosts();
const picks = getAreaPicks();

// Every image src must resolve to a file under public/ so next/image never 404s.
const publicDir = path.join(process.cwd(), "public");
const images = [
  ...properties.flatMap((p) => p.photos),
  ...hosts.flatMap((h) => (h.photo ? [h.photo] : [])),
  ...picks.flatMap((a) => (a.photo ? [a.photo] : [])),
  site.heroCollage,
];
for (const image of images) {
  if (!existsSync(path.join(publicDir, image.src))) {
    fail(`image ${image.src} is not in public/`);
  }
}
const policies = getPolicies();
const faqs = getFaqs();
const licenses = getLicenses();

if (licenses.length !== properties.length) {
  fail("every property should contribute exactly one STR license");
}

console.log(`check:content ok — ${site.name}`);
console.log(
  `  ${properties.length} properties: ${slugs.join(", ")} (${properties.reduce(
    (n, p) => n + p.photos.length,
    0,
  )} photos)`,
);
console.log(
  `  ${hosts.length} hosts, ${picks.length} area picks, ${policies.length} policy rows, ${faqs.length} FAQ rows, ${licenses.length} licenses`,
);
console.log(`  hospitable mode: ${site.hospitable.mode}`);
