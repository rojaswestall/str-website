import { ImageResponse } from "next/og";
import { getAllProperties, getSite } from "@/content";
import { loadOgFonts } from "@/lib/og-font";
import { siteDescription } from "@/lib/seo";

/*
 * Default Open Graph image: the site name, the tagline, the house count, and
 * the site description, on paper. Placeholder artwork until the brand assets
 * open item is answered (docs/plan.md); swap the layout here, the route and
 * the metadata that points at it stay.
 *
 * Colours are literal hex on purpose. ImageResponse renders through Satori,
 * off the page, so it cannot read the CSS variables in app/globals.css. The
 * values are copied from the light theme there (paper, ink, muted, hairline,
 * accent); step 12's raw-hex grep must exempt this file and
 * app/stays/[slug]/opengraph-image.tsx.
 */
const PAPER = "#faf9f7";
const INK = "#34312d";
const MUTED = "#6e6961";
const HAIRLINE = "#e5e2dc";
const ACCENT = "#8e887f";

export const alt = "The Austin Collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const site = getSite();
  const houses = getAllProperties().length;
  const fonts = await loadOgFonts();

  // The hero sets the tagline's last word in italics; the card does the same.
  const words = site.tagline.split(" ");
  const last = words.pop() ?? "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: PAPER,
        color: INK,
        fontFamily: "Newsreader, serif",
        fontWeight: 300,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingBottom: 24,
          fontSize: 30,
          letterSpacing: "0.02em",
        }}
      >
        <span>{site.name}</span>
        <span style={{ color: MUTED, fontSize: 26 }}>
          {houses} houses · Austin, Texas
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          fontSize: 96,
          lineHeight: 1.04,
          letterSpacing: "-0.015em",
          maxWidth: 1000,
        }}
      >
        <span>{words.join(" ")}</span>
        <span style={{ fontStyle: "italic", marginLeft: 22 }}>{last}</span>
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${HAIRLINE}`,
          paddingTop: 24,
          fontSize: 26,
          lineHeight: 1.3,
          color: ACCENT,
          maxWidth: 900,
        }}
      >
        <span>{siteDescription}</span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
