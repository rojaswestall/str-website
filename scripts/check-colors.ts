/*
 * Raw-colour check, run by `pnpm check:colors` (step 13 adds it to CI).
 *
 * Components must use the token utilities mapped in app/globals.css
 * (bg-paper, text-ink, border-hairline, fill-map-water, ...) so that every
 * surface follows the theme switch. This script fails when a hex literal,
 * `rgb(` / `hsl(` / `oklch(` call, or a bare `white` / `black` appears in
 * `components/` or `app/`, except in the files below, which cannot read CSS
 * variables and carry a comment saying so (see the step 11 notes in
 * docs/plan.md). If a token value changes, those files are updated by hand.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["components", "app"];
const EXTENSIONS = new Set([".tsx", ".ts", ".svg", ".css"]);

/** Allowed to carry raw colour values. Paths are repo-relative, POSIX separators. */
const EXEMPT = new Set([
  // The token blocks themselves.
  "app/globals.css",
  // ImageResponse renders off the page and cannot read CSS variables.
  "app/opengraph-image.tsx",
  "app/stays/[slug]/opengraph-image.tsx",
  "components/seo/MonogramIcon.tsx",
  // Standalone SVG file served as-is; no stylesheet applies to it.
  "app/icon.svg",
]);

/*
 * Same pattern as the manual grep from the step 12 prompt, plus hsl/oklch.
 * `-` is a word boundary on purpose so `bg-white` and `text-black` (Tailwind's
 * raw colours) are caught; the one CSS property that would collide,
 * `white-space`, is excluded explicitly.
 */
const RAW_COLOR =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\bwhite\b(?!-space)|\bblack\b/;

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOTS.flatMap((root) => walk(root, []));
const offenders: string[] = [];
let exemptSeen = 0;

for (const file of files) {
  const rel = file.split(path.sep).join("/");
  if (EXEMPT.has(rel)) {
    exemptSeen += 1;
    continue;
  }
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    const match = RAW_COLOR.exec(line);
    if (match) {
      offenders.push(`${rel}:${index + 1}: ${line.trim()}`);
    }
  });
}

const missingExempt = [...EXEMPT].filter(
  (rel) => !files.some((file) => file.split(path.sep).join("/") === rel),
);
if (missingExempt.length > 0) {
  console.error(
    `check:colors: exempt file(s) no longer exist, update scripts/check-colors.ts:\n  ${missingExempt.join("\n  ")}`,
  );
  process.exit(1);
}

if (offenders.length > 0) {
  console.error(
    `check:colors failed: raw colour value(s) outside app/globals.css. Use a token utility instead.\n  ${offenders.join("\n  ")}`,
  );
  process.exit(1);
}

console.log(
  `check:colors: ${files.length} files clean (${exemptSeen} exempt: ${[...EXEMPT].join(", ")})`,
);
