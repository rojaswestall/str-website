/*
 * Canonical origin for absolute URLs: metadataBase in app/layout.tsx and
 * every canonical link, sitemap entry, OG image, and JSON-LD URL built by
 * lib/seo.ts. Comes from NEXT_PUBLIC_SITE_URL, set per environment on
 * Vercel; falls back to localhost so local and CI builds work.
 */
const FALLBACK = "http://localhost:3000";

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return new URL(FALLBACK);
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return new URL(FALLBACK);
  }
}
