import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Newsreader for the ImageResponse routes (OG images, apple icon, PNG icon).
 *
 * `next/font` self-hosts Newsreader for the pages but does not expose the
 * font file, and Satori (which renders ImageResponse) needs raw TTF/OTF/WOFF
 * data. The two static instances Google Fonts serves for weight 300 (normal
 * and italic) are vendored under `assets/fonts/` with their OFL licence and
 * read from disk once at module scope, the pattern Next's opengraph-image
 * docs use for local assets. A missing file fails `next build` loudly.
 *
 * Why not fetch at build time: under Cache Components a module-scope `fetch`
 * is rejected as soon as the prerender that evaluated the module finishes,
 * and a `"use cache"` loader with the `max` lifetime re-runs the fetch at
 * request time after its 30-day revalidate, so a network blip on Vercel
 * would quietly regenerate the share cards in the wrong face. Files on disk
 * have neither problem.
 */

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 300;
  style: "normal" | "italic";
};

const FAMILY = "Newsreader";
const DIR = join(process.cwd(), "assets", "fonts");

async function readFace(file: string, style: OgFont["style"]): Promise<OgFont> {
  const bytes = await readFile(join(DIR, file));
  return {
    name: FAMILY,
    data: Uint8Array.from(bytes).buffer,
    weight: 300,
    style,
  };
}

/** Newsreader 300, normal and italic, for `ImageResponse`'s `fonts` option. */
export const ogFonts: OgFont[] = await Promise.all([
  readFace("Newsreader-300-Regular.ttf", "normal"),
  readFace("Newsreader-300-Italic.ttf", "italic"),
]);
