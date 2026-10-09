import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-font";

/*
 * Placeholder "AC" monogram, ink on paper, rendered by `app/apple-icon.tsx`
 * (180px) and `app/icon1.tsx` (32px PNG for browsers that ignore the SVG
 * icon). It matches `app/icon.svg`; replace all three when the brand assets
 * open item (docs/plan.md) is answered.
 *
 * Literal hex (paper, ink from app/globals.css) because ImageResponse cannot
 * read CSS variables; step 12's raw-hex grep must exempt this file.
 */
const PAPER = "#faf9f7";
const INK = "#34312d";

export function monogramIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: PAPER,
        color: INK,
        fontFamily: "Newsreader, serif",
        fontWeight: 300,
        fontSize: Math.round(size * 0.58),
        letterSpacing: "-0.04em",
      }}
    >
      AC
    </div>,
    { width: size, height: size, fonts: ogFonts },
  );
}
