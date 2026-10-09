import { cacheLife } from "next/cache";

/*
 * Newsreader for the ImageResponse routes (OG images, apple icon).
 *
 * `next/font` self-hosts Newsreader for the pages but does not expose the
 * font file, and Satori (which renders ImageResponse) needs raw TTF/OTF/WOFF
 * data. So the font is fetched at build time: the Google Fonts CSS API, asked
 * by a non-browser user agent, answers with a single `@font-face` whose `src`
 * is a static TTF instance at the requested weight; that file is fetched and
 * the bytes returned.
 *
 * The loader is a `"use cache"` function with the `max` lifetime, which is
 * how Cache Components let a route do network I/O during `next build` and
 * still prerender as static: the fetch runs once inside the cache scope, its
 * result is part of the build output, and the routes that await it stay `○`.
 * A plain module-scope fetch does not work here; Next's patched `fetch`
 * rejects it as soon as whichever prerender evaluated the module finishes.
 *
 * If the build environment is offline the routes still build: the loader
 * resolves to an empty list, ImageResponse falls back to its bundled default
 * sans-serif, and a warning names the failure in the build log.
 */

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 300;
  style: "normal" | "italic";
};

const FAMILY = "Newsreader";
const CSS_API = "https://fonts.googleapis.com/css2";

async function fetchFace(style: OgFont["style"]): Promise<OgFont> {
  const ital = style === "italic" ? 1 : 0;
  const css = await fetch(
    `${CSS_API}?family=${FAMILY}:ital,wght@${ital},300&display=swap`,
    // A plain user agent makes the API serve one TTF instead of woff2 ranges.
    { headers: { "user-agent": "node" } },
  );
  if (!css.ok) throw new Error(`CSS API responded ${css.status}`);
  const match = /src:\s*url\(([^)]+)\)\s*format\('truetype'\)/.exec(
    await css.text(),
  );
  if (!match?.[1]) throw new Error("no truetype src in the CSS response");
  const file = await fetch(match[1]);
  if (!file.ok) throw new Error(`font file responded ${file.status}`);
  return { name: FAMILY, data: await file.arrayBuffer(), weight: 300, style };
}

/** Newsreader 300 (normal and italic) for `ImageResponse`'s `fonts` option, or `[]` offline. */
export async function loadOgFonts(): Promise<OgFont[]> {
  "use cache";
  cacheLife("max");
  try {
    return await Promise.all([fetchFace("normal"), fetchFace("italic")]);
  } catch (error) {
    console.warn(
      `[og-font] Could not fetch ${FAMILY} at build time; the OG images and apple icon use ImageResponse's default font instead. (${String(error)})`,
    );
    return [];
  }
}
