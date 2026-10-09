import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { propertySpecItems } from "@/components/property";
import { formatRating } from "@/components/ui";
import { getProperty, getPropertySlugs, getSite } from "@/content";
import { ogFonts } from "@/lib/og-font";

/*
 * Per-house Open Graph image: site name, house name, the ★ rating line, and
 * the location line, on paper. Placeholder artwork until the brand assets
 * open item is answered (docs/plan.md).
 *
 * Colours are literal hex on purpose. ImageResponse renders through Satori,
 * off the page, so it cannot read the CSS variables in app/globals.css. The
 * values are copied from the light theme there (paper, ink, ink-soft, muted,
 * hairline, paper-2); step 12's raw-hex grep must exempt this file and
 * app/opengraph-image.tsx.
 */
const PAPER = "#faf9f7";
const PAPER_2 = "#f2f0ec";
const INK = "#34312d";
const INK_SOFT = "#55524c";
const MUTED = "#6e6961";
const HAIRLINE = "#e5e2dc";

// Same params as the page, so the three images prerender beside the pages.
export function generateStaticParams() {
  return getPropertySlugs().map((slug) => ({ slug }));
}

// Inert today: the page's explicit `openGraph.images` entry carries the house
// name as alt. Kept because the file convention expects it for the fallback.
export const alt = "A house in The Austin Collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();

  const site = getSite();
  const reviews = `${property.reviewCount} ${property.reviewCount === 1 ? "review" : "reviews"}`;

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
          {property.locationLine}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
            maxWidth: 1040,
          }}
        >
          {property.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 32,
            color: INK_SOFT,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: INK,
            }}
          >
            {/* Newsreader has no ★ glyph and Satori would fetch one at build; draw it. */}
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill={INK}
                d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z"
              />
            </svg>
            <span>{formatRating(property.rating)}</span>
          </span>
          <span style={{ color: MUTED }}>·</span>
          <span>{reviews}</span>
          {property.guestFavorite ? (
            <>
              <span style={{ color: MUTED }}>·</span>
              <span
                style={{
                  border: `1px solid ${HAIRLINE}`,
                  background: PAPER_2,
                  padding: "4px 14px",
                  fontSize: 24,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: INK,
                }}
              >
                Guest favorite
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${HAIRLINE}`,
          paddingTop: 24,
          fontSize: 26,
          color: MUTED,
        }}
      >
        {/* Same wording as the page's spec strip; unconfirmed items are left out. */}
        <span>
          {propertySpecItems(property)
            .filter((item) => !item.tbc)
            .map((item) => item.label)
            .join(" · ")}
        </span>
      </div>
    </div>,
    { ...size, fonts: ogFonts },
  );
}
