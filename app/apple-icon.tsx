import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-font";

/*
 * Placeholder apple-touch-icon: the "AC" monogram in ink on paper, matching
 * app/icon.svg. Replace both when the brand assets open item is answered.
 *
 * Literal hex (paper, ink from app/globals.css) because ImageResponse cannot
 * read CSS variables; step 12's raw-hex grep must exempt this file.
 */
const PAPER = "#faf9f7";
const INK = "#34312d";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fonts = await loadOgFonts();
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
        fontSize: 104,
        letterSpacing: "-0.04em",
      }}
    >
      AC
    </div>,
    { ...size, fonts },
  );
}
